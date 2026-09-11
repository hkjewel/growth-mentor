"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { addMissingEntriesAction, removeEntryAction, saveScorecardAction } from "@/app/actions";
import type { ScorecardWithEntries } from "@/types";
import { ActionButton } from "./FormBits";
import { SummaryPanel } from "./SummaryPanel";
import { CategoryBadge, ScoreRing } from "./ui";

const RATING_HINTS: Record<number, string> = {
  1: "Didn't happen",
  3: "Barely moved",
  5: "Some progress",
  7: "Solid week",
  9: "Crushed it",
  10: "10x week",
};

function RatingPicker({
  entryId,
  value,
  onChange,
  invalid,
}: {
  entryId: string;
  value: number | null;
  onChange: (v: number) => void;
  invalid: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Progress rating 1 to 10" aria-invalid={invalid}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const on = value === n;
          const tone = n >= 8 ? "peer-checked:bg-brand-600 peer-checked:border-brand-600" : n >= 5 ? "peer-checked:bg-amber-500 peer-checked:border-amber-500" : "peer-checked:bg-red-500 peer-checked:border-red-500";
          return (
            <label key={n} className="cursor-pointer" title={RATING_HINTS[n]}>
              <input
                type="radio"
                name={`rating_${entryId}`}
                value={n}
                checked={on}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <span
                className={`grid h-9 w-9 place-items-center rounded-lg border text-sm font-semibold tabular-nums transition peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 ${tone} ${
                  invalid ? "border-red-300 bg-red-50 text-red-700" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {n}
              </span>
            </label>
          );
        })}
      </div>
      <p className={`mt-1 h-4 text-xs ${invalid ? "text-red-700" : "text-neutral-500"}`}>
        {invalid ? "Rating must be 1–10" : value ? (RATING_HINTS[value] ?? RATING_HINTS[value - 1] ?? "") : ""}
      </p>
    </div>
  );
}

export function ScorecardForm({
  card,
  missingGoals,
  aiEnabled,
}: {
  card: ScorecardWithEntries;
  missingGoals: number;
  aiEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(saveScorecardAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const reflectionRef = useRef<HTMLTextAreaElement>(null);
  const saved = card.overall_score != null;

  // Unsaved weeks start unrated so the user has to consciously pick each score.
  const [ratings, setRatings] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(card.entries.map((e) => [e.id, saved ? e.progress_rating : null])),
  );
  // Controlled so a failed save (and React's post-action form reset) never loses typed notes.
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(card.entries.map((e) => [e.id, e.note ?? ""])),
  );
  const [reflection, setReflection] = useState(card.notes ?? "");
  const [showInvalid, setShowInvalid] = useState(false);
  const [, startTransition] = useTransition();

  const current = card.entries.map((e) => ratings[e.id] ?? null);
  const rated = current.filter((r): r is number => r != null);
  const preview = rated.length ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10 : null;
  const complete = rated.length === card.entries.length;
  const dirty = useMemo(
    () =>
      reflection !== (card.notes ?? "") ||
      card.entries.some(
        (e) => (ratings[e.id] ?? null) !== (saved ? e.progress_rating : null) || (notes[e.id] ?? "") !== (e.note ?? ""),
      ),
    [ratings, notes, reflection, card.entries, card.notes, saved],
  );

  // Submit manually (not via <form action>) so React doesn't auto-reset the
  // form afterwards — that reset would visually clear the controlled rating radios.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!complete) {
      setShowInvalid(true);
      return;
    }
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  }

  if (card.entries.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-semibold text-neutral-900">This scorecard has no goals.</p>
        <p className="mt-1 text-sm text-neutral-500">Add your active goals to rate them for this week.</p>
        <div className="mt-4 flex justify-center gap-2">
          {missingGoals > 0 ? (
            <ActionButton className="btn btn-primary" action={() => addMissingEntriesAction(card.id)} pendingText="Adding…">
              Add {missingGoals} active goal{missingGoals === 1 ? "" : "s"}
            </ActionButton>
          ) : (
            <Link href="/goals" className="btn btn-primary">
              Add goals first
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <input type="hidden" name="scorecard_id" value={card.id} />
      <div className="space-y-4">
        {missingGoals > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <span>
              {missingGoals} active goal{missingGoals === 1 ? " isn't" : "s aren't"} on this scorecard yet.
            </span>
            <ActionButton className="btn btn-secondary py-1.5" action={() => addMissingEntriesAction(card.id)} pendingText="Adding…">
              Add to this week
            </ActionButton>
          </div>
        )}
        <ol className="space-y-3">
          {card.entries.map((entry, idx) => {
            const invalid = showInvalid && ratings[entry.id] == null;
            return (
              <li key={entry.id} className={`card p-5 ${invalid ? "ring-2 ring-red-200" : ""}`}>
                <input type="hidden" name="entry_id" value={entry.id} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-neutral-400">Goal {idx + 1}</p>
                    <h3 className="font-semibold text-neutral-900">
                      {entry.goal ? (
                        <Link href={`/goals/${entry.goal.id}`} className="hover:underline">
                          {entry.goal.title}
                        </Link>
                      ) : (
                        "Deleted goal"
                      )}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      {entry.goal && <CategoryBadge category={entry.goal.category} />}
                      {entry.goal?.target_metric && <span>Target: {entry.goal.target_metric}</span>}
                    </div>
                  </div>
                  <ActionButton
                    className="btn btn-ghost px-2 py-1 text-xs"
                    confirmText="Remove this goal from this week's scorecard?"
                    pendingText="…"
                    action={() => removeEntryAction(card.id, entry.id)}
                    title="Remove from this week"
                  >
                    Remove
                  </ActionButton>
                </div>
                <div className="mt-4">
                  <RatingPicker
                    entryId={entry.id}
                    value={ratings[entry.id] ?? null}
                    invalid={invalid}
                    onChange={(v) => setRatings((r) => ({ ...r, [entry.id]: v }))}
                  />
                </div>
                <label htmlFor={`note_${entry.id}`} className="sr-only">
                  Note for {entry.goal?.title}
                </label>
                <input
                  id={`note_${entry.id}`}
                  name={`note_${entry.id}`}
                  value={notes[entry.id] ?? ""}
                  onChange={(ev) => setNotes((n) => ({ ...n, [entry.id]: ev.target.value }))}
                  maxLength={500}
                  placeholder="Short note — what happened this week?"
                  className="input mt-2"
                />
              </li>
            );
          })}
        </ol>
        <div className="card p-5">
          <label htmlFor="notes" className="label">
            Weekly reflection
          </label>
          <textarea
            ref={reflectionRef}
            id="notes"
            name="notes"
            rows={3}
            value={reflection}
            onChange={(ev) => setReflection(ev.target.value)}
            maxLength={2000}
            placeholder="What moved you toward your 10-year vision? What will you do 10x differently next week?"
            className="input"
          />
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Overall weekly score</p>
          <div className="mt-3 flex items-center gap-4">
            <ScoreRing score={dirty || !saved ? preview : card.overall_score} />
            <div className="text-sm text-neutral-600">
              <p>
                <strong className="text-neutral-900">{rated.length}</strong> of {card.entries.length} rated
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {saved && !dirty ? "Saved" : dirty ? "Unsaved changes" : "Not saved yet"}
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <button type="submit" className="btn btn-primary w-full" disabled={pending} aria-busy={pending}>
              {pending ? "Saving…" : "Save scorecard"}
            </button>
            {showInvalid && !complete && (
              <p className="text-sm text-red-700" role="alert">
                Rating must be 1–10 for every goal.
              </p>
            )}
            {state && !state.ok && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
                <p>{state.error}</p>
                <button type="button" className="btn btn-secondary mt-2 py-1.5" onClick={() => formRef.current?.requestSubmit()}>
                  Retry
                </button>
              </div>
            )}
            {state?.ok && !dirty && (
              <p className="rounded-lg bg-brand-50 p-3 text-sm font-medium text-brand-800" role="status">
                {state.message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <SummaryPanel
            card={card}
            saved={saved}
            aiEnabled={aiEnabled}
            onUseAsReflection={(text) => {
              setReflection(text);
              reflectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              reflectionRef.current?.focus();
            }}
          />
        </div>
      </aside>
    </form>
  );
}
