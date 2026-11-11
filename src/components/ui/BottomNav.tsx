"use client";

export type TabId = "settle" | "ledger" | "crew";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "settle",
    label: "Settle",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M3.5 10h13M10 3.5v13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="10" cy="10" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: "ledger",
    label: "Ledger",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M4 5.5h12M4 10h12M4 14.5h8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "crew",
    label: "Crew",
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
    <nav className="dock md:hidden" aria-label="Group sections">
      <ul className="dock-list">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <li key={t.id}>
              <button
                type="button"
                className="dock-btn"
                aria-current={active ? "page" : undefined}
                onClick={() => onChange(t.id)}
              >
                {t.icon}
                {t.label}
                <span className="dock-blot" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
