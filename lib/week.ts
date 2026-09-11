import "server-only";
import { cookies } from "next/headers";
import { mondayOf, todayInTz, TZ_COOKIE, weekdayIndex } from "@/lib/dates";


/** The visitor's IANA time zone (set by a cookie from the browser), default UTC. */
export async function visitorTimeZone(): Promise<string> {
  const raw = (await cookies()).get(TZ_COOKIE)?.value;
  const tz = raw ? decodeURIComponent(raw) : "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** "Today" and "this week" in the visitor's time zone. */
export async function currentWeek() {
  const today = todayInTz(await visitorTimeZone());
  return { today, weekStart: mondayOf(today), weekday: weekdayIndex(today) };
}
