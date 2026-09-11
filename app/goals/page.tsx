import type { Metadata } from "next";
import { NudgeBanner } from "@/components/NudgeBanner";
import Link from "next/link";
import { listGoals } from "@/lib/data/goals";
import { listVisions } from "@/lib/data/visions";
import { listScorecardsWithEntries } from "@/lib/data/scorecards";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/types";
import { EmptyState, PageHeader } from "@/components/ui";
import { CreatePanel } from "@/components/Disclosure";
import { GoalForm } from "@/components/GoalForm";
import { GoalRow } from "@/components/GoalRow";

export const metadata: Metadata = { title: "Goals" };
export const dynamic = "force-dynamic";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; vision?: string; new?: string }>;
}) {
  const params = await searchParams;
  const [goals, visions, cards] = await Promise.all([listGoals(), listVisions(), listScorecardsWithEntries(20)]);

  // Latest rating per goal (cards are newest first, only scored weeks count).
  const lastRating = new Map<string, number>();
  for (const c of cards) {
    if (c.overall_score == null) continue;
    for (const e of c.entries) if (!lastRating.has(e.goal_id)) lastRating.set(e.goal_id, e.progress_rating);
  }

  const category = CATEGORIES.includes(params.category as Category) ? (params.category as Category) : null;
  const visionFilter = visions.find((v) => v.id === params.vision) ?? null;
  const filtered = goals.filter(
    (g) => (!category || g.category === category) && (!visionFilter || g.vision_id === visionFilter.id),
  );
  const active = filtered.filter((g) => g.is_active);
  const paused = filtered.filter((g) => !g.is_active);

  const chip = (href: string, label: string, on: boolean) => (
    <Link
      key={label}
      href={href}
      className={`rounded-full px-3 py-1 text-sm font-medium transition ${
        on ? "bg-ink-950 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
      }`}
    >
      {label}
    </Link>
  );
  const qs = (cat: string | null) => {
    const p = new URLSearchParams();
    if (cat) p.set("category", cat);
    if (visionFilter) p.set("vision", visionFilter.id);
    const s = p.toString();
    return s ? `/goals?${s}` : "/goals";
  };

  return (
    <>
      <NudgeBanner compact />
      <PageHeader
        title="Goals"
        subtitle={
          visionFilter ? (
            <>
              Goals for <strong className="text-neutral-700">{visionFilter.title}</strong> ·{" "}
              <Link href="/goals" className="text-brand-700 hover:underline">
                show all
              </Link>
            </>
          ) : (
            "Short- and long-term goals across health, soft skills and education. Each active goal gets a row in your weekly scorecard."
          )
        }
      />

      <div className="mb-6">
        <CreatePanel label="New Goal" title="Add a goal" defaultOpen={params.new === "1" || goals.length === 0}>
          <GoalForm visions={visions} defaultVisionId={visionFilter?.id} />
        </CreatePanel>
      </div>

      {goals.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {chip(qs(null), "All", !category)}
          {CATEGORIES.map((c) => chip(qs(c), CATEGORY_LABELS[c], category === c))}
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState title="No goals yet. Add a goal linked to your vision." body="Try one health goal and one education goal to start." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No goals match this filter." />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Active · {active.length}
            </h2>
            {active.length === 0 ? (
              <p className="card p-5 text-sm text-neutral-500">No active goals here.</p>
            ) : (
              <ul className="card divide-y divide-neutral-100 overflow-hidden">
                {active.map((g) => (
                  <GoalRow key={g.id} goal={g} visions={visions} lastRating={lastRating.get(g.id) ?? null} />
                ))}
              </ul>
            )}
          </section>
          {paused.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Paused · {paused.length}
              </h2>
              <ul className="card divide-y divide-neutral-100 overflow-hidden">
                {paused.map((g) => (
                  <GoalRow key={g.id} goal={g} visions={visions} lastRating={lastRating.get(g.id) ?? null} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
