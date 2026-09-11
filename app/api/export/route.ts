import { listScorecardsWithEntries } from "@/lib/data/scorecards";
import { logAudit } from "@/lib/data/audit";
import { CATEGORY_LABELS } from "@/types";

export const dynamic = "force-dynamic";

function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  // Quote everything; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** User-initiated export of the viewer's own scorecard history (never automated). */
export async function GET() {
  const cards = await listScorecardsWithEntries(520);
  const rows = [["week_start", "overall_score", "goal", "category", "target_metric", "rating", "note", "reflection"]];
  for (const c of [...cards].reverse()) {
    if (c.entries.length === 0) rows.push([c.week_start_date, String(c.overall_score ?? ""), "", "", "", "", "", c.notes ?? ""]);
    for (const e of c.entries) {
      rows.push([
        c.week_start_date,
        String(c.overall_score ?? ""),
        e.goal?.title ?? "(deleted goal)",
        e.goal ? CATEGORY_LABELS[e.goal.category] : "",
        e.goal?.target_metric ?? "",
        String(e.progress_rating),
        e.note ?? "",
        c.notes ?? "",
      ]);
    }
  }
  await logAudit("data.exported", "weekly_scorecards", null, { weeks: cards.length });
  const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="growth-mentor-scorecards.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
