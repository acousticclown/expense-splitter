"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMyGroups } from "@/lib/splitter";
import type { Group } from "@/lib/types";
import { Loader } from "@/components/ui/Loader";
import { EmptyStage } from "@/components/ui/EmptyStage";

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
    return <Loader label="Pulling your stubs…" />;
  }

  if (error) {
    return <p className="text-sm font-semibold text-[var(--bad)]">{error}</p>;
  }

  if (!groups.length) {
    return (
      <EmptyStage
        title="No stubs yet"
        body="Tear off a new one below — trips, flatmates, or that one dinner that never settled."
      />
    );
  }

  return (
    <section className="stub">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-800 tracking-tight">Your stubs</h2>
          <p className="mt-1 text-sm text-ink-soft">Open a past group anytime.</p>
        </div>
        <p className="text-xs font-800 uppercase tracking-[0.12em] text-ink-soft">
          {groups.length} open
        </p>
      </div>
      <div className="perforation" aria-hidden />
      <ul>
        {groups.map((g) => (
          <li key={g.id}>
            <Link href={`/g/${g.slug}`} className="stub-row">
              <span className="min-w-0">
                <span className="block truncate font-800 tracking-tight">{g.name}</span>
                <span className="text-xs font-650 text-ink-soft">
                  {g.currency} · {new Date(g.created_at).toLocaleDateString()}
                </span>
              </span>
              <span className="shrink-0 text-sm font-800 text-[var(--accent-deep)]">
                Open →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
