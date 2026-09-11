import type { Metadata } from "next";
import { NudgeBanner } from "@/components/NudgeBanner";
import { listVisions } from "@/lib/data/visions";
import { listGoals } from "@/lib/data/goals";
import { PageHeader, EmptyState } from "@/components/ui";
import { CreatePanel } from "@/components/Disclosure";
import { VisionForm } from "@/components/VisionForm";
import { VisionCard } from "@/components/VisionCard";

export const metadata: Metadata = { title: "Vision" };
export const dynamic = "force-dynamic";

export default async function VisionPage() {
  const [visions, goals] = await Promise.all([listVisions(), listGoals()]);

  return (
    <>
      <NudgeBanner compact />
      <PageHeader
        title="Your 10-year vision"
        subtitle="The north star every goal and weekly score is measured against. Think 10x, not 10%."
      />

      <div className="mb-6">
        <CreatePanel label="New Vision" title="Create a vision" defaultOpen={visions.length === 0}>
          <VisionForm />
        </CreatePanel>
      </div>

      {visions.length === 0 ? (
        <EmptyState title="No vision yet. Create your 10-year vision to start." body="Everything else — goals, scorecards, insights — flows from it." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visions.map((v) => (
            <VisionCard key={v.id} vision={v} goals={goals.filter((g) => g.vision_id === v.id)} />
          ))}
        </div>
      )}
    </>
  );
}
