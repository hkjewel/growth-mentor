import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS, type Goal, type ScorecardWithEntries } from "@/types";
import { categoryAverages, categorySeries, goalRatings, predictGoal, type Prediction } from "@/lib/insights";
import { HBar, LineChart } from "./Charts";
import { CATEGORY_COLORS, CategoryBadge } from "./ui";

const LIKELIHOOD: Record<Prediction["likelihood"], { label: string; cls: string }> = {
  on_track: { label: "On track", cls: "bg-brand-100 text-brand-800" },
  at_risk: { label: "At risk", cls: "bg-amber-100 text-amber-800" },
  off_track: { label: "Off track", cls: "bg-red-100 text-red-700" },
  not_enough_data: { label: "Not enough data", cls: "bg-neutral-100 text-neutral-600" },
};

export function PredictionBadge({ p }: { p: Prediction }) {
  const s = LIKELIHOOD[p.likelihood];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

/** Category trends, category ranking and goal predictions. `cards` newest first. */
export function ProgressPanels({
  cards,
  goals,
  linkGoals = true,
}: {
  cards: ScorecardWithEntries[];
  goals: Goal[];
  linkGoals?: boolean;
}) {
  const series = categorySeries(cards).slice(-16);
  const recentScored = cards.filter((c) => c.overall_score != null).slice(0, 8);
  const ranking = categoryAverages(recentScored.flatMap((c) => c.entries));
  const active = goals.filter((g) => g.is_active);
  const predictions = active
    .map((g) => ({ goal: g, p: predictGoal(goalRatings(cards, g.id)) }))
    .sort((a, b) => {
      const order = { off_track: 0, at_risk: 1, on_track: 2, not_enough_data: 3 };
      return order[a.p.likelihood] - order[b.p.likelihood];
    });
  const presentCats = CATEGORIES.filter((c) => series.some((row) => row[c] != null));

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Category trends</h2>
        <p className="mb-3 text-xs text-neutral-500">Average rating per category, week by week.</p>
        {series.length < 2 ? (
          <p className="text-sm text-neutral-500">Trends appear after two scored weeks.</p>
        ) : (
          <LineChart
            labels={series.map((r) => r.week.slice(5))}
            series={presentCats.map((c) => ({ label: CATEGORY_LABELS[c], color: CATEGORY_COLORS[c], points: series.map((r) => r[c]) }))}
          />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-neutral-700">Where to focus</h2>
          <p className="text-xs text-neutral-500">Categories ranked by average over the last {recentScored.length || 8} scored weeks, weakest first.</p>
          {ranking.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No scored weeks yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {ranking.map((c, i) => (
                <li key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-800">
                      {i + 1}. {CATEGORY_LABELS[c.category]}
                      {i === 0 && ranking.length > 1 && (
                        <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Needs attention</span>
                      )}
                    </span>
                    <span className="tabular-nums text-neutral-600">{c.avg.toFixed(1)}</span>
                  </div>
                  <HBar value={c.avg} color={CATEGORY_COLORS[c.category]} />
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-neutral-700">Goal predictions</h2>
          <p className="text-xs text-neutral-500">Projected from each goal&apos;s recent ratings and trend (~4 weeks out).</p>
          {predictions.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No active goals.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100">
              {predictions.map(({ goal, p }) => (
                <li key={goal.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    {linkGoals ? (
                      <Link href={`/goals/${goal.id}`} className="min-w-0 truncate font-medium text-neutral-800 hover:underline">
                        {goal.title}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate font-medium text-neutral-800">{goal.title}</span>
                    )}
                    <PredictionBadge p={p} />
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <CategoryBadge category={goal.category} />
                    {p.recentAvg != null && <span>avg {p.recentAvg.toFixed(1)}</span>}
                    {p.projected != null && <span>→ projected {p.projected.toFixed(1)}</span>}
                    <span>{p.reason}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
