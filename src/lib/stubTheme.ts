export const STUB_THEMES = ["lilac", "mint", "peach", "butter"] as const;
export type StubTheme = (typeof STUB_THEMES)[number];

export function stubThemeFor(seed: string): StubTheme {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return STUB_THEMES[h % STUB_THEMES.length];
}

export const STUB_OPEN_KEY = "stub-ledger-open";

export type StubOpenPayload = {
  slug: string;
  name: string;
  theme: StubTheme;
  currency: string;
};

export function rememberStubOpen(payload: StubOpenPayload) {
  try {
    sessionStorage.setItem(STUB_OPEN_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function takeStubOpen(): StubOpenPayload | null {
  try {
    const raw = sessionStorage.getItem(STUB_OPEN_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STUB_OPEN_KEY);
    return JSON.parse(raw) as StubOpenPayload;
  } catch {
    return null;
  }
}
