import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Liveness + database round-trip time (no data returned). */
export async function GET() {
  const started = Date.now();
  let db: "ok" | "error" = "ok";
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("visions").select("id", { head: true, count: "exact" }).limit(1);
    if (error) db = "error";
  } catch {
    db = "error";
  }
  return NextResponse.json({
    status: db === "ok" ? "ok" : "degraded",
    db,
    db_ms: Date.now() - started,
    region: process.env.VERCEL_REGION ?? "local",
    timestamp: new Date().toISOString(),
  });
}
