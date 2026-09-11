import Link from "next/link";
import type { ScorecardWithEntries } from "@/types";
import { listGoals } from "@/lib/data/goals";
import { getPreviousScoredScorecard } from "@/lib/data/scorecards";
import { formatWeek } from "@/lib/dates";
import { deleteScorecardAction } from "@/app/actions";
import { ActionButton } from "./FormBits";
import { ScorecardForm } from "./ScorecardForm";
import { PageHeader, TrendBadge } from "./ui";
import { trendOf } from "@/lib/insights";

/** Full editor for one week's scorecard (used by /scorecard and /scorecard/[id]). */
export async function ScorecardView({ card, isCurrent }: { card: ScorecardWithEntries; isCurrent: boolean }) {
  const [activeGoals, previous] = await Promise.all([
    listGoals({ activeOnly: true }),
    getPreviousScoredScorecard(card.week_start_date),
  ]);
  const have = new Set(card.entries.map((e) => e.goal_id));
  const missing = activeGoals.filter((g) => !have.has(g.id)).length;
  const { delta } = trendOf(card.overall_score, previous?.overall_score ?? null);

  return (
    <>
      <PageHeader
        title={isCurrent ? "This week's scorecard" : "Weekly scorecard"}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>Week of {formatWeek(card.week_start_date)}</span>
            {card.overall_score != null && <TrendBadge delta={delta} />}
          </span>
        }
        action={
          <>
            {!isCurrent && (
              <Link href="/history" className="btn btn-secondary">
                ← History
              </Link>
            )}
            <ActionButton
              className="btn btn-danger"
              pendingText="Deleting…"
              confirmText="Delete this week's scorecard and all its ratings? This cannot be undone."
              action={deleteScorecardAction.bind(null, card.id)}
            >
              Delete week
            </ActionButton>
          </>
        }
      />
      <ScorecardForm key={card.id} card={card} missingGoals={missing} />
    </>
  );
}
