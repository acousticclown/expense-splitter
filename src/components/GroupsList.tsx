"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { listMyGroups } from "@/lib/splitter";
import type { Group } from "@/lib/types";
import { formatStubDates } from "@/lib/stubKind";
import {
  rememberStubOpen,
  stubThemeFor,
  type StubTheme,
} from "@/lib/stubTheme";
import { Loader } from "@/components/ui/Loader";
import { EmptyStage } from "@/components/ui/EmptyStage";

type Props = {
  onCreate: () => void;
  refreshKey?: number;
};

export function GroupsList({ onCreate, refreshKey = 0 }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listMyGroups()
      .then(setGroups)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load groups"))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  function openStub(group: Group, theme: StubTheme) {
    if (openingId) return;
    setOpeningId(group.id);
    rememberStubOpen({
      slug: group.slug,
      name: group.name,
      theme,
      currency: group.currency,
    });

    const href = `/g/${group.slug}`;
    const go = () => {
      startTransition(() => {
        router.push(href);
      });
    };

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<unknown> };
    };

    if (typeof doc.startViewTransition === "function") {
      const vt = doc.startViewTransition(go);
      void vt.finished.catch(() => undefined);
      return;
    }

    window.setTimeout(go, 420);
  }

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
          <button type="button" className="btn-boxy-split" onClick={onCreate}>
            <span className="btn-boxy-split-label">New stub</span>
            <span className="btn-boxy-split-arrow" aria-hidden>
              →
            </span>
          </button>
        }
      />
    );
  }

  return (
    <section aria-label="Your stubs" className="stub-stage">
      <div className="stub-stage-head">
        <div>
          <p className="stub-stage-kicker">Library</p>
          <h1 className="font-display text-2xl font-800 tracking-tight sm:text-3xl">
            Your stubs
          </h1>
        </div>
        <button type="button" className="btn-boxy-split stub-stage-new" onClick={onCreate}>
          <span className="btn-boxy-split-label">New stub</span>
          <span className="btn-boxy-split-arrow" aria-hidden>
            →
          </span>
        </button>
      </div>

      <ul className="stub-covers">
        {groups.map((g, index) => {
          const theme = stubThemeFor(g.id || g.slug);
          const opening = openingId === g.id;
          return (
            <li key={g.id} className={`stub-cover-slot tilt-${(index % 4) + 1}`}>
              <button
                type="button"
                className={`stub-cover theme-${theme}${opening ? " is-opening" : ""}`}
                style={
                  opening
                    ? ({ viewTransitionName: "stub-cover" } as CSSProperties)
                    : undefined
                }
                onClick={() => openStub(g, theme)}
              >
                <span className="stub-cover-art" aria-hidden>
                  <span className="stub-orb stub-orb-a" />
                  <span className="stub-orb stub-orb-b" />
                  <span className="stub-orb stub-orb-c" />
                  <span className="stub-ticket-bite" />
                </span>
                <span className="stub-cover-body">
                  <span className="stub-cover-meta">
                    <span className="stub-chip">
                      {(g.stub_kind || "group") === "event" ? "Event" : "Group"}
                    </span>
                    <span className="stub-chip stub-chip-soft">{g.currency}</span>
                    <span className="stub-chip stub-chip-soft">
                      {formatStubDates(g) ||
                        new Date(g.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                    </span>
                  </span>
                  <span className="stub-cover-title">{g.name}</span>
                  <span className="stub-cover-cta">
                    <span className="btn-boxy-split-label">Open stub</span>
                    <span className="btn-boxy-split-arrow" aria-hidden>
                      →
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
