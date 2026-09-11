"use client";

import { createContext, useContext, useState } from "react";

const ClosePanel = createContext<(() => void) | null>(null);

/** Forms inside a CreatePanel call this after a successful save. */
export function useClosePanel() {
  return useContext(ClosePanel);
}

/** A "New X" button that expands an inline create panel. */
export function CreatePanel({
  label,
  title,
  defaultOpen = false,
  children,
}: {
  label: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        <span aria-hidden>+</span> {label}
      </button>
    );
  }
  return (
    <div className="card w-full p-5 ring-2 ring-brand-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-900">{title}</h2>
        <button type="button" className="btn btn-ghost px-2 py-1" onClick={() => setOpen(false)} aria-label="Close">
          ✕
        </button>
      </div>
      <ClosePanel.Provider value={() => setOpen(false)}>{children}</ClosePanel.Provider>
    </div>
  );
}
