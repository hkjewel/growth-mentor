"use client";

import { useActionState, useState } from "react";
import { startScorecardAction } from "@/app/actions";
import { FormMessage, SubmitButton } from "./FormBits";

/** Start a scorecard for a past week (e.g. you forgot to review last week). */
export function BackfillWeek({ max }: { max: string }) {
  const [state, action] = useActionState(startScorecardAction, null);
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        Log a past week
      </button>
    );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label htmlFor="backfill-week" className="sr-only">
        Any day in the week
      </label>
      <input id="backfill-week" type="date" name="week" max={max} required className="input w-auto" />
      <SubmitButton pendingText="Starting…" className="btn btn-primary">
        Start
      </SubmitButton>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
        Cancel
      </button>
      <div className="basis-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
