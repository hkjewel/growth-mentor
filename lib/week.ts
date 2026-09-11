import "server-only";
import { cookies } from "next/headers";
import { mondayOf, todayInTz, TZ_COOKIE, weekdayIndex } from "@/lib/dates";

/** "Today" and "this week" in the visitor's time zone (set by a cookie from the browser). */
export async function currentWeek() {
  const store = await cookies();
  const tz = store.get(TZ_COOKIE)?.value || "UTC";
  const today = todayInTz(decodeURIComponent(tz));
  return { today, weekStart: mondayOf(today), weekday: weekdayIndex(today) };
}
