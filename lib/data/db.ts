import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Server-side Supabase client used by every function in lib/data. */
export async function db() {
  return createClient();
}

export type Viewer = { id: string; email: string | null } | null;

/** The signed-in user for this request, or null for anonymous demo visitors. */
export const currentViewer = cache(async (): Promise<Viewer> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  } catch {
    return null;
  }
});

/** Owner of new rows + the scope every query is filtered by (null = shared demo data). */
export async function ownerId(): Promise<string | null> {
  return (await currentViewer())?.id ?? null;
}

type Filterable = { eq(column: string, value: string): unknown; is(column: string, value: null): unknown };

/**
 * Restrict a query to the current owner's rows. RLS enforces this too; the
 * explicit filter keeps a mentor's own views from mixing in students' rows
 * (which RLS lets mentors read).
 */
export function scoped<Q>(query: Q, owner: string | null): Q {
  // Typed loosely on purpose: Supabase's builder generics make a structural
  // constraint here blow up the type checker (TS2589).
  const q = query as unknown as Filterable;
  return (owner ? q.eq("user_id", owner) : q.is("user_id", null)) as Q;
}

export class DataError extends Error {}

/** Throw a friendly error when a Supabase call fails. */
export function check<T>(result: { data: T; error: { message: string; code?: string } | null }, what: string): T {
  if (result.error) {
    console.error(`[data] ${what}:`, result.error.message);
    throw new DataError(`Could not ${what} — please try again.`);
  }
  return result.data;
}
