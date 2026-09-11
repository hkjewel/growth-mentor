export const CATEGORIES = ["health", "soft_skill", "education"] as const;
export type Category = (typeof CATEGORIES)[number];

export const TIMEFRAMES = ["short_term", "long_term"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  health: "Health",
  soft_skill: "Soft skill",
  education: "Education",
};

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  short_term: "Short-term",
  long_term: "Long-term",
};

export type Vision = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  horizon_years: number;
  created_at: string;
};

export type Goal = {
  id: string;
  user_id: string | null;
  vision_id: string | null;
  title: string;
  category: Category;
  timeframe: Timeframe;
  target_metric: string | null;
  is_active: boolean;
  created_at: string;
};

export type ReviewStatus = "unreviewed" | "approved" | "rejected";

export type WeeklyScorecard = {
  id: string;
  user_id: string | null;
  week_start_date: string;
  overall_score: number | null;
  ai_summary: string | null;
  ai_summary_source: string | null;
  ai_summary_confidence: number | null;
  ai_summary_review_status: ReviewStatus;
  notes: string | null;
  created_at: string;
};

export type ScorecardEntry = {
  id: string;
  scorecard_id: string;
  goal_id: string;
  progress_rating: number;
  note: string | null;
  created_at: string;
};

export type EntryWithGoal = ScorecardEntry & { goal: Goal | null };

export type ScorecardWithEntries = WeeklyScorecard & { entries: EntryWithGoal[] };

/** Result shape returned by every server action so forms can show errors. */
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
