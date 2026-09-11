import type { Metadata } from "next";
import Link from "next/link";
import { currentViewer } from "@/lib/data/db";
import { getTeamOverview } from "@/lib/data/team";
import { listScorecards } from "@/lib/data/scorecards";
import { formatDate, formatWeek } from "@/lib/dates";
import { createInviteAction, endMentorshipAction, revokeInviteAction } from "@/app/actions";
import { EmptyState, PageHeader, scoreColor } from "@/components/ui";
import { ActionButton } from "@/components/FormBits";
import { CopyCode, JoinTeamForm } from "@/components/TeamBits";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const viewer = await currentViewer();
  if (!viewer) {
    return (
      <>
        <PageHeader title="Team" subtitle="Mentor your students — or join a mentor — and review weekly scorecards together." />
        <EmptyState
          title="Sign in to build a team."
          body="Teams connect real accounts: mentors invite students with a code, then see their visions, goals and weekly scores (read-only)."
          action={
            <Link href="/login?next=/team" className="btn btn-primary">
              Sign in
            </Link>
          }
        />
      </>
    );
  }

  const team = await getTeamOverview();
  if (!team.available) {
    return (
      <>
        <PageHeader title="Team" />
        <EmptyState
          title="Teams aren't switched on yet."
          body="Apply supabase/migrations/0004_mentorships.sql to your database to enable invites and student views."
        />
      </>
    );
  }

  const latest = await Promise.all(
    team.students.map(async (s) => ({ id: s.student_id, card: (await listScorecards(1, s.student_id))[0] ?? null })),
  );

  return (
    <>
      <PageHeader title="Team" subtitle="Mentors see their students' progress read-only. Students stay in control and can leave anytime." />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <div className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-neutral-900">My students</h2>
                <p className="text-sm text-neutral-500">Share an invite code; students redeem it on their Team page.</p>
              </div>
              <ActionButton className="btn btn-primary" pendingText="Creating…" action={createInviteAction}>
                + New invite code
              </ActionButton>
            </div>
            {team.invites.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {team.invites.map((i) => (
                  <li key={i.id} className="flex items-center gap-1 rounded-xl border border-neutral-200 p-1 pr-2">
                    <CopyCode code={i.code} />
                    <ActionButton
                      className="btn btn-ghost px-2 py-1 text-xs"
                      pendingText="…"
                      confirmText={`Revoke code ${i.code}? Students who already joined stay on your team.`}
                      action={revokeInviteAction.bind(null, i.id)}
                    >
                      Revoke
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {team.students.length === 0 ? (
            <EmptyState title="No students yet." body="Create an invite code and share it with a student to see their scorecards here." />
          ) : (
            <ul className="card divide-y divide-neutral-100 overflow-hidden">
              {team.students.map((s) => {
                const card = latest.find((l) => l.id === s.student_id)?.card ?? null;
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-sm font-bold uppercase text-sky-800">
                      {(s.student_email ?? "?").slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/team/${s.student_id}`} className="font-medium text-neutral-900 hover:underline">
                        {s.student_email ?? "Student"}
                      </Link>
                      <p className="text-xs text-neutral-500">
                        Joined {formatDate(s.created_at)}
                        {card && <> · last review week of {formatWeek(card.week_start_date)}</>}
                      </p>
                    </div>
                    <span className={`text-lg font-bold tabular-nums ${scoreColor(card?.overall_score)}`}>
                      {card?.overall_score != null ? card.overall_score.toFixed(1) : "—"}
                    </span>
                    <Link href={`/team/${s.student_id}`} className="btn btn-secondary px-3 py-1.5">
                      View
                    </Link>
                    <ActionButton
                      className="btn btn-danger px-3 py-1.5"
                      pendingText="…"
                      confirmText={`Remove ${s.student_email ?? "this student"} from your team?`}
                      action={endMentorshipAction.bind(null, s.id)}
                    >
                      Remove
                    </ActionButton>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-neutral-900">My mentors</h2>
            <p className="mb-4 text-sm text-neutral-500">Join a mentor so they can review your weekly scorecards.</p>
            <JoinTeamForm />
            {team.mentors.length > 0 && (
              <ul className="mt-4 space-y-2">
                {team.mentors.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                    <span className="truncate">{m.mentor_email ?? "Mentor"}</span>
                    <ActionButton
                      className="btn btn-ghost px-2 py-1 text-xs"
                      pendingText="…"
                      confirmText="Leave this mentor's team? They will no longer see your data."
                      action={endMentorshipAction.bind(null, m.id)}
                    >
                      Leave
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="px-1 text-xs text-neutral-500">
            Privacy: mentors can view your visions, goals and scorecards but can never edit or delete them.
          </p>
        </aside>
      </div>
    </>
  );
}
