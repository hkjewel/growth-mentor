import "server-only";
import { db } from "./db";

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target_table: string;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Append-only audit log. Best-effort: a failed log write never blocks the
 * user's action (e.g. if the audit_logs migration hasn't been applied yet).
 */
export async function logAudit(
  action: string,
  targetTable: string,
  targetId: string | null,
  detail: Record<string, unknown> = {},
  actor: "user" | "system" = "user",
) {
  try {
    const supabase = await db();
    const { error } = await supabase.from("audit_logs").insert({
      actor,
      action,
      target_table: targetTable,
      target_id: targetId,
      detail,
    });
    if (error) console.warn("[audit] skipped:", error.message);
  } catch (e) {
    console.warn("[audit] skipped:", e);
  }
}

export async function listAudit(limit = 50): Promise<AuditEntry[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as AuditEntry[];
}
