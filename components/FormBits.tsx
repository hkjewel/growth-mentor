"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/types";

export function SubmitButton({
  children,
  pendingText = "Saving…",
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok)
    return state.message ? (
      <p className="text-sm font-medium text-brand-700" role="status">
        {state.message}
      </p>
    ) : null;
  return (
    <p className="text-sm font-medium text-red-700" role="alert">
      {state.error}
    </p>
  );
}

/** A button that runs a server action, optionally after a confirm() prompt. */
export function ActionButton({
  action,
  confirmText,
  children,
  className = "btn btn-ghost",
  pendingText,
  title,
}: {
  action: () => Promise<ActionResult | void>;
  confirmText?: string;
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        className={className}
        disabled={pending}
        title={title}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          setError(null);
          start(async () => {
            const res = await action();
            if (res && !res.ok) setError(res.error);
          });
        }}
      >
        {pending ? (pendingText ?? "Working…") : children}
      </button>
      {error && (
        <span className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
