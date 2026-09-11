import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import type { Viewer } from "@/lib/data/db";

/** Sidebar footer: who you are, or an invitation to sign in. Server-rendered. */
export function AccountBox({ viewer }: { viewer: Viewer }) {
  if (!viewer) {
    return (
      <div className="rounded-xl bg-white/5 p-3 text-sm">
        <p className="font-semibold text-white">Demo mode</p>
        <p className="mt-0.5 text-xs text-brand-100/70">You&apos;re using shared sample data.</p>
        <div className="mt-3 flex gap-2">
          <Link href="/login?mode=signup" className="btn flex-1 bg-brand-400 px-2 py-1.5 text-xs text-ink-950 hover:bg-brand-300">
            Sign up
          </Link>
          <Link href="/login" className="btn flex-1 bg-white/10 px-2 py-1.5 text-xs text-white hover:bg-white/15">
            Sign in
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-bold uppercase text-white">
        {(viewer.email ?? "?").slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white" title={viewer.email ?? undefined}>
          {viewer.email}
        </p>
        <form action={signOutAction}>
          <button type="submit" className="text-xs text-brand-200/80 hover:text-white hover:underline">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
