"use client";

import { useState } from "react";
import {
  crewKey,
  parseCrewInput,
  type CrewDraft,
} from "@/lib/crew";

export function CrewEditor({
  value,
  onChange,
  helper = "Email invites claim on signup.",
}: {
  value: CrewDraft[];
  onChange: (next: CrewDraft[]) => void;
  helper?: string;
}) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function add() {
    const parsed = parseCrewInput(draft);
    if (!parsed) return;
    const key = crewKey(parsed);
    if (value.some((c) => c.key === key || (c.email && parsed.email && c.email === parsed.email))) {
      setLocalError("Already on the crew");
      return;
    }
    if (
      value.some(
        (c) =>
          c.status !== "pending" &&
          c.name.toLowerCase() === parsed.name.toLowerCase() &&
          !parsed.email,
      )
    ) {
      setLocalError("Already on the crew");
      return;
    }
    setLocalError(null);
    onChange([...value, { ...parsed, key }]);
    setDraft("");
  }

  return (
    <div className="crew-editor">
      <p className="label">Crew</p>
      {value.length > 0 && (
        <ul className="crew-chips">
          {value.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                className={`crew-chip ${c.status === "pending" ? "is-pending" : ""} ${
                  c.status === "self" ? "is-self" : ""
                }`}
                onClick={() => {
                  if (c.status === "self" && value.length === 1) return;
                  onChange(value.filter((x) => x.key !== c.key));
                }}
                aria-label={`Remove ${c.name}`}
              >
                <span className="crew-chip-name">{c.name}</span>
                {c.status === "pending" && c.email ? (
                  <span className="crew-chip-meta">{c.email}</span>
                ) : null}
                {c.status === "pending" ? (
                  <span className="crew-chip-badge">Pending</span>
                ) : null}
                <span className="crew-chip-x" aria-hidden>
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="crew-add">
        <input
          className="input"
          placeholder="Name or email"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (localError) setLocalError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          aria-label="Add crew by name or email"
        />
        <button type="button" className="btn btn-ink shrink-0 px-4" onClick={add}>
          Add
        </button>
      </div>
      <p className="crew-helper">{helper}</p>
      {localError && (
        <p className="mt-1 text-sm font-semibold text-[var(--bad)]">{localError}</p>
      )}
    </div>
  );
}
