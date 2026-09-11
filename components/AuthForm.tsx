"use client";

import { useActionState, useState } from "react";
import { signInAction, signUpAction } from "@/app/auth/actions";
import { FormMessage, SubmitButton } from "./FormBits";

export function AuthForm({ next, initialMode = "signin" }: { next: string; initialMode?: "signin" | "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [signInState, signIn] = useActionState(signInAction, null);
  const [signUpState, signUp] = useActionState(signUpAction, null);
  const isSignUp = mode === "signup";
  const state = isSignUp ? signUpState : signInState;

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-6 grid grid-cols-2 rounded-lg bg-neutral-100 p-1 text-sm font-semibold">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md py-2 transition ${mode === m ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            aria-pressed={mode === m}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form action={isSignUp ? signUp : signIn} className="space-y-4" key={mode}>
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={isSignUp ? 8 : undefined}
            required
            className="input"
          />
          {isSignUp && <p className="mt-1 text-xs text-neutral-500">At least 8 characters.</p>}
        </div>
        <SubmitButton className="btn btn-primary w-full" pendingText={isSignUp ? "Creating account…" : "Signing in…"}>
          {isSignUp ? "Create account" : "Sign in"}
        </SubmitButton>
        <FormMessage state={state} />
      </form>
    </div>
  );
}
