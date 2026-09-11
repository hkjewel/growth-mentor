import Link from "next/link";
import { listVisions } from "@/lib/data/visions";
import { listGoals } from "@/lib/data/goals";
import { listScorecardsWithEntries } from "@/lib/data/scorecards";
import { currentWeek } from "@/lib/week";
import { formatWeek } from "@/lib/dates";
import { categoryAverages, strongestEntry, trendOf, weakestEntry, weeklyStreak } from "@/lib/insights";
import { CATEGORY_LABELS } from "@/types";
import { CATEGORY_COLORS, CategoryBadge, PageHeader, ScoreRing, Stat, TrendBadge } from "@/components/ui";
import { HBar, Sparkbars } from "@/components/Charts";
import { StartScorecard } from "@/components/StartScorecard";
import { NudgeBanner } from "@/components/NudgeBanner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [visions, goals, cards, { weekStart }] = await Promise.all([
    listVisions(),
    listGoals(),
    listScorecardsWithEntries(52),
    currentWeek(),
  ]);

  const activeGoals = goals.filter((g) => g.is_active);
  const scored = cards.filter((c) => c.overall_score != null);
  const latest = scored[0] ?? null;
  const previous = scored[1] ?? null;
  const { delta } = trendOf(latest?.overall_score ?? null, previous?.overall_score ?? null);
  const weakest = latest ? weakestEntry(latest.entries) : null;
  const strongest = latest ? strongestEntry(latest.entries) : null;
  const cats = latest ? categoryAverages(latest.entries) : [];
  const thisWeek = cards.find((c) => c.week_start_date === weekStart) ?? null;
  const streak = weeklyStreak(scored.map((c) => c.week_start_date), weekStart);
  const recent = [...scored].slice(0, 12).reverse();
  const allTimeAvg = scored.length
    ? Math.round((scored.reduce((s, c) => s + (c.overall_score ?? 0), 0) / scored.length) * 10) / 10
    : null;
  const northStar = visions[0] ?? null;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Week of ${formatWeek(weekStart)}`} />
      <NudgeBanner />

      {/* North star */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-ink-950 text-white shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-300">
            Your {northStar?.horizon_years ?? 10}-year north star
          </p>
          {northStar ? (
            <>
              <h2 className="mt-2 max-w-3xl text-2xl font-bold sm:text-3xl">{northStar.title}</h2>
              {northStar.description && <p className="mt-2 max-w-3xl text-sm text-brand-100/80">{northStar.description}</p>}
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <Link href="/vision" className="rounded-lg bg-white/10 px-3 py-1.5 font-medium hover:bg-white/15">
                  {visions.length > 1 ? `View all ${visions.length} visions` : "Edit vision"}
                </Link>
                <Link href="/goals" className="rounded-lg bg-white/10 px-3 py-1.5 font-medium hover:bg-white/15">
                  {activeGoals.length} active goal{activeGoals.length === 1 ? "" : "s"}
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-2xl font-bold">Where will you be in 10 years?</h2>
              <p className="mt-2 text-sm text-brand-100/80">Set a vision big enough to force 10x thinking. Everything else hangs off it.</p>
              <Link href="/vision" className="btn mt-4 bg-brand-400 text-ink-950 hover:bg-brand-300">
                Create your vision
              </Link>
            </>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* This week */}
        <section className="card p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-neutral-700">This week</h2>
          {thisWeek ? (
            <div className="mt-4 flex items-center gap-4">
              <ScoreRing score={thisWeek.overall_score} />
              <div className="text-sm">
                <p className="font-semibold text-neutral-900">
                  {thisWeek.overall_score != null ? "Scorecard saved" : "Scorecard started"}
                </p>
                <p className="text-neutral-500">{thisWeek.entries.length} goals on the card</p>
                <Link href="/scorecard" className="mt-2 inline-block font-medium text-brand-700 hover:underline">
                  {thisWeek.overall_score != null ? "Review scores →" : "Rate your goals →"}
                </Link>
              </div>
            </div>
          ) : activeGoals.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-500">
              <p>Add goals first to generate a scorecard.</p>
              <Link href="/goals?new=1" className="btn btn-primary mt-3">
                Add a goal
              </Link>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-start gap-3 text-sm text-neutral-500">
              <p>No scorecard yet for this week. It takes two minutes.</p>
              <StartScorecard week={weekStart} className="btn btn-primary" />
            </div>
          )}
        </section>

        {/* Latest scored week */}
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-neutral-700">Latest weekly score</h2>
            {latest && (
              <Link
                href={latest.week_start_date === weekStart ? "/scorecard" : `/scorecard/${latest.id}`}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Week of {formatWeek(latest.week_start_date)}
              </Link>
            )}
          </div>
          {latest ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-2">
                <ScoreRing score={latest.overall_score} size={104} />
                <TrendBadge delta={delta} />
              </div>
              <div className="space-y-3 text-sm">
                {weakest?.goal && (
                  <div className="rounded-xl bg-red-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Needs attention</p>
                    <p className="mt-0.5 font-medium text-neutral-900">
                      {weakest.goal.title} <span className="text-red-700">· {weakest.progress_rating}/10</span>
                    </p>
                    {weakest.note && <p className="text-neutral-600">{weakest.note}</p>}
                  </div>
                )}
                {strongest?.goal && strongest.id !== weakest?.id && (
                  <div className="rounded-xl bg-brand-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Strongest</p>
                    <p className="mt-0.5 font-medium text-neutral-900">
                      {strongest.goal.title} <span className="text-brand-700">· {strongest.progress_rating}/10</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">No scored weeks yet. Save your first scorecard to see your score and trend here.</p>
          )}
          {latest?.ai_summary && latest.ai_summary_review_status === "approved" && (
            <blockquote className="mt-4 border-l-4 border-brand-400 bg-brand-50/60 px-4 py-3 text-sm text-neutral-700">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">Coach&apos;s note</p>
              {latest.ai_summary}
            </blockquote>
          )}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Streak" value={`${streak} wk${streak === 1 ? "" : "s"}`} hint="Consecutive weeks scored" />
        <Stat label="Weeks tracked" value={scored.length} hint={allTimeAvg != null ? `All-time avg ${allTimeAvg.toFixed(1)}` : "—"} />
        <Stat label="Active goals" value={activeGoals.length} hint={`${goals.length - activeGoals.length} paused`} />
        <Stat label="Recent weeks" value={<Sparkbars values={recent.map((c) => c.overall_score)} />} hint={<Link href="/history" className="text-brand-700 hover:underline">View history →</Link>} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-neutral-700">By category · latest week</h2>
          <p className="text-xs text-neutral-500">Weakest first — the area that needs your attention.</p>
          {cats.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">Category averages appear after your first scored week.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {cats.map((c) => (
                <li key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-800">{CATEGORY_LABELS[c.category]}</span>
                    <span className="tabular-nums text-neutral-600">{c.avg.toFixed(1)}</span>
                  </div>
                  <HBar value={c.avg} color={CATEGORY_COLORS[c.category]} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">Active goals</h2>
            <Link href="/goals" className="text-xs font-medium text-brand-700 hover:underline">
              Manage →
            </Link>
          </div>
          {activeGoals.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No goals yet. Add a goal linked to your vision.</p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100">
              {activeGoals.slice(0, 6).map((g) => {
                const e = latest?.entries.find((x) => x.goal_id === g.id);
                return (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/goals/${g.id}`} className="min-w-0 truncate font-medium text-neutral-800 hover:underline">
                      {g.title}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <CategoryBadge category={g.category} />
                      <span className="w-10 text-right font-semibold tabular-nums text-neutral-700">{e ? e.progress_rating : "—"}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
