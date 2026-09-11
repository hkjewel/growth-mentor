"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteVisionAction } from "@/app/actions";
import type { Goal, Vision } from "@/types";
import { ActionButton } from "./FormBits";
import { VisionForm } from "./VisionForm";

export function VisionCard({ vision, goals }: { vision: Vision; goals: Goal[] }) {
  const [editing, setEditing] = useState(false);
  const active = goals.filter((g) => g.is_active).length;

  if (editing) {
    return (
      <div className="card p-5 ring-2 ring-brand-200">
        <VisionForm vision={vision} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <article className="card overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-brand-400 via-brand-500 to-sky-500" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              {vision.horizon_years}-year vision
            </p>
            <h2 className="mt-1 text-lg font-bold text-neutral-900">{vision.title}</h2>
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" className="btn btn-ghost px-3 py-1.5" onClick={() => setEditing(true)}>
              Edit
            </button>
            <ActionButton
              className="btn btn-danger px-3 py-1.5"
              pendingText="Deleting…"
              confirmText={`Delete "${vision.title}"? Its ${goals.length} goal(s) and their ratings will be deleted too.`}
              action={() => deleteVisionAction(vision.id)}
            >
              Delete
            </ActionButton>
          </div>
        </div>
        {vision.description && <p className="mt-3 text-sm leading-relaxed text-neutral-600">{vision.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-100 pt-4 text-sm">
          <span className="text-neutral-500">
            <strong className="text-neutral-900">{active}</strong> active goal{active === 1 ? "" : "s"}
          </span>
          {goals.slice(0, 3).map((g) => (
            <Link key={g.id} href={`/goals/${g.id}`} className="truncate text-brand-700 hover:underline">
              {g.title}
            </Link>
          ))}
          <Link href={`/goals?vision=${vision.id}&new=1`} className="ml-auto font-medium text-brand-700 hover:underline">
            + Add goal
          </Link>
        </div>
      </div>
    </article>
  );
}
