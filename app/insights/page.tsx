import type { Metadata } from "next";
import { NudgeBanner } from "@/components/NudgeBanner";
import Link from "next/link";
import { listGoals } from "@/lib/data/goals";
import { listScorecardsWithEntries } from "@/lib/data/scorecards";
import { formatWeek } from "@/lib/dates";
import { EmptyState, PageHeader, ScoreRing } from "@/components/ui";
import { ProgressPanels } from "@/components/ProgressPanels";

export const metadata: Metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const [cards, goals] = await Promise.all([listScorecardsWithEntries(52), listGoals()]);
  const scored = cards.filter((c) => c.overall_score != null);
  const ranked = [...scored].sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0));
  const best = ranked.slice(0, 3);
  const toughest = ranked.length > 3 ? ranked.slice(-3).reverse() : [];

  return (
    <>
      <NudgeBanner compact />
      <PageHeader
        title="Insights"
        subtitle="Which areas need attention, where each goal is heading, and your best weeks."
        action={
          scored.length > 0 ? (
            <a href="/api/export" className="btn btn-secondary">
              Export CSV
            </a>
          ) : undefined
        }
      />
      {scored.length === 0 ? (
        <EmptyState
          title="No scored weeks yet."
          body="Save your first weekly scorecard to unlock trends and predictions."
          action={
            <Link href="/scorecard" className="btn btn-primary">
              Go to this week
            </Link>
          }
        />
      ) : (
        <>
          <ProgressPanels cards={cards} goals={goals} />
          <section className="card mt-4 p-5">
            <h2 className="text-sm font-semibold text-neutral-700">Weeks ranked by score</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {[
                { title: "Best weeks", list: best },
                { title: "Toughest weeks", list: toughest },
              ].map(({ title, list }) =>
                list.length ? (
                  <div key={title}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
                    <ul className="space-y-2">
                      {list.map((c) => (
                        <li key={c.id}>
                          <Link href={`/scorecard/${c.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-neutral-50">
                            <ScoreRing score={c.overall_score} size={48} />
                            <span className="text-sm text-neutral-700">Week of {formatWeek(c.week_start_date)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
