"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BoxyButton } from "@/components/BoxyButton";
import { CrewEditor } from "@/components/CrewEditor";
import { Select } from "@/components/ui/Select";
import { selfCrew, type CrewDraft } from "@/lib/crew";
import { ensureProfile, getSessionUser } from "@/lib/auth";
import { createGroup } from "@/lib/splitter";
import type { EventDateMode, StubKind } from "@/lib/types";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"].map((c) => ({
  value: c,
  label: c,
}));

type Step = "kind" | "details";

export function CreateGroupForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("kind");
  const [stubKind, setStubKind] = useState<StubKind | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [crew, setCrew] = useState<CrewDraft[]>([selfCrew("You")]);
  const [dateMode, setDateMode] = useState<EventDateMode>("single");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getSessionUser().then(async (u) => {
      if (!u) return;
      const p = await ensureProfile(u);
      setCrew((prev) => {
        const rest = prev.filter((c) => c.status !== "self");
        return [selfCrew(p.display_name || "You", p.email || u.email), ...rest];
      });
    });
  }, []);

  const canSubmit = useMemo(() => {
    if (!stubKind || !name.trim() || !crew.length) return false;
    if (stubKind === "event") {
      if (!startsOn) return false;
      if (dateMode === "range" && !endsOn) return false;
    }
    return true;
  }, [stubKind, name, crew, dateMode, startsOn, endsOn]);

  function pickKind(kind: StubKind) {
    setStubKind(kind);
    setError(null);
    setStep("details");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !stubKind) return;
    setPending(true);
    setError(null);
    try {
      const { group } = await createGroup({
        name,
        currency,
        stubKind,
        eventDateMode: stubKind === "event" ? dateMode : undefined,
        startsOn: stubKind === "event" ? startsOn : undefined,
        endsOn: stubKind === "event" ? (dateMode === "single" ? startsOn : endsOn) : undefined,
        members: crew.map((c) => ({
          name: c.name,
          email: c.email,
          isSelf: c.status === "self",
        })),
      });
      router.push(`/g/${group.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create stub");
      setPending(false);
    }
  }

  if (step === "kind") {
    return (
      <div className="stub-kind-picker space-y-4">
        <p className="text-sm text-ink-soft">
          Events are time-bound. Groups stay open-ended.
        </p>
        <div className="stub-kind-grid">
          <button
            type="button"
            className="stub-kind-card theme-event"
            onClick={() => pickKind("event")}
          >
            <span className="stub-kind-label">Event</span>
            <span className="stub-kind-copy">Trip, dinner, weekend — with dates</span>
          </button>
          <button
            type="button"
            className="stub-kind-card theme-group"
            onClick={() => pickKind("group")}
          >
            <span className="stub-kind-label">Group</span>
            <span className="stub-kind-copy">Flatmates, ongoing crew — no end date</span>
          </button>
        </div>
        {onCancel && (
          <button type="button" className="text-link" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stub-form space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setStep("kind");
            setError(null);
          }}
        >
          ← {stubKind === "event" ? "Event" : "Group"}
        </button>
        <span className="stub-chip">{stubKind === "event" ? "Event" : "Group"}</span>
      </div>

      <div>
        <label className="label" htmlFor="name">
          Stub title
        </label>
        <input
          id="name"
          className="input"
          required
          placeholder={stubKind === "event" ? "Goa weekend…" : "Flat 4B…"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
      </div>

      {stubKind === "event" && (
        <fieldset className="event-dates space-y-3">
          <legend className="label mb-1">When</legend>
          <div className="event-date-mode" role="group" aria-label="Date type">
            <button
              type="button"
              className={`event-date-mode-btn${dateMode === "single" ? " is-on" : ""}`}
              onClick={() => {
                setDateMode("single");
                setEndsOn("");
              }}
            >
              Single day
            </button>
            <button
              type="button"
              className={`event-date-mode-btn${dateMode === "range" ? " is-on" : ""}`}
              onClick={() => setDateMode("range")}
            >
              Start – end
            </button>
          </div>
          <div className={dateMode === "range" ? "event-date-fields" : undefined}>
            <div>
              <label className="label" htmlFor="startsOn">
                {dateMode === "single" ? "Date" : "Starts"}
              </label>
              <input
                id="startsOn"
                className="input"
                type="date"
                required
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            {dateMode === "range" && (
              <div>
                <label className="label" htmlFor="endsOn">
                  Ends
                </label>
                <input
                  id="endsOn"
                  className="input"
                  type="date"
                  required
                  value={endsOn}
                  min={startsOn || undefined}
                  onChange={(e) => setEndsOn(e.target.value)}
                />
              </div>
            )}
          </div>
        </fieldset>
      )}

      <CrewEditor value={crew} onChange={setCrew} />

      <div className="currency-field">
        <Select
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES}
          required
        />
      </div>

      {error && <p className="text-sm font-semibold text-[var(--bad)]">{error}</p>}

      <BoxyButton type="submit" disabled={pending || !canSubmit}>
        {pending ? "Creating…" : "Tear off stub"}
      </BoxyButton>
    </form>
  );
}
