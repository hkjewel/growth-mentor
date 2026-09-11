import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORY_LABELS, type ScorecardWithEntries, type Vision } from "@/types";
import { categoryAverages, strongestEntry, trendOf, weakestEntry } from "@/lib/insights";

/**
 * Named tool: draft_weekly_summary. Produces a DRAFT (value + source + confidence);
 * the caller stores it with review_status='unreviewed' and the user approves,
 * edits or rejects it. Works without AI: falls back to a rule-based draft.
 */
export type SummaryDraft = { text: string; source: string; confidence: number };

const MODEL = "claude-opus-5";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type WeekContext = {
  card: ScorecardWithEntries;
  previous: ScorecardWithEntries | null;
  visions: Vision[];
};

/** Deterministic, rule-based summary (v1 intelligence layer). */
export function ruleBasedSummary({ card, previous }: WeekContext): SummaryDraft {
  const { trend, delta } = trendOf(card.overall_score, previous?.overall_score ?? null);
  const weakest = weakestEntry(card.entries);
  const strongest = strongestEntry(card.entries);
  const cats = categoryAverages(card.entries);
  const parts: string[] = [];

  const score = card.overall_score == null ? "unscored" : `${card.overall_score.toFixed(1)}/10`;
  if (trend === "new") parts.push(`You scored ${score} this week.`);
  else if (trend === "improving") parts.push(`You scored ${score}, up ${delta!.toFixed(1)} from your last review — momentum is building.`);
  else if (trend === "declining") parts.push(`You scored ${score}, down ${Math.abs(delta!).toFixed(1)} from your last review.`);
  else parts.push(`You scored ${score}, steady versus your last review.`);

  if (strongest?.goal && strongest.progress_rating >= 7)
    parts.push(`Strongest: "${strongest.goal.title}" (${strongest.progress_rating}/10).`);
  if (weakest?.goal && weakest.id !== strongest?.id)
    parts.push(
      `Needs attention: "${weakest.goal.title}" (${weakest.progress_rating}/10)${weakest.note ? ` — ${weakest.note.replace(/\.$/, "")}` : ""}.`,
    );
  if (cats.length > 1)
    parts.push(`${CATEGORY_LABELS[cats[0].category]} is your weakest area (${cats[0].avg.toFixed(1)} avg).`);
  if (weakest?.goal)
    parts.push(
      `Focus for next week: what would it take to make "${weakest.goal.title}" a 9? Pick one bold action, not a 10% tweak.`,
    );

  return { text: parts.join(" "), source: "rules-v1", confidence: 0.6 };
}

const SYSTEM = `You are Growth Mentor, a direct, encouraging personal growth coach.
The user anchors their life to a long-term vision and rates each goal 1-10 every week.
Write a weekly summary of 3-5 sentences, second person, plain text (no markdown, no lists):
what went well, what needs attention (name the goal), and one specific, ambitious
"10x" focus for next week tied to their vision. Only use facts present in the data.
Also return your confidence (0-1) that the summary is accurate and useful given how
much data there is (sparse notes = lower confidence).`;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["summary", "confidence"],
  additionalProperties: false,
} as const;

async function claudeSummary({ card, previous, visions }: WeekContext): Promise<SummaryDraft> {
  const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  const week = {
    week_start: card.week_start_date,
    overall_score: card.overall_score,
    previous_overall_score: previous?.overall_score ?? null,
    visions: visions.map((v) => ({ title: v.title, horizon_years: v.horizon_years, description: v.description })),
    goals: card.entries.map((e) => ({
      goal: e.goal?.title ?? "(deleted goal)",
      category: e.goal?.category,
      target_metric: e.goal?.target_metric,
      rating: e.progress_rating,
      note: e.note,
      previous_rating: previous?.entries.find((p) => p.goal_id === e.goal_id)?.progress_rating ?? null,
    })),
    reflection: card.notes,
  };

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: `Here is my week as JSON:\n${JSON.stringify(week, null, 2)}` }],
  } as Anthropic.Beta.MessageCreateParamsNonStreaming);

  if (response.stop_reason === "refusal") throw new Error("Model declined to summarize this week.");
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No summary returned.");
  const parsed = JSON.parse(text.text) as { summary: string; confidence: number };
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5));
  return { text: parsed.summary.trim(), source: response.model || MODEL, confidence: Math.round(confidence * 100) / 100 };
}

export async function draftWeeklySummary(ctx: WeekContext): Promise<SummaryDraft> {
  if (!aiEnabled()) return ruleBasedSummary(ctx);
  try {
    return await claudeSummary(ctx);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) console.error("[ai] ANTHROPIC_API_KEY is invalid");
    else if (e instanceof Anthropic.RateLimitError) console.error("[ai] rate limited");
    else if (e instanceof Anthropic.APIError) console.error(`[ai] API error ${e.status}:`, e.message);
    else console.error("[ai] summary failed:", e);
    // Core never depends on AI: degrade to the rule-based draft.
    return ruleBasedSummary(ctx);
  }
}
