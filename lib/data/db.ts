import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Server-side Supabase client used by every function in lib/data. */
export async function db() {
  return createClient();
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
