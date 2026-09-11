"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteGoalAction, toggleGoalAction } from "@/app/actions";
import type { Goal, Vision } from "@/types";
import { ActionButton } from "./FormBits";
import { GoalForm } from "./GoalForm";
import { CategoryBadge, TimeframeBadge, scoreColor } from "./ui";

export function GoalRow({
  goal,
  visions,
  lastRating,
  onDetailPage = false,
}: {
  goal: Goal;
  visions: Vision[];
  lastRating: number | null;
  onDetailPage?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const vision = visions.find((v) => v.id === goal.vision_id);

  if (editing) {
    return (
      <li className="p-5 ring-2 ring-inset ring-brand-200">
        <GoalForm goal={goal} visions={visions} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center ${goal.is_active ? "" : "bg-neutral-50/80"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/goals/${goal.id}`} className={`font-semibold hover:underline ${goal.is_active ? "text-neutral-900" : "text-neutral-500 line-through decoration-neutral-300"}`}>
            {goal.title}
          </Link>
          <CategoryBadge category={goal.category} />
          <TimeframeBadge timeframe={goal.timeframe} />
          {!goal.is_active && (
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">Paused</span>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {goal.target_metric ? <>Target: <span className="text-neutral-700">{goal.target_metric}</span></> : "No target metric"}
          {vision && <> · <span className="text-neutral-500">↳ {vision.title}</span></>}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <span className={`mr-2 w-14 text-right text-sm font-bold tabular-nums ${scoreColor(lastRating)}`} title="Most recent weekly rating">
          {lastRating == null ? "—" : `${lastRating}/10`}
        </span>
        <button type="button" className="btn btn-ghost px-3 py-1.5" onClick={() => setEditing(true)}>
          Edit
        </button>
        <ActionButton
          className="btn btn-ghost px-3 py-1.5"
          pendingText="…"
          action={() => toggleGoalAction(goal.id, !goal.is_active)}
          title={goal.is_active ? "Paused goals are left out of new scorecards" : "Include in new scorecards"}
        >
          {goal.is_active ? "Pause" : "Resume"}
        </ActionButton>
        <ActionButton
          className="btn btn-danger px-3 py-1.5"
          pendingText="Deleting…"
          confirmText={`Delete "${goal.title}"? Its weekly ratings will be deleted too. Tip: use Pause to keep history.`}
          action={() => deleteGoalAction(goal.id, onDetailPage)}
        >
          Delete
        </ActionButton>
      </div>
    </li>
  );
}
