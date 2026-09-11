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
  removeEntry,
  saveScorecard,
  startScorecard,
} from "@/lib/data/scorecards";
import { validateRating } from "@/lib/data/entries";
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

export async function deleteScorecardAction(id: string): Promise<ActionResult> {
  try {
    await deleteScorecard(id);
    refresh();
  } catch (e) {
    return fail(e);
  }
  redirect("/history");
}
