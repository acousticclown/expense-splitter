"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
};

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  required,
  id,
}: Props) {
  const autoId = useId();
  const fieldId = id || autoId;
  const listId = `${fieldId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <span className="label" id={`${fieldId}-label`}>
        {label}
        {required ? " *" : ""}
      </span>
      <button
        id={fieldId}
        type="button"
        className="input flex w-full items-center justify-between gap-3 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${fieldId}-label`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? "font-semibold" : "text-ink-soft"}>
          {selected?.label || placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M3.5 6l4.5 4.5L12.5 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={`${fieldId}-label`}
          className="anim-sheet absolute z-40 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-[var(--line)] bg-white/95 p-1.5 shadow-[0_18px_40px_rgba(16,20,15,0.16)] backdrop-blur-md"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    active
                      ? "bg-ink text-[var(--accent)]"
                      : "hover:bg-mist/80"
                  }`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
