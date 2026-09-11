import type { Metadata } from "next";
import Link from "next/link";
import { listScorecardsWithEntries } from "@/lib/data/scorecards";
import { currentWeek } from "@/lib/week";
import { formatWeek } from "@/lib/dates";
import { trendOf, weakestEntry } from "@/lib/insights";
import { EmptyState, PageHeader, ScoreRing, TrendBadge } from "@/components/ui";
import { BackfillWeek } from "@/components/BackfillWeek";
import { LineChart } from "@/components/Charts";

export const metadata: Metadata = { title: "History" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [cards, { weekStart, today }] = await Promise.all([listScorecardsWithEntries(), currentWeek()]);
  const scored = cards.filter((c) => c.overall_score != null);
  const chart = [...scored].reverse().slice(-16);

  return (
    <>
      <PageHeader
        title="Scorecard history"
        subtitle="Every weekly review you've done, newest first."
        action={<BackfillWeek max={today} />}
      />

      {cards.length === 0 ? (
        <EmptyState
          title="No scorecards yet. Start your first weekly review."
          action={
            <Link href="/scorecard" className="btn btn-primary">
              Go to this week
            </Link>
          }
        />
      ) : (
        <>
          {chart.length >= 2 && (
            <div className="card mb-6 p-5">
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">Overall score by week</h2>
              <LineChart
                labels={chart.map((c) => c.week_start_date.slice(5))}
                series={[{ label: "Overall", color: "#1fa06d", points: chart.map((c) => c.overall_score) }]}
              />
            </div>
          )}
          <ul className="space-y-3">
            {cards.map((c, i) => {
              const prev = cards.slice(i + 1).find((p) => p.overall_score != null);
              const { delta } = trendOf(c.overall_score, prev?.overall_score ?? null);
              const weakest = c.overall_score != null ? weakestEntry(c.entries) : null;
              const href = c.week_start_date === weekStart ? "/scorecard" : `/scorecard/${c.id}`;
              return (
                <li key={c.id}>
                  <Link href={href} className="card flex items-center gap-4 p-4 transition hover:border-brand-300 hover:shadow-md sm:p-5">
                    <ScoreRing score={c.overall_score} size={64} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-neutral-900">Week of {formatWeek(c.week_start_date)}</p>
                        {c.week_start_date === weekStart && (
                          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">This week</span>
                        )}
                        {c.overall_score == null && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Not rated yet</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-neutral-500">
                        {c.entries.length} goal{c.entries.length === 1 ? "" : "s"} rated
                        {weakest?.goal && (
                          <>
                            {" "}· needs attention: <span className="text-neutral-700">{weakest.goal.title}</span> ({weakest.progress_rating}/10)
                          </>
                        )}
                      </p>
                      {c.notes && <p className="mt-1 line-clamp-1 text-sm italic text-neutral-500">“{c.notes}”</p>}
                    </div>
                    <div className="hidden sm:block">{c.overall_score != null && <TrendBadge delta={delta} />}</div>
                    <span className="text-neutral-300" aria-hidden>
                      ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
