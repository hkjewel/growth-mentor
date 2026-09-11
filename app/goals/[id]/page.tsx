import Link from "next/link";
import { notFound } from "next/navigation";
import { getGoal } from "@/lib/data/goals";
import { listVisions } from "@/lib/data/visions";
import { listEntriesForGoal } from "@/lib/data/entries";
import { formatWeek } from "@/lib/dates";
import { CategoryBadge, PageHeader, Stat, TimeframeBadge, scoreColor } from "@/components/ui";
import { LineChart } from "@/components/Charts";
import { GoalRow } from "@/components/GoalRow";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [goal, visions, history] = await Promise.all([getGoal(id), listVisions(), listEntriesForGoal(id)]);
  if (!goal) notFound();

  const vision = visions.find((v) => v.id === goal.vision_id);
  const ratings = history.map((h) => h.progress_rating);
  const avg = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;
  const best = ratings.length ? Math.max(...ratings) : null;
  const last = ratings.length ? ratings[ratings.length - 1] : null;

  return (
    <>
      <PageHeader
        title={goal.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={goal.category} />
            <TimeframeBadge timeframe={goal.timeframe} />
            {goal.target_metric && <span>Target: {goal.target_metric}</span>}
            {vision && (
              <Link href={`/goals?vision=${vision.id}`} className="text-brand-700 hover:underline">
                ↳ {vision.title}
              </Link>
            )}
          </span>
        }
        action={
          <Link href="/goals" className="btn btn-secondary">
            ← All goals
          </Link>
        }
      />

      <ul className="card mb-6 overflow-hidden">
        <GoalRow goal={goal} visions={visions} lastRating={last} onDetailPage />
      </ul>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Weeks rated" value={ratings.length} />
        <Stat label="Average" value={<span className={scoreColor(avg)}>{avg == null ? "—" : avg.toFixed(1)}</span>} />
        <Stat label="Best week" value={best == null ? "—" : `${best}/10`} />
      </div>

      <section className="card mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Weekly ratings</h2>
        {history.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Not rated yet.{" "}
            <Link href="/scorecard" className="text-brand-700 hover:underline">
              Rate it on this week&apos;s scorecard →
            </Link>
          </p>
        ) : (
          <>
            {history.length >= 2 && (
              <LineChart
                labels={history.map((h) => h.scorecard!.week_start_date.slice(5))}
                series={[{ label: goal.title, color: "#1fa06d", points: ratings }]}
              />
            )}
            <ul className="mt-4 divide-y divide-neutral-100">
              {[...history].reverse().map((h) => (
                <li key={h.id} className="flex items-start gap-4 py-3 text-sm">
                  <span className={`w-12 shrink-0 text-lg font-bold tabular-nums ${scoreColor(h.progress_rating)}`}>{h.progress_rating}</span>
                  <div className="min-w-0">
                    <Link href={`/scorecard/${h.scorecard!.id}`} className="font-medium text-neutral-800 hover:underline">
                      Week of {formatWeek(h.scorecard!.week_start_date)}
                    </Link>
                    {h.note && <p className="text-neutral-500">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
