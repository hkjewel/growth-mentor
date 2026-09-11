import "server-only";
import type { EntryWithGoal, Goal } from "@/types";
import { check, db, DataError } from "./db";

export type EntryUpdate = { id: string; progress_rating: number; note: string | null };

export function validateRating(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 10) throw new DataError("Rating must be 1–10.");
  return n;
}

export async function listEntries(scorecardIds: string[]): Promise<EntryWithGoal[]> {
  if (scorecardIds.length === 0) return [];
  const supabase = await db();
  const data = check(
    await supabase
      .from("scorecard_entries")
      .select("*, goal:goals(*)")
      .in("scorecard_id", scorecardIds)
      .order("created_at", { ascending: true }),
    "load scorecard entries",
  );
  return (data ?? []) as EntryWithGoal[];
}

/** Entries for a single goal across all weeks (for goal progress history). */
export async function listEntriesForGoal(goalId: string) {
  const supabase = await db();
  const data = check(
    await supabase
      .from("scorecard_entries")
      .select("id, progress_rating, note, scorecard:weekly_scorecards(id, week_start_date)")
      .eq("goal_id", goalId),
    "load goal history",
  );
  type Row = {
    id: string;
    progress_rating: number;
    note: string | null;
    scorecard: { id: string; week_start_date: string } | null;
  };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.scorecard)
    .sort((a, b) => a.scorecard!.week_start_date.localeCompare(b.scorecard!.week_start_date));
}

export async function createEntriesForGoals(scorecardId: string, goals: Goal[]) {
  if (goals.length === 0) return;
  const supabase = await db();
  check(
    await supabase
      .from("scorecard_entries")
      .insert(goals.map((g) => ({ scorecard_id: scorecardId, goal_id: g.id, progress_rating: 5 }))),
    "create scorecard entries",
  );
}

export async function updateEntries(scorecardId: string, updates: EntryUpdate[]) {
  const supabase = await db();
  const clean = updates.map((u) => ({ ...u, progress_rating: validateRating(u.progress_rating) }));
  // One request per entry, sent in parallel (PostgREST has no multi-row update by id).
  const results = await Promise.all(
    clean.map((u) =>
      supabase
        .from("scorecard_entries")
        .update({ progress_rating: u.progress_rating, note: u.note?.trim() || null })
        .eq("id", u.id)
        .eq("scorecard_id", scorecardId),
    ),
  );
  results.forEach((r) => check(r, "save rating"));
}

export async function deleteEntry(scorecardId: string, entryId: string) {
  const supabase = await db();
  check(
    await supabase.from("scorecard_entries").delete().eq("id", entryId).eq("scorecard_id", scorecardId),
    "remove entry",
  );
}
