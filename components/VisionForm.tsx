"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveVisionAction } from "@/app/actions";
import type { Vision } from "@/types";
import { useClosePanel } from "./Disclosure";
import { FormMessage, SubmitButton } from "./FormBits";

export function VisionForm({ vision, onDone }: { vision?: Vision; onDone?: () => void }) {
  const [state, action] = useActionState(saveVisionAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const closePanel = useClosePanel();

  useEffect(() => {
    if (state?.ok) {
      if (!vision) formRef.current?.reset();
      (onDone ?? closePanel)?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {vision && <input type="hidden" name="id" value={vision.id} />}
      <div>
        <label htmlFor={`v-title-${vision?.id ?? "new"}`} className="label">
          Vision title
        </label>
        <input
          id={`v-title-${vision?.id ?? "new"}`}
          name="title"
          required
          maxLength={200}
          defaultValue={vision?.title}
          placeholder="e.g. Lead AI education globally"
          className="input"
          autoFocus={!vision}
        />
      </div>
      <div>
        <label htmlFor={`v-desc-${vision?.id ?? "new"}`} className="label">
          What does 10x look like?
        </label>
        <textarea
          id={`v-desc-${vision?.id ?? "new"}`}
          name="description"
          rows={3}
          defaultValue={vision?.description ?? ""}
          placeholder="Describe the future you in vivid, ambitious detail. Think 10x, not 10%."
          className="input"
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-32">
          <label htmlFor={`v-h-${vision?.id ?? "new"}`} className="label">
            Horizon (years)
          </label>
          <input
            id={`v-h-${vision?.id ?? "new"}`}
            name="horizon_years"
            type="number"
            min={1}
            max={50}
            defaultValue={vision?.horizon_years ?? 10}
            className="input"
          />
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          {onDone && vision && (
            <button type="button" className="btn btn-ghost" onClick={onDone}>
              Cancel
            </button>
          )}
          <SubmitButton>{vision ? "Save changes" : "Save vision"}</SubmitButton>
        </div>
      </div>
      <FormMessage state={state && !state.ok ? state : null} />
    </form>
  );
}
