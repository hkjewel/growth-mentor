import type { Metadata } from "next";
import Link from "next/link";
import { getScorecardByWeek } from "@/lib/data/scorecards";
import { listGoals } from "@/lib/data/goals";
import { currentWeek } from "@/lib/week";
import { formatWeek } from "@/lib/dates";
import { CategoryBadge, EmptyState, PageHeader } from "@/components/ui";
import { StartScorecard } from "@/components/StartScorecard";
import { ScorecardView } from "@/components/ScorecardView";

export const metadata: Metadata = { title: "Weekly Scorecard" };
export const dynamic = "force-dynamic";

export default async function ScorecardPage() {
  const { weekStart } = await currentWeek();
  const card = await getScorecardByWeek(weekStart);
  if (card) return <ScorecardView card={card} isCurrent />;

  const goals = await listGoals({ activeOnly: true });

  return (
    <>
      <PageHeader title="This week's scorecard" subtitle={`Week of ${formatWeek(weekStart)}`} />
      {goals.length === 0 ? (
        <EmptyState
          title="Add goals first to generate a scorecard."
          body="Each active goal becomes one row you rate 1–10 every week."
          action={
            <Link href="/goals?new=1" className="btn btn-primary">
              Add a goal
            </Link>
          }
        />
      ) : (
        <div className="card mx-auto max-w-2xl p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Weekly review</p>
          <h2 className="mt-2 text-xl font-bold text-neutral-900">You haven&apos;t started this week yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            Starting creates one entry for each of your {goals.length} active goal{goals.length === 1 ? "" : "s"}. Rate each 1–10, add a
            note, and get your overall weekly score.
          </p>
          <ul className="mx-auto mt-6 max-w-md space-y-2 text-left">
            {goals.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                <span className="truncate font-medium text-neutral-800">{g.title}</span>
                <CategoryBadge category={g.category} />
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <StartScorecard week={weekStart} />
          </div>
        </div>
      )}
    </>
  );
}
