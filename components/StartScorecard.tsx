"use client";

import { useActionState } from "react";
import { startScorecardAction } from "@/app/actions";
import { FormMessage, SubmitButton } from "./FormBits";

export function StartScorecard({ week, label = "Start this week", className }: { week: string; label?: string; className?: string }) {
  const [state, action] = useActionState(startScorecardAction, null);
  return (
    <form action={action} className="flex flex-col items-center gap-2">
      <input type="hidden" name="week" value={week} />
      <SubmitButton pendingText="Starting…" className={className ?? "btn btn-primary px-6 py-2.5 text-base"}>
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
