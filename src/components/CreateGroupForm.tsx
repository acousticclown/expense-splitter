"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createGroup } from "@/lib/splitter";

export function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [people, setPeople] = useState("You, Alex, Sam");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { group } = await createGroup({
        name,
        currency,
        members: people.split(/,|\n/).map((p) => p.trim()).filter(Boolean),
      });
      router.push(`/g/${group.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create group");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Group name
        </label>
        <input
          id="name"
          className="input"
          required
          placeholder="Goa trip, Flat 4B, Weekend dinner…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="people">
          People (comma-separated)
        </label>
        <textarea
          id="people"
          className="textarea input min-h-24"
          required
          value={people}
          onChange={(e) => setPeople(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="currency">
          Currency
        </label>
        <select
          id="currency"
          className="select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {["INR", "USD", "EUR", "GBP", "AED"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}
