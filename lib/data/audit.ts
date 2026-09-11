import "server-only";
import { after } from "next/server";
import { db, ownerId } from "./db";

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
 * user's action. The insert runs after the response is sent (next/server
 * `after`) so logging never adds a database round trip to the user's wait.
 */
export async function logAudit(
  action: string,
  targetTable: string,
  targetId: string | null,
  detail: Record<string, unknown> = {},
  actor: "user" | "system" = "user",
) {
  try {
    // Resolve request-scoped values now; the deferred callback only does I/O.
    const [supabase, userId] = await Promise.all([db(), ownerId()]);
    const write = async () => {
      const { error } = await supabase.from("audit_logs").insert({
        user_id: userId,
        actor,
        action,
        target_table: targetTable,
        target_id: targetId,
        detail,
      });
      if (error) console.warn("[audit] skipped:", error.message);
    };
    try {
      after(write);
    } catch {
      await write(); // outside a request scope
    }
  } catch (e) {
    console.warn("[audit] skipped:", e);
  }
}

/** Returns null when the audit_logs table doesn't exist yet (migration 0002 not applied). */
export async function listAudit(limit = 100): Promise<AuditEntry[] | null> {
  const supabase = await db();
  const owner = await ownerId();
  const base = supabase.from("audit_logs").select("*");
  const { data, error } = await (owner ? base.eq("user_id", owner) : base.is("user_id", null))
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[audit] list failed:", error.message);
    return null;
  }
  return (data ?? []) as AuditEntry[];
}
