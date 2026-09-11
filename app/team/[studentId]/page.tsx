import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentViewer } from "@/lib/data/db";
import { getStudent } from "@/lib/data/team";
import { listVisions } from "@/lib/data/visions";
import { listGoals } from "@/lib/data/goals";
import { listScorecardsWithEntries } from "@/lib/data/scorecards";
import { formatWeek } from "@/lib/dates";
import { CategoryBadge, PageHeader, ScoreRing, scoreColor } from "@/components/ui";
import { ProgressPanels } from "@/components/ProgressPanels";

export const metadata: Metadata = { title: "Student" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read-only view of a student's progress (mentor access is granted by RLS in 0004). */
export default async function StudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  if (!UUID.test(studentId)) notFound();
  if (!(await currentViewer())) redirect(`/login?next=/team/${studentId}`);
  const rel = await getStudent(studentId);
  if (!rel) notFound();

  const [visions, goals, cards] = await Promise.all([
    listVisions(studentId),
    listGoals({ forUser: studentId }),
    listScorecardsWithEntries(26, studentId),
  ]);

  return (
    <>
      <PageHeader
        title={rel.student_email ?? "Student"}
        subtitle="Read-only view — you can see progress, but only the student can change it."
        action={
          <Link href="/team" className="btn btn-secondary">
            ← Team
          </Link>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-neutral-700">Visions</h2>
          {visions.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No vision yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {visions.map((v) => (
                <li key={v.id}>
                  <p className="font-medium text-neutral-900">{v.title}</p>
                  {v.description && <p className="text-sm text-neutral-500">{v.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-neutral-700">Goals</h2>
          {goals.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No goals yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {goals.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2">
                  <span className={g.is_active ? "text-neutral-800" : "text-neutral-400 line-through"}>{g.title}</span>
                  <CategoryBadge category={g.category} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ProgressPanels cards={cards} goals={goals} linkGoals={false} />

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Weekly scorecards</h2>
        {cards.length === 0 ? (
          <p className="card p-5 text-sm text-neutral-500">No scorecards yet.</p>
        ) : (
          <ul className="space-y-3">
            {cards.map((c) => (
              <li key={c.id} className="card p-5">
                <div className="flex items-center gap-4">
                  <ScoreRing score={c.overall_score} size={56} />
                  <div>
                    <p className="font-semibold text-neutral-900">Week of {formatWeek(c.week_start_date)}</p>
                    {c.notes && <p className="text-sm italic text-neutral-500">“{c.notes}”</p>}
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-neutral-100 text-sm">
                  {c.entries.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 py-2">
                      <span className={`w-8 shrink-0 font-bold tabular-nums ${scoreColor(c.overall_score == null ? null : e.progress_rating)}`}>
                        {c.overall_score == null ? "—" : e.progress_rating}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium text-neutral-800">{e.goal?.title ?? "Deleted goal"}</span>
                        {e.note && <span className="text-neutral-500"> — {e.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                {c.ai_summary && c.ai_summary_review_status === "approved" && (
                  <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
                    <span className="font-semibold">Coach summary:</span> {c.ai_summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
