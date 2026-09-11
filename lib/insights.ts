/**
 * Rule-based intelligence (v1). Pure functions — no database, no AI —
 * so the core engine works with AI switched off. See docs/INTELLIGENCE_LAYER.md.
 */
import { CATEGORIES, type Category, type EntryWithGoal, type ScorecardWithEntries } from "@/types";
import { addDays } from "@/lib/dates";

export type Trend = "improving" | "declining" | "steady" | "new";

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** trend = compare current overall_score to previous week. */
export function trendOf(current: number | null, previous: number | null): { trend: Trend; delta: number | null } {
  if (current == null) return { trend: "new", delta: null };
  if (previous == null) return { trend: "new", delta: null };
  const delta = round1(current - previous);
  if (delta >= 0.3) return { trend: "improving", delta };
  if (delta <= -0.3) return { trend: "declining", delta };
  return { trend: "steady", delta };
}

/** Named tool: flag_weakest_goal — the entry with the lowest rating. */
export function weakestEntry(entries: EntryWithGoal[]): EntryWithGoal | null {
  if (entries.length === 0) return null;
  return entries.reduce((min, e) => (e.progress_rating < min.progress_rating ? e : min));
}

export function strongestEntry(entries: EntryWithGoal[]): EntryWithGoal | null {
  if (entries.length === 0) return null;
  return entries.reduce((max, e) => (e.progress_rating > max.progress_rating ? e : max));
}

/** category_avg = AVG(rating) GROUP BY category. Sorted weakest first (what needs attention). */
export function categoryAverages(entries: EntryWithGoal[]): { category: Category; avg: number; count: number }[] {
  const buckets = new Map<Category, number[]>();
  for (const e of entries) {
    const cat = e.goal?.category;
    if (!cat) continue;
    buckets.set(cat, [...(buckets.get(cat) ?? []), e.progress_rating]);
  }
  return CATEGORIES.filter((c) => buckets.has(c))
    .map((c) => {
      const r = buckets.get(c)!;
      return { category: c, avg: round1(r.reduce((a, b) => a + b, 0) / r.length), count: r.length };
    })
    .sort((a, b) => a.avg - b.avg);
}

/** Per-category average per week, oldest first — for trend charts. */
export function categorySeries(cards: ScorecardWithEntries[]) {
  const scored = [...cards].filter((c) => c.overall_score != null).reverse();
  return scored.map((c) => {
    const row: Record<string, number | string | null> = { week: c.week_start_date };
    for (const cat of CATEGORIES) {
      const r = c.entries.filter((e) => e.goal?.category === cat).map((e) => e.progress_rating);
      row[cat] = r.length ? round1(r.reduce((a, b) => a + b, 0) / r.length) : null;
    }
    return row as { week: string } & Record<Category, number | null>;
  });
}

/**
 * Consecutive scored weeks ending at the current week (or last week, if this
 * week isn't scored yet — the streak is still alive until the week ends).
 */
export function weeklyStreak(scoredWeeks: string[], currentWeek: string): number {
  const set = new Set(scoredWeeks);
  let cursor = set.has(currentWeek) ? currentWeek : addDays(currentWeek, -7);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

/**
 * Goal achievement prediction (rule-based). Uses the goal's recent ratings:
 * level = recent average, slope = least-squares trend per week.
 */
export type Prediction = {
  likelihood: "on_track" | "at_risk" | "off_track" | "not_enough_data";
  recentAvg: number | null;
  slope: number | null;
  projected: number | null;
  reason: string;
};

export function predictGoal(ratings: number[]): Prediction {
  const recent = ratings.slice(-6);
  if (recent.length < 2) {
    return {
      likelihood: "not_enough_data",
      recentAvg: recent.length ? recent[0] : null,
      slope: null,
      projected: null,
      reason: "Rate this goal for at least two weeks to get a prediction.",
    };
  }
  const n = recent.length;
  const xs = recent.map((_, i) => i);
  const mx = (n - 1) / 2;
  const my = recent.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (recent[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const projected = Math.max(1, Math.min(10, my + slope * (n - mx + 3))); // ~4 weeks out
  const avg = round1(my);
  let likelihood: Prediction["likelihood"];
  let reason: string;
  if (projected >= 7 && avg >= 6) {
    likelihood = "on_track";
    reason = slope > 0.2 ? "Strong and still climbing." : "Consistently strong ratings.";
  } else if (projected >= 5) {
    likelihood = "at_risk";
    reason = slope < -0.2 ? "Ratings are slipping — refocus this week." : "Middling progress — needs a push.";
  } else {
    likelihood = "off_track";
    reason = slope > 0.2 ? "Low but recovering — keep the momentum." : "Consistently low — rethink the approach or target.";
  }
  return { likelihood, recentAvg: avg, slope: round1(slope), projected: round1(projected), reason };
}

/**
 * Nudge rule: if this week's scorecard isn't started (or not yet rated) by Friday,
 * the user gets a reminder.
 */
export type Nudge = { level: "info" | "warning" | "urgent"; title: string; body: string; cta: string };

export function scorecardNudge(opts: {
  weekdayIndex: number; // 0 = Mon … 6 = Sun
  hasScorecard: boolean;
  isScored: boolean;
  activeGoals: number;
}): Nudge | null {
  const { weekdayIndex, hasScorecard, isScored, activeGoals } = opts;
  if (activeGoals === 0) return null;
  if (isScored) return null;
  const daysLeft = 6 - weekdayIndex;
  if (!hasScorecard) {
    if (weekdayIndex >= 4) {
      return {
        level: "urgent",
        title: "Your weekly scorecard isn't started",
        body: `It's ${weekdayIndex === 4 ? "Friday" : weekdayIndex === 5 ? "Saturday" : "Sunday"} — ${daysLeft === 0 ? "last day" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`} to review this week.`,
        cta: "Start this week",
      };
    }
    return {
      level: "info",
      title: "New week, new scorecard",
      body: "Start this week's scorecard so you can track progress as you go.",
      cta: "Start this week",
    };
  }
  if (weekdayIndex >= 4) {
    return {
      level: "warning",
      title: "Finish rating this week",
      body: "Your scorecard is started but not saved yet. Rate each goal to get your weekly score.",
      cta: "Rate goals",
    };
  }
  return null;
}
