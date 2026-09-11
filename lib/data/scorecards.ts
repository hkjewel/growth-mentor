import "server-only";
import type { ScorecardWithEntries, WeeklyScorecard } from "@/types";
import { isValidIsoDate, mondayOf } from "@/lib/dates";
import { check, db, DataError } from "./db";
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

/** Newest first. */
export async function listScorecards(limit = 100): Promise<WeeklyScorecard[]> {
  const supabase = await db();
  const data = check(
    await supabase
      .from("weekly_scorecards")
      .select("*")
      .order("week_start_date", { ascending: false })
      .limit(limit),
    "load scorecards",
  );
  return ((data ?? []) as WeeklyScorecard[]).map(normalize);
}

/** Newest first, each with its entries + goals. */
export async function listScorecardsWithEntries(limit = 100): Promise<ScorecardWithEntries[]> {
  const cards = await listScorecards(limit);
  const entries = await listEntries(cards.map((c) => c.id));
  return cards.map((c) => ({ ...c, entries: entries.filter((e) => e.scorecard_id === c.id) }));
}

export async function getScorecard(id: string): Promise<ScorecardWithEntries | null> {
  const supabase = await db();
  const data = check(
    await supabase.from("weekly_scorecards").select("*").eq("id", id).maybeSingle(),
    "load scorecard",
  );
  if (!data) return null;
  const entries = await listEntries([id]);
  return { ...normalize(data as WeeklyScorecard), entries };
}

export async function getScorecardByWeek(weekStart: string): Promise<ScorecardWithEntries | null> {
  const supabase = await db();
  const data = check(
    await supabase
      .from("weekly_scorecards")
      .select("*")
      .eq("week_start_date", weekStart)
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
export async function getPreviousScoredScorecard(weekStart: string): Promise<WeeklyScorecard | null> {
  const supabase = await db();
  const data = check(
    await supabase
      .from("weekly_scorecards")
      .select("*")
      .lt("week_start_date", weekStart)
      .not("overall_score", "is", null)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "load previous scorecard",
  );
  return data ? normalize(data as WeeklyScorecard) : null;
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
    .insert({ week_start_date: weekStart })
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
  const card = await getScorecard(scorecardId);
  if (!card) throw new DataError("Scorecard not found.");
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
    await supabase.from("weekly_scorecards").update({ overall_score: score }).eq("id", scorecardId),
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
  const supabase = await db();
  await updateEntries(scorecardId, updates);
  check(
    await supabase
      .from("weekly_scorecards")
      .update({ notes: notes?.trim() || null })
      .eq("id", scorecardId),
    "save reflection",
  );
  await logAudit("scorecard.rated", "weekly_scorecards", scorecardId, {
    ratings: updates.map((u) => ({ entry: u.id, rating: u.progress_rating })),
  });
  return computeWeeklyScore(scorecardId);
}

/** Remove one goal from a week's scorecard; re-score if the week was already saved. */
export async function removeEntry(scorecardId: string, entryId: string): Promise<void> {
  const card = await getScorecard(scorecardId);
  if (!card) throw new DataError("Scorecard not found.");
  await deleteEntry(scorecardId, entryId);
  await logAudit("scorecard.entry_removed", "scorecard_entries", entryId, { scorecard_id: scorecardId });
  if (card.overall_score != null) await computeWeeklyScore(scorecardId);
}

export async function deleteScorecard(id: string): Promise<void> {
  const supabase = await db();
  check(await supabase.from("weekly_scorecards").delete().eq("id", id), "delete scorecard");
  await logAudit("scorecard.deleted", "weekly_scorecards", id);
}
