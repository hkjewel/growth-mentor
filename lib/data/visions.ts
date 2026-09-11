import "server-only";
import type { Vision } from "@/types";
import { check, db, DataError } from "./db";
import { logAudit } from "./audit";

export type VisionInput = {
  title: string;
  description: string | null;
  horizon_years: number;
};

export function validateVision(input: VisionInput): VisionInput {
  const title = input.title.trim();
  if (!title) throw new DataError("Give your vision a title.");
  if (title.length > 200) throw new DataError("Title must be 200 characters or fewer.");
  const horizon = Math.round(Number(input.horizon_years) || 10);
  if (horizon < 1 || horizon > 50) throw new DataError("Horizon must be between 1 and 50 years.");
  return { title, description: input.description?.trim() || null, horizon_years: horizon };
}

export async function listVisions(): Promise<Vision[]> {
  const supabase = await db();
  const data = check(
    await supabase.from("visions").select("*").order("created_at", { ascending: true }),
    "load visions",
  );
  return (data ?? []) as Vision[];
}

export async function createVision(input: VisionInput): Promise<Vision> {
  const clean = validateVision(input);
  const supabase = await db();
  const data = check(await supabase.from("visions").insert(clean).select().single(), "create vision");
  await logAudit("vision.created", "visions", data.id, { title: clean.title });
  return data as Vision;
}

export async function updateVision(id: string, input: VisionInput): Promise<Vision> {
  const clean = validateVision(input);
  const supabase = await db();
  const data = check(
    await supabase.from("visions").update(clean).eq("id", id).select().single(),
    "update vision",
  );
  await logAudit("vision.updated", "visions", id, { title: clean.title });
  return data as Vision;
}

/** Deleting a vision cascades to its goals (and their scorecard entries). */
export async function deleteVision(id: string): Promise<void> {
  const supabase = await db();
  check(await supabase.from("visions").delete().eq("id", id), "delete vision");
  await logAudit("vision.deleted", "visions", id);
}
