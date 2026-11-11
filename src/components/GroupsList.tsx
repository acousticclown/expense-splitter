"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMyGroups } from "@/lib/splitter";
import type { Group } from "@/lib/types";

export function GroupsList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyGroups()
      .then(setGroups)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load groups"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-ink-soft">Loading your groups…</p>;
  }

  if (error) {
    return <p className="text-sm font-semibold text-[var(--bad)]">{error}</p>;
  }

  if (!groups.length) {
    return (
      <section>
        <h2 className="font-display text-xl font-700 tracking-tight">Your groups</h2>
        <p className="mt-2 text-sm text-ink-soft">
          No groups yet. Create one below — they stay tied to your account.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-display text-xl font-700 tracking-tight">Your groups</h2>
      <p className="mt-1 text-sm text-ink-soft">Open a past group anytime.</p>
      <ul className="mt-4 divide-y divide-[var(--line)]">
        {groups.map((g) => (
          <li key={g.id}>
            <Link
              href={`/g/${g.slug}`}
              className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
            >
              <span className="min-w-0">
                <span className="block truncate font-700">{g.name}</span>
                <span className="text-xs text-ink-soft">
                  {g.currency} · {new Date(g.created_at).toLocaleDateString()}
                </span>
              </span>
              <span className="text-sm font-700 text-ink-soft">Open →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
