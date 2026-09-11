import "server-only";
import type { ReviewStatus, ScorecardWithEntries, WeeklyScorecard } from "@/types";
import { isValidIsoDate, mondayOf } from "@/lib/dates";
import { check, db, DataError, ownerId, scoped } from "./db";
import { logAudit } from "./audit";
import { listGoals } from "./goals";
import { createEntriesForGoals, deleteEntry, listEntries, updateEntries, type EntryUpdate } from "./entries";

function normalize(s: WeeklyScorecard): WeeklyScorecard {
  return {
    ...s,
    overall_score: s.overall_score == null ? null : Number(s.overall_score),
    ai_summary_confidence: s.ai_summary_confidence == null ? null : Number(s.ai_summary_confidence),
  };
}

export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.round(avg * 10) / 10;
}

/** Newest first. Pass `forUser` to read another user's (mentor view; RLS decides access). */
export async function listScorecards(limit = 100, forUser?: string): Promise<WeeklyScorecard[]> {
  const supabase = await db();
  const owner = forUser ?? (await ownerId());
  const data = check(
    await scoped(supabase.from("weekly_scorecards").select("*"), owner)
      .order("week_start_date", { ascending: false })
      .limit(limit),
    "load scorecards",
  );
  return ((data ?? []) as WeeklyScorecard[]).map(normalize);
}

/** Newest first, each with its entries + goals. */
export async function listScorecardsWithEntries(limit = 100, forUser?: string): Promise<ScorecardWithEntries[]> {
  const cards = await listScorecards(limit, forUser);
  const entries = await listEntries(cards.map((c) => c.id));
  return cards.map((c) => ({ ...c, entries: entries.filter((e) => e.scorecard_id === c.id) }));
}

export async function getScorecard(id: string): Promise<ScorecardWithEntries | null> {
  const supabase = await db();
  const data = check(
    await scoped(supabase.from("weekly_scorecards").select("*").eq("id", id), await ownerId()).maybeSingle(),
    "load scorecard",
  );
  if (!data) return null;
  const entries = await listEntries([id]);
  return { ...normalize(data as WeeklyScorecard), entries };
}

async function requireScorecard(id: string): Promise<ScorecardWithEntries> {
  const card = await getScorecard(id);
  if (!card) throw new DataError("Scorecard not found.");
  return card;
}

export async function getScorecardByWeek(weekStart: string): Promise<ScorecardWithEntries | null> {
  const supabase = await db();
  const data = check(
    await scoped(supabase.from("weekly_scorecards").select("*").eq("week_start_date", weekStart), await ownerId())
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    "load scorecard",
  );
  if (!data) return null;
  const entries = await listEntries([data.id]);
  return { ...normalize(data as WeeklyScorecard), entries };
}

/** The most recent scored scorecard before the given week (for trend deltas). */
export async function getPreviousScoredScorecard(weekStart: string): Promise<ScorecardWithEntries | null> {
  const supabase = await db();
  const data = check(
    await scoped(supabase.from("weekly_scorecards").select("*"), await ownerId())
      .lt("week_start_date", weekStart)
      .not("overall_score", "is", null)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "load previous scorecard",
  );
  if (!data) return null;
  const entries = await listEntries([data.id]);
  return { ...normalize(data as WeeklyScorecard), entries };
}

/**
 * "Start this week": creates the week's scorecard plus one entry per active goal.
 * One scorecard per week — duplicates are rejected.
 */
export async function startScorecard(date: string): Promise<WeeklyScorecard> {
  if (!isValidIsoDate(date)) throw new DataError("Invalid week.");
  const weekStart = mondayOf(date);

  const existing = await getScorecardByWeek(weekStart);
  if (existing) throw new DataError("A scorecard already exists for this week.");

  const goals = await listGoals({ activeOnly: true });
  if (goals.length === 0) throw new DataError("Add goals first to generate a scorecard.");

  const supabase = await db();
  const { data, error } = await supabase
    .from("weekly_scorecards")
    .insert({ week_start_date: weekStart, user_id: await ownerId() })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new DataError("A scorecard already exists for this week.");
    check({ data, error }, "start scorecard");
  }
  const card = normalize(data as WeeklyScorecard);
  await createEntriesForGoals(card.id, goals);
  await logAudit("scorecard.created", "weekly_scorecards", card.id, {
    week_start_date: weekStart,
    entries: goals.length,
  });
  return card;
}

