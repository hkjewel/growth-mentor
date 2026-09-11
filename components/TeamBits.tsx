"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { acceptInviteAction } from "@/app/actions";
import { FormMessage, SubmitButton } from "./FormBits";

export function JoinTeamForm() {
  const [state, action] = useActionState(acceptInviteAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <label htmlFor="code" className="label">
        Mentor&apos;s invite code
      </label>
      <div className="flex gap-2">
        <input
          id="code"
          name="code"
          required
          maxLength={12}
          placeholder="e.g. K7M2QX9P"
          className="input font-mono uppercase tracking-widest"
          autoComplete="off"
        />
        <SubmitButton pendingText="Joining…">Join</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — code is visible to copy manually */
        }
      }}
      className="rounded-lg bg-neutral-100 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-neutral-900 hover:bg-neutral-200"
      title="Copy code"
    >
      {code} <span className="ml-1 text-xs font-sans font-medium tracking-normal text-neutral-500">{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}
