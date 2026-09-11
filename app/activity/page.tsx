import type { Metadata } from "next";
import { listAudit, type AuditEntry } from "@/lib/data/audit";
import { EmptyState, PageHeader } from "@/components/ui";
import { visitorTimeZone } from "@/lib/week";

export const metadata: Metadata = { title: "Activity log" };
export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  "vision.created": "Created a vision",
  "vision.updated": "Updated a vision",
  "vision.deleted": "Deleted a vision",
  "goal.created": "Added a goal",
  "goal.updated": "Edited a goal",
  "goal.deleted": "Deleted a goal",
  "goal.activated": "Resumed a goal",
  "goal.deactivated": "Paused a goal",
  "scorecard.created": "Started a weekly scorecard",
  "scorecard.rated": "Rated goals",
  "scorecard.scored": "Computed weekly score",
  "scorecard.entries_added": "Added goals to a scorecard",
  "scorecard.entry_removed": "Removed a goal from a scorecard",
  "scorecard.deleted": "Deleted a scorecard",
  "scorecard.summary_drafted": "Drafted a weekly summary",
  "scorecard.summary_approved": "Approved a weekly summary",
  "scorecard.summary_rejected": "Rejected a weekly summary",
  "team.invite_created": "Created a team invite code",
  "team.invite_revoked": "Revoked a team invite code",
  "team.joined": "Joined a mentor's team",
  "team.left": "Left a mentor's team",
  "team.student_removed": "Removed a student",
  "data.exported": "Exported scorecard history (CSV)",
};

function describe(e: AuditEntry): string | null {
  const d = e.detail ?? {};
  if (typeof d.title === "string") return `“${d.title}”`;
  if (typeof d.overall_score === "number") return `Overall ${d.overall_score.toFixed(1)}`;
  if (typeof d.week_start_date === "string") return `Week of ${d.week_start_date}`;
  if (typeof d.source === "string") return `Source: ${d.source}`;
  if (Array.isArray(d.ratings)) return `${d.ratings.length} rating${d.ratings.length === 1 ? "" : "s"}`;
  return null;
}

function time(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone });
}

export default async function ActivityPage() {
  const [entries, tz] = await Promise.all([listAudit(150), visitorTimeZone()]);

  return (
    <>
      <PageHeader
        title="Activity log"
        subtitle="Every meaningful change — by you or computed by the system — recorded append-only. Nothing here can be edited or deleted."
      />
      {entries === null ? (
        <EmptyState
          title="The activity log isn't switched on yet."
          body="Apply supabase/migrations/0002_audit_and_constraints.sql to your database to start recording activity."
        />
      ) : entries.length === 0 ? (
        <EmptyState title="No activity yet." body="Create a vision, add goals or rate a week — it will show up here." />
      ) : (
        <ol className="card divide-y divide-neutral-100">
          {entries.map((e) => {
            const extra = describe(e);
            return (
              <li key={e.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.actor === "system" ? "bg-sky-400" : "bg-brand-500"}`}
                  title={e.actor === "system" ? "System" : "You"}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-neutral-800">
                    {LABELS[e.action] ?? e.action}
                    {extra && <span className="text-neutral-500"> · {extra}</span>}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {e.actor === "system" ? "System" : "You"} · {e.target_table}
                  </p>
                </div>
                <time className="shrink-0 text-xs tabular-nums text-neutral-400" dateTime={e.created_at}>
                  {time(e.created_at, tz)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
