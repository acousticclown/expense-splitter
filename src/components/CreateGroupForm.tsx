"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createGroup } from "@/lib/splitter";
import { Select } from "@/components/ui/Select";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"].map((c) => ({
  value: c,
  label: c,
}));

export function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [draft, setDraft] = useState("");
  const [people, setPeople] = useState<string[]>(["You", "Alex", "Sam"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const canSubmit = useMemo(
    () => name.trim().length > 0 && people.length > 0,
    [name, people],
  );

  function addPerson() {
    const parts = draft
      .split(/,|\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setPeople((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
      }
      return next;
    });
    setDraft("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const { group } = await createGroup({
        name,
        currency,
        members: people,
      });
      router.push(`/g/${group.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create group");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="name">
          Stub title
        </label>
        <input
          id="name"
          className="input"
          required
          placeholder="Goa trip, Flat 4B…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div>
        <p className="label">Crew</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {people.map((p) => (
            <button
              key={p}
              type="button"
              className="chip is-on"
              onClick={() => setPeople((list) => list.filter((x) => x !== p))}
              aria-label={`Remove ${p}`}
            >
              {p}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Add a name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPerson();
              }
            }}
          />
          <button type="button" className="btn btn-ink shrink-0 px-4" onClick={addPerson}>
            Add
          </button>
        </div>
      </div>

      <Select
        label="Currency"
        value={currency}
        onChange={setCurrency}
        options={CURRENCIES}
        required
      />

      {error && <p className="text-sm font-semibold text-[var(--bad)]">{error}</p>}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={pending || !canSubmit}
      >
        {pending ? "Stamping…" : "Tear off stub"}
      </button>
    </form>
  );
}
