"use client";

import { useState, useTransition } from "react";
import { draftSummaryAction, reviewSummaryAction } from "@/app/actions";
import type { ActionResult, WeeklyScorecard } from "@/types";

const STATUS_STYLE = {
  unreviewed: "bg-amber-100 text-amber-800",
  approved: "bg-brand-100 text-brand-800",
  rejected: "bg-neutral-200 text-neutral-600",
} as const;

const STATUS_LABEL = { unreviewed: "Needs your review", approved: "Approved", rejected: "Rejected" } as const;

/**
 * AI weekly summary. Medium-risk agentic action: the AI (or rule engine) only
 * drafts; nothing is final until the user approves, edits or rejects it.
 */
export function SummaryPanel({
  card,
  saved,
  aiEnabled,
  onUseAsReflection,
}: {
  card: WeeklyScorecard;
  saved: boolean;
  aiEnabled: boolean;
  onUseAsReflection: (text: string) => void;
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(card.ai_summary ?? "");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [lastSummary, setLastSummary] = useState(card.ai_summary);

  // Keep the editor in sync when a new draft arrives from the server.
  if (card.ai_summary !== lastSummary) {
    setLastSummary(card.ai_summary);
    setText(card.ai_summary ?? "");
    setEditing(false);
  }

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setResult(null);
      setResult(await fn());
    });

  const status = card.ai_summary_review_status ?? "unreviewed";
  const isAI = card.ai_summary_source && card.ai_summary_source !== "rules-v1";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Coach summary</p>
        {card.ai_summary && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
        )}
      </div>

      {!card.ai_summary ? (
        <>
          <p className="mt-2 text-sm text-neutral-600">
            {aiEnabled
              ? "Get an AI-drafted recap of your week with one bold focus for next week. You review it before it counts."
              : "Get a drafted recap of your week with one focus for next week. You review it before it counts."}
          </p>
          <button
            type="button"
            className="btn btn-secondary mt-3 w-full"
            disabled={!saved || pending}
            onClick={() => run(() => draftSummaryAction(card.id))}
          >
            {pending ? "Drafting…" : "✨ Draft summary"}
          </button>
          {!saved && <p className="mt-2 text-xs text-neutral-500">Save your ratings first.</p>}
        </>
      ) : (
        <>
          {editing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              className="input mt-3 text-sm"
              aria-label="Edit summary"
            />
          ) : (
            <p className={`mt-3 whitespace-pre-line text-sm leading-relaxed ${status === "rejected" ? "text-neutral-400 line-through" : "text-neutral-700"}`}>
              {card.ai_summary}
            </p>
          )}
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
            <div>
              <dt className="inline">Source: </dt>
              <dd className="inline font-medium text-neutral-700">{isAI ? `AI · ${card.ai_summary_source}` : "Rule engine"}</dd>
            </div>
            {card.ai_summary_confidence != null && (
              <div>
                <dt className="inline">Confidence: </dt>
                <dd className="inline font-medium text-neutral-700">{Math.round(card.ai_summary_confidence * 100)}%</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary px-3 py-1.5"
                  disabled={pending}
                  onClick={() => run(() => reviewSummaryAction(card.id, "approved", text))}
                >
                  Save &amp; approve
                </button>
                <button type="button" className="btn btn-ghost px-3 py-1.5" onClick={() => { setEditing(false); setText(card.ai_summary ?? ""); }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                {status !== "approved" && (
                  <button type="button" className="btn btn-primary px-3 py-1.5" disabled={pending} onClick={() => run(() => reviewSummaryAction(card.id, "approved"))}>
                    Approve
                  </button>
                )}
                <button type="button" className="btn btn-secondary px-3 py-1.5" disabled={pending} onClick={() => setEditing(true)}>
                  Edit
                </button>
                {status !== "rejected" && (
                  <button type="button" className="btn btn-ghost px-3 py-1.5" disabled={pending} onClick={() => run(() => reviewSummaryAction(card.id, "rejected"))}>
                    Reject
                  </button>
                )}
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-xs">
            <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => onUseAsReflection(editing ? text : (card.ai_summary ?? ""))}>
              Use as my reflection ↑
            </button>
            <button
              type="button"
              className="font-medium text-neutral-500 hover:text-neutral-800 hover:underline disabled:opacity-50"
              disabled={pending}
              onClick={() => run(() => draftSummaryAction(card.id))}
            >
              {pending ? "Working…" : "Regenerate"}
            </button>
          </div>
        </>
      )}
      {result && (
        <p className={`mt-3 text-xs ${result.ok ? "text-brand-700" : "text-red-700"}`} role={result.ok ? "status" : "alert"}>
          {result.ok ? result.message : result.error}
        </p>
      )}
    </div>
  );
}
