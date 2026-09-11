"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Only allow same-site relative redirects. */
function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = str(form, "email");
  const password = str(form, "password");
  if (!email || !password) return { ok: false, error: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      ok: false,
      error: /confirm/i.test(error.message)
        ? "Please confirm your email first — check your inbox for the link."
        : "Wrong email or password.",
    };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(str(form, "next")));
}

export async function signUpAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = str(form, "email");
  const password = str(form, "password");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 8) return { ok: false, error: "Use a password of at least 8 characters." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) return { ok: false, error: error.message };
  if (!data.session) {
    return { ok: true, message: `Almost there — we sent a confirmation link to ${email}. Open it, then sign in.` };
  }
  revalidatePath("/", "layout");
  redirect("/vision");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
