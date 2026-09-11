import { describe, expect, it } from "vitest";
import type { Category, EntryWithGoal, Goal, ScorecardWithEntries } from "@/types";
import {
  categoryAverages,
  categorySeries,
  goalRatings,
  predictGoal,
  scorecardNudge,
  trendOf,
  weakestEntry,
  weeklyStreak,
} from "@/lib/insights";
import { addDays, mondayOf, todayInTz, weekdayIndex } from "@/lib/dates";

const goal = (id: string, category: Category): Goal => ({
  id,
  user_id: null,
  vision_id: null,
  title: `Goal ${id}`,
  category,
  timeframe: "short_term",
  target_metric: null,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
});

const entry = (id: string, g: Goal, rating: number, scorecard = "s1"): EntryWithGoal => ({
  id,
  scorecard_id: scorecard,
  goal_id: g.id,
  progress_rating: rating,
  note: null,
  created_at: "2026-01-01T00:00:00Z",
  goal: g,
});

const card = (id: string, week: string, score: number | null, entries: EntryWithGoal[]): ScorecardWithEntries => ({
  id,
  user_id: null,
  week_start_date: week,
  overall_score: score,
  ai_summary: null,
  ai_summary_source: null,
  ai_summary_confidence: null,
  ai_summary_review_status: "unreviewed",
  notes: null,
  created_at: "2026-01-01T00:00:00Z",
  entries,
});

const run = goal("run", "health");
const read = goal("read", "education");

describe("PRD success scenario scoring", () => {
  it("rating 8 and 6 gives overall 7.0 and flags reading as weakest", () => {
    const entries = [entry("e1", run, 8), entry("e2", read, 6)];
    const avg = entries.reduce((s, e) => s + e.progress_rating, 0) / entries.length;
    expect(avg).toBe(7);
    expect(weakestEntry(entries)?.goal?.id).toBe("read");
    expect(categoryAverages(entries)).toEqual([
      { category: "education", avg: 6, count: 1 },
      { category: "health", avg: 8, count: 1 },
    ]);
  });
});

describe("trendOf", () => {
  it("classifies improving / declining / steady / new", () => {
    expect(trendOf(8, 7.5)).toEqual({ trend: "improving", delta: 0.5 });
    expect(trendOf(7, 8)).toEqual({ trend: "declining", delta: -1 });
    expect(trendOf(7.1, 7)).toEqual({ trend: "steady", delta: 0.1 });
    expect(trendOf(7, null).trend).toBe("new");
    expect(trendOf(null, 7).trend).toBe("new");
  });
});

describe("weeklyStreak", () => {
  it("counts consecutive weeks, allowing the current week to be unscored", () => {
    expect(weeklyStreak(["2026-09-07", "2026-08-31", "2026-08-24"], "2026-09-07")).toBe(3);
    expect(weeklyStreak(["2026-08-31", "2026-08-24"], "2026-09-07")).toBe(2);
    expect(weeklyStreak(["2026-08-24"], "2026-09-07")).toBe(0);
    expect(weeklyStreak([], "2026-09-07")).toBe(0);
  });
});

describe("predictGoal", () => {
  it("needs two weeks of data", () => {
    expect(predictGoal([7]).likelihood).toBe("not_enough_data");
  });
  it("is on track when strong and rising", () => {
    expect(predictGoal([6, 7, 8, 9]).likelihood).toBe("on_track");
  });
  it("is off track when consistently low", () => {
    expect(predictGoal([3, 2, 3, 2]).likelihood).toBe("off_track");
  });
  it("is at risk when gently slipping from a good level", () => {
    const p = predictGoal([8, 8, 7, 7, 7]);
    expect(p.likelihood).toBe("at_risk");
    expect(p.reason).toMatch(/slipping/);
  });
  it("is off track when falling steeply", () => {
    expect(predictGoal([9, 8, 7, 6, 5]).likelihood).toBe("off_track");
  });
  it("doesn't over-extrapolate from two data points", () => {
    const p = predictGoal([6, 7]);
    expect(p.projected).toBeLessThan(8.5);
  });
  it("keeps projections within 1–10", () => {
    const p = predictGoal([1, 10, 1, 10, 10, 10]);
    expect(p.projected).toBeGreaterThanOrEqual(1);
    expect(p.projected).toBeLessThanOrEqual(10);
  });
});

describe("goalRatings / categorySeries", () => {
  const cards = [
    card("c3", "2026-09-07", null, [entry("x", run, 5, "c3")]), // unscored → ignored
    card("c2", "2026-08-31", 7, [entry("a", run, 8, "c2"), entry("b", read, 6, "c2")]),
    card("c1", "2026-08-24", 6, [entry("c", run, 6, "c1"), entry("d", read, 6, "c1")]),
  ];
  it("returns a goal's ratings oldest first, scored weeks only", () => {
    expect(goalRatings(cards, "run")).toEqual([6, 8]);
  });
  it("builds per-category weekly averages oldest first", () => {
    const s = categorySeries(cards);
    expect(s.map((r) => r.week)).toEqual(["2026-08-24", "2026-08-31"]);
    expect(s[1].health).toBe(8);
    expect(s[1].soft_skill).toBeNull();
  });
});

describe("scorecardNudge (Friday rule)", () => {
  const base = { hasScorecard: false, isScored: false, activeGoals: 2 };
  it("is urgent on Friday when the scorecard isn't started", () => {
    expect(scorecardNudge({ ...base, weekdayIndex: 4 })?.level).toBe("urgent");
  });
  it("is only a gentle reminder early in the week", () => {
    expect(scorecardNudge({ ...base, weekdayIndex: 0 })?.level).toBe("info");
  });
  it("warns on Friday+ when started but not rated", () => {
    expect(scorecardNudge({ ...base, hasScorecard: true, weekdayIndex: 5 })?.level).toBe("warning");
  });
  it("is silent once scored or when there are no goals", () => {
    expect(scorecardNudge({ ...base, hasScorecard: true, isScored: true, weekdayIndex: 6 })).toBeNull();
    expect(scorecardNudge({ ...base, activeGoals: 0, weekdayIndex: 6 })).toBeNull();
  });
});

describe("dates", () => {
  it("finds the Monday of a week", () => {
    expect(mondayOf("2026-09-11")).toBe("2026-09-07"); // Friday
    expect(mondayOf("2026-09-13")).toBe("2026-09-07"); // Sunday
    expect(mondayOf("2026-09-07")).toBe("2026-09-07"); // Monday
    expect(mondayOf("2026-01-01")).toBe("2025-12-29"); // across a year
  });
  it("indexes weekdays Monday=0", () => {
    expect(weekdayIndex("2026-09-11")).toBe(4);
    expect(addDays("2026-09-07", -7)).toBe("2026-08-31");
  });
  it("computes today in a time zone", () => {
    const now = new Date("2026-09-06T20:00:00Z"); // Sunday 20:00 UTC = Monday 02:00 in Dhaka
    expect(todayInTz("UTC", now)).toBe("2026-09-06");
    expect(todayInTz("Asia/Dhaka", now)).toBe("2026-09-07");
  });
});
