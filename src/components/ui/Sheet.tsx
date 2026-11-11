"use client";

import { useEffect, useId } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function Sheet({ open, title, onClose, children }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="anim-fade absolute inset-0 bg-[rgba(16,20,15,0.45)]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="anim-sheet surface absolute inset-x-0 bottom-0 z-10 mx-auto flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col rounded-t-[1.75rem] border-b-0 p-5 shadow-[0_-12px_40px_rgba(16,20,15,0.18)] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-[1.75rem] md:border md:p-6"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-2xl font-700 tracking-tight">
            {title}
          </h2>
          <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
