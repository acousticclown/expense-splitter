"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMyGroups } from "@/lib/splitter";
import type { Group } from "@/lib/types";
import { Loader } from "@/components/ui/Loader";
import { EmptyStage } from "@/components/ui/EmptyStage";

type Props = {
  onCreate: () => void;
  refreshKey?: number;
};

export function GroupsList({ onCreate, refreshKey = 0 }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listMyGroups()
      .then(setGroups)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load groups"))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <p className="text-sm font-semibold text-[var(--bad)]">{error}</p>;
  }

  if (!groups.length) {
    return (
      <EmptyStage
        title="No stubs yet"
        action={
          <button type="button" className="btn btn-primary" onClick={onCreate}>
            New stub
          </button>
        }
      />
    );
  }

  return (
    <section aria-label="Your stubs">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h1 className="font-display text-2xl font-800 tracking-tight sm:text-3xl">
          Your stubs
        </h1>
        <button type="button" className="btn btn-ghost text-sm" onClick={onCreate}>
          New stub
        </button>
      </div>
      <ul className="stub-cards">
        {groups.map((g) => (
          <li key={g.id}>
            <Link href={`/g/${g.slug}`} className="stub-card">
              <span className="min-w-0">
                <span className="block truncate font-display text-lg font-800 tracking-tight">
                  {g.name}
                </span>
                <span className="text-xs font-650 text-ink-soft">
                  {g.currency} · {new Date(g.created_at).toLocaleDateString()}
                </span>
              </span>
              <span className="stub-card-open">Open</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
