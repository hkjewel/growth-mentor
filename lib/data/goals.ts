import "server-only";
import { CATEGORIES, TIMEFRAMES, type Category, type Goal, type Timeframe } from "@/types";
import { check, db, DataError } from "./db";
import { logAudit } from "./audit";

export type GoalInput = {
  title: string;
  vision_id: string | null;
  category: string;
  timeframe: string;
  target_metric: string | null;
};

export function validateGoal(input: GoalInput) {
  const title = input.title.trim();
  if (!title) throw new DataError("Give your goal a title.");
  if (title.length > 200) throw new DataError("Title must be 200 characters or fewer.");
  if (!CATEGORIES.includes(input.category as Category))
    throw new DataError("Pick a category: health, soft skill, or education.");
  if (!TIMEFRAMES.includes(input.timeframe as Timeframe))
    throw new DataError("Pick a timeframe: short-term or long-term.");
  return {
    title,
    vision_id: input.vision_id || null,
    category: input.category as Category,
    timeframe: input.timeframe as Timeframe,
    target_metric: input.target_metric?.trim() || null,
  };
}

export async function listGoals(opts: { activeOnly?: boolean } = {}): Promise<Goal[]> {
  const supabase = await db();
  let q = supabase.from("goals").select("*").order("created_at", { ascending: true });
  if (opts.activeOnly) q = q.eq("is_active", true);
  const data = check(await q, "load goals");
  return (data ?? []) as Goal[];
}

export async function getGoal(id: string): Promise<Goal | null> {
  const supabase = await db();
  const data = check(await supabase.from("goals").select("*").eq("id", id).maybeSingle(), "load goal");
  return (data as Goal) ?? null;
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const clean = validateGoal(input);
  const supabase = await db();
  const data = check(await supabase.from("goals").insert(clean).select().single(), "create goal");
  await logAudit("goal.created", "goals", data.id, { title: clean.title, category: clean.category });
  return data as Goal;
}

export async function updateGoal(id: string, input: GoalInput): Promise<Goal> {
  const clean = validateGoal(input);
  const supabase = await db();
  const data = check(
    await supabase.from("goals").update(clean).eq("id", id).select().single(),
    "update goal",
  );
  await logAudit("goal.updated", "goals", id, { title: clean.title });
  return data as Goal;
}

export async function setGoalActive(id: string, isActive: boolean): Promise<void> {
  const supabase = await db();
  check(await supabase.from("goals").update({ is_active: isActive }).eq("id", id), "update goal");
  await logAudit(isActive ? "goal.activated" : "goal.deactivated", "goals", id);
}

/** Deleting a goal also removes its scorecard entries (FK cascade). */
export async function deleteGoal(id: string): Promise<void> {
  const supabase = await db();
  check(await supabase.from("goals").delete().eq("id", id), "delete goal");
  await logAudit("goal.deleted", "goals", id);
}
