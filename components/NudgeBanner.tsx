import Link from "next/link";
import { getScorecardByWeek } from "@/lib/data/scorecards";
import { listGoals } from "@/lib/data/goals";
import { currentWeek } from "@/lib/week";
import { scorecardNudge } from "@/lib/insights";

const STYLES = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  urgent: "border-red-200 bg-red-50 text-red-900",
} as const;

/**
 * Weekly nudge: shown when this week's scorecard isn't started (or not rated)
 * and it's getting late in the week. Rule lives in lib/insights.scorecardNudge.
 */
export async function NudgeBanner({ compact = false }: { compact?: boolean }) {
  try {
    const { weekStart, weekday } = await currentWeek();
    const [card, goals] = await Promise.all([getScorecardByWeek(weekStart), listGoals({ activeOnly: true })]);
    const nudge = scorecardNudge({
      weekdayIndex: weekday,
      hasScorecard: !!card,
      isScored: card?.overall_score != null,
      activeGoals: goals.length,
    });
    if (!nudge || (compact && nudge.level === "info")) return null;
    return (
      <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${STYLES[nudge.level]}`} role="status">
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-lg leading-none">{nudge.level === "urgent" ? "⏰" : nudge.level === "warning" ? "📝" : "👋"}</span>
          <div>
            <p className="text-sm font-semibold">{nudge.title}</p>
            <p className="text-sm opacity-90">{nudge.body}</p>
          </div>
        </div>
        <Link href="/scorecard" className="btn btn-primary px-3 py-1.5">
          {nudge.cta}
        </Link>
      </div>
    );
  } catch {
    return null; // a nudge must never break the page
  }
}
