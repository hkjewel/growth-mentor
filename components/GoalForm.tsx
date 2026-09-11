"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveGoalAction } from "@/app/actions";
import { CATEGORIES, CATEGORY_LABELS, TIMEFRAMES, TIMEFRAME_LABELS, type Goal, type Vision } from "@/types";
import { useClosePanel } from "./Disclosure";
import { FormMessage, SubmitButton } from "./FormBits";

function Segmented({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="peer sr-only" required />
          <span className="inline-block rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-800 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 hover:bg-neutral-50">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function GoalForm({
  goal,
  visions,
  defaultVisionId,
  onDone,
}: {
  goal?: Goal;
  visions: Vision[];
  defaultVisionId?: string;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(saveGoalAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const closePanel = useClosePanel();
  const key = goal?.id ?? "new";

  useEffect(() => {
    if (state?.ok) {
      if (!goal) formRef.current?.reset();
      (onDone ?? closePanel)?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`g-title-${key}`} className="label">
            Goal
          </label>
          <input
            id={`g-title-${key}`}
            name="title"
            required
            maxLength={200}
            defaultValue={goal?.title}
            placeholder="e.g. Run 3x/week"
            className="input"
            autoFocus={!goal}
          />
        </div>
        <div>
          <span className="label">Category</span>
          <Segmented
            name="category"
            defaultValue={goal?.category ?? "health"}
            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
          />
        </div>
        <div>
          <span className="label">Timeframe</span>
          <Segmented
            name="timeframe"
            defaultValue={goal?.timeframe ?? "short_term"}
            options={TIMEFRAMES.map((t) => ({ value: t, label: TIMEFRAME_LABELS[t] }))}
          />
        </div>
        <div>
          <label htmlFor={`g-metric-${key}`} className="label">
            Target metric
          </label>
          <input
            id={`g-metric-${key}`}
            name="target_metric"
            maxLength={120}
            defaultValue={goal?.target_metric ?? ""}
            placeholder="e.g. 150 min/week"
            className="input"
          />
        </div>
        <div>
          <label htmlFor={`g-vision-${key}`} className="label">
            Linked vision
          </label>
          <select
            id={`g-vision-${key}`}
            name="vision_id"
            defaultValue={goal?.vision_id ?? defaultVisionId ?? visions[0]?.id ?? ""}
            className="input"
          >
            <option value="">— No vision —</option>
            {visions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <FormMessage state={state && !state.ok ? state : null} />
        <div className="ml-auto flex gap-2">
          {onDone && goal && (
            <button type="button" className="btn btn-ghost" onClick={onDone}>
              Cancel
            </button>
          )}
          <SubmitButton>{goal ? "Save changes" : "Save goal"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