/** Adds entries for active goals created after the scorecard was started. */
export async function addMissingEntries(scorecardId: string): Promise<number> {
  const card = await requireScorecard(scorecardId);
  const have = new Set(card.entries.map((e) => e.goal_id));
  const missing = (await listGoals({ activeOnly: true })).filter((g) => !have.has(g.id));
  await createEntriesForGoals(scorecardId, missing);
  if (missing.length) await logAudit("scorecard.entries_added", "weekly_scorecards", scorecardId, { count: missing.length });
  return missing.length;
}

/** Named tool: compute_weekly_score — calculates + persists overall_score. */
export async function computeWeeklyScore(scorecardId: string): Promise<number | null> {
  const entries = await listEntries([scorecardId]);
  const score = averageRating(entries.map((e) => e.progress_rating));
  const supabase = await db();
  check(
    await scoped(supabase.from("weekly_scorecards").update({ overall_score: score }).eq("id", scorecardId), await ownerId()),
    "save overall score",
  );
  await logAudit("scorecard.scored", "weekly_scorecards", scorecardId, { overall_score: score }, "system");
  return score;
}

/** Save all ratings + notes for a week, then recompute the overall score. */
export async function saveScorecard(
  scorecardId: string,
  updates: EntryUpdate[],
  notes: string | null,
): Promise<number | null> {
  const card = await requireScorecard(scorecardId);
  const valid = new Set(card.entries.map((e) => e.id));
  if (updates.some((u) => !valid.has(u.id))) throw new DataError("This scorecard changed — refresh and try again.");
  const supabase = await db();
  await updateEntries(scorecardId, updates);
  check(
    await scoped(
      supabase.from("weekly_scorecards").update({ notes: notes?.trim() || null }).eq("id", scorecardId),
      await ownerId(),
    ),
    "save reflection",
  );
  await logAudit("scorecard.rated", "weekly_scorecards", scorecardId, {
    ratings: updates.map((u) => ({ entry: u.id, rating: u.progress_rating })),
  });
  return computeWeeklyScore(scorecardId);
}

/** Remove one goal from a week's scorecard; re-score if the week was already saved. */
export async function removeEntry(scorecardId: string, entryId: string): Promise<void> {
  const card = await requireScorecard(scorecardId);
  await deleteEntry(scorecardId, entryId);
  await logAudit("scorecard.entry_removed", "scorecard_entries", entryId, { scorecard_id: scorecardId });
  if (card.overall_score != null) await computeWeeklyScore(scorecardId);
}

export async function deleteScorecard(id: string): Promise<void> {
  const supabase = await db();
  check(await scoped(supabase.from("weekly_scorecards").delete().eq("id", id), await ownerId()), "delete scorecard");
  await logAudit("scorecard.deleted", "weekly_scorecards", id);
}

// ── AI summary (medium risk: always a draft the user reviews) ─────────────

export async function storeSummaryDraft(
  scorecardId: string,
  draft: { text: string; source: string; confidence: number },
): Promise<void> {
  await requireScorecard(scorecardId);
  const supabase = await db();
  check(
    await scoped(
      supabase
        .from("weekly_scorecards")
        .update({
          ai_summary: draft.text,
          ai_summary_source: draft.source,
          ai_summary_confidence: draft.confidence,
          ai_summary_review_status: "unreviewed",
        })
        .eq("id", scorecardId),
      await ownerId(),
    ),
    "save summary draft",
  );
  await logAudit("scorecard.summary_drafted", "weekly_scorecards", scorecardId, {
    source: draft.source,
    confidence: draft.confidence,
  }, "system");
}

export async function reviewSummary(scorecardId: string, status: Exclude<ReviewStatus, "unreviewed">, editedText?: string) {
  const card = await requireScorecard(scorecardId);
  if (!card.ai_summary) throw new DataError("There is no summary draft to review.");
  const text = editedText?.trim();
  if (status === "approved" && editedText !== undefined && !text) throw new DataError("The summary can't be empty.");
  const supabase = await db();
  check(
    await scoped(
      supabase
        .from("weekly_scorecards")
        .update({
          ai_summary_review_status: status,
          ...(status === "approved" && text ? { ai_summary: text } : {}),
        })
        .eq("id", scorecardId),
      await ownerId(),
    ),
    "save review",
  );
  await logAudit(`scorecard.summary_${status}`, "weekly_scorecards", scorecardId, {
    edited: status === "approved" && !!text && text !== card.ai_summary,
  });
}
