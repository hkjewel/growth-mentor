import { notFound, redirect } from "next/navigation";
import { getScorecard } from "@/lib/data/scorecards";
import { currentWeek } from "@/lib/week";
import { ScorecardView } from "@/components/ScorecardView";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ScorecardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [card, { weekStart }] = await Promise.all([getScorecard(id), currentWeek()]);
  if (!card) notFound();
  if (card.week_start_date === weekStart) redirect("/scorecard");
  return <ScorecardView card={card} isCurrent={false} />;
}
