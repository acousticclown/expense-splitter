"use client";

export type TabId = "balances" | "spends" | "people";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "balances",
    label: "Balances",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M3 15.5h14M5 12V8.5M10 12V5.5M15 12V7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "spends",
    label: "Spends",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M4 6.5h12v9H4v-9Zm2.5-3h7L15 6.5H5l1.5-3Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "people",
    label: "People",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="7" cy="7.5" r="2.4" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="13.2" cy="8.2" r="2" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M2.8 15.2c.6-2.2 2.3-3.4 4.2-3.4s3.6 1.2 4.2 3.4M11.4 15.2c.3-1.3 1.2-2.4 2.6-2.4 1.5 0 2.5 1 2.9 2.4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function BottomNav({
  tab,
  onChange,
}: {
  tab: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(242,246,239,0.92)] px-3 pt-2 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "calc(0.55rem + env(safe-area-inset-bottom, 0px))" }}
      aria-label="Group sections"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <li key={t.id}>
              <button
                type="button"
                className={`flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[0.7rem] font-800 tracking-wide transition-colors ${
                  active ? "bg-ink text-[var(--accent)]" : "text-ink-soft"
                }`}
                aria-current={active ? "page" : undefined}
                onClick={() => onChange(t.id)}
              >
                {t.icon}
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
