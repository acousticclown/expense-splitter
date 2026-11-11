"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CrewEditor } from "@/components/CrewEditor";
import { Select } from "@/components/ui/Select";
import { selfCrew, type CrewDraft } from "@/lib/crew";
import { ensureProfile, getSessionUser } from "@/lib/auth";
import { createGroup } from "@/lib/splitter";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"].map((c) => ({
  value: c,
  label: c,
}));

export function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [crew, setCrew] = useState<CrewDraft[]>([selfCrew("You")]);
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

  const canSubmit = useMemo(
    () => name.trim().length > 0 && crew.length > 0,
    [name, crew],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const { group } = await createGroup({
        name,
        currency,
        members: crew.map((c) => ({
          name: c.name,
          email: c.email,
          isSelf: c.status === "self",
        })),
      });
      router.push(`/g/${group.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create group");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="stub-form space-y-5">
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
