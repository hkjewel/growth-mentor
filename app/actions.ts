"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import { DataError } from "@/lib/data/db";
import { createVision, deleteVision, updateVision } from "@/lib/data/visions";
import { createGoal, deleteGoal, setGoalActive, updateGoal } from "@/lib/data/goals";
import {
  addMissingEntries,
  deleteScorecard,
  getPreviousScoredScorecard,
  getScorecard,
  removeEntry,
  reviewSummary,
  saveScorecard,
  startScorecard,
  storeSummaryDraft,
} from "@/lib/data/scorecards";
import { validateRating } from "@/lib/data/entries";
import { listVisions } from "@/lib/data/visions";
import { draftWeeklySummary } from "@/lib/ai/summaries";
import { acceptInvite, createInvite, endMentorship, revokeInvite } from "@/lib/data/team";
import { currentWeek } from "@/lib/week";

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

function fail(e: unknown): ActionResult {
  if (e instanceof DataError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: "Could not save — please try again." };
}

function refresh() {
  revalidatePath("/", "layout");
}

// ── Visions ────────────────────────────────────────────────────────────────

export async function saveVisionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const id = str(form, "id");
    const input = {
      title: str(form, "title"),
      description: str(form, "description"),
      horizon_years: Number(str(form, "horizon_years") || 10),
    };
    if (id) await updateVision(id, input);
    else await createVision(input);
    refresh();
    return { ok: true, message: id ? "Vision updated." : "Vision created." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteVisionAction(id: string): Promise<ActionResult> {
  try {
    await deleteVision(id);
    refresh();
    return { ok: true, message: "Vision deleted." };
  } catch (e) {
    return fail(e);
  }
}

// ── Goals ──────────────────────────────────────────────────────────────────

export async function saveGoalAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const id = str(form, "id");
    const input = {
      title: str(form, "title"),
      vision_id: str(form, "vision_id") || null,
      category: str(form, "category"),
      timeframe: str(form, "timeframe"),
      target_metric: str(form, "target_metric"),
    };
    if (id) await updateGoal(id, input);
    else await createGoal(input);
    refresh();
    return { ok: true, message: id ? "Goal updated." : "Goal added." };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleGoalAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await setGoalActive(id, isActive);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteGoalAction(id: string, backToList = false): Promise<ActionResult> {
  try {
    await deleteGoal(id);
    refresh();
  } catch (e) {
    return fail(e);
  }
  if (backToList) redirect("/goals");
  return { ok: true, message: "Goal deleted." };
}

// ── Scorecards ─────────────────────────────────────────────────────────────

export async function startScorecardAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let id: string;
  try {
    const week = str(form, "week") || (await currentWeek()).weekStart;
    const card = await startScorecard(week);
    id = card.id;
    refresh();
  } catch (e) {
    return fail(e);
  }
  redirect(`/scorecard/${id}`);
}

export async function saveScorecardAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const scorecardId = str(form, "scorecard_id");
    const entryIds = form.getAll("entry_id").map(String);
    const updates = entryIds.map((entryId) => {
      const raw = str(form, `rating_${entryId}`);
      if (!raw) throw new DataError("Rating must be 1–10.");
      return {
        id: entryId,
        progress_rating: validateRating(raw),
        note: str(form, `note_${entryId}`),
      };
    });
    const score = await saveScorecard(scorecardId, updates, str(form, "notes"));
    refresh();
    return { ok: true, message: score == null ? "Saved." : `Saved — overall score ${score.toFixed(1)}` };
  } catch (e) {
    return fail(e);
  }
}

export async function addMissingEntriesAction(scorecardId: string): Promise<ActionResult> {
  try {
    const n = await addMissingEntries(scorecardId);
    refresh();
    return { ok: true, message: n ? `Added ${n} goal${n === 1 ? "" : "s"}.` : "All active goals are already included." };
  } catch (e) {
    return fail(e);
  }
}

export async function removeEntryAction(scorecardId: string, entryId: string): Promise<ActionResult> {
  try {
    await removeEntry(scorecardId, entryId);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── AI weekly summary (draft → user review) ─────────────────────────────────

export async function draftSummaryAction(scorecardId: string): Promise<ActionResult> {
  try {
    const card = await getScorecard(scorecardId);
    if (!card) throw new DataError("Scorecard not found.");
    if (card.overall_score == null) throw new DataError("Save your ratings first, then draft a summary.");
    const [previous, visions] = await Promise.all([
      getPreviousScoredScorecard(card.week_start_date),
      listVisions(),
    ]);
    const draft = await draftWeeklySummary({ card, previous, visions });
    await storeSummaryDraft(scorecardId, draft);
    refresh();
    return { ok: true, message: "Draft ready — review it below." };
  } catch (e) {
    return fail(e);
  }
}

export async function reviewSummaryAction(
  scorecardId: string,
  status: "approved" | "rejected",
  editedText?: string,
): Promise<ActionResult> {
  try {
    await reviewSummary(scorecardId, status, editedText);
    refresh();
    return { ok: true, message: status === "approved" ? "Summary approved." : "Summary rejected." };
  } catch (e) {
    return fail(e);
  }
}

// ── Team (mentor ↔ student) ─────────────────────────────────────────────────

export async function createInviteAction(): Promise<ActionResult> {
  try {
    const invite = await createInvite();
    refresh();
    return { ok: true, message: `New invite code: ${invite.code}` };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeInviteAction(id: string): Promise<ActionResult> {
  try {
    await revokeInvite(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acceptInviteAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const m = await acceptInvite(str(form, "code"));
    refresh();
    return { ok: true, message: `You joined ${m.mentor_email ?? "your mentor"}'s team.` };
  } catch (e) {
    return fail(e);
  }
}

export async function endMentorshipAction(id: string): Promise<ActionResult> {
  try {
    await endMentorship(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteScorecardAction(id: string): Promise<ActionResult> {
  try {
    await deleteScorecard(id);
    refresh();
  } catch (e) {
    return fail(e);
  }
  redirect("/history");
}
