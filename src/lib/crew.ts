export type CrewDraft = {
  key: string;
  name: string;
  email?: string;
  status: "self" | "named" | "pending";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function parseCrewInput(raw: string): Omit<CrewDraft, "key"> | null {
  const value = raw.trim();
  if (!value) return null;

  // "Ada <ada@x.com>" or "ada@x.com"
  const angled = value.match(/^(.+?)\s*<\s*([^>]+@[^>]+)\s*>$/);
  if (angled) {
    const name = angled[1].trim();
    const email = angled[2].trim().toLowerCase();
    return {
      name: name || email.split("@")[0],
      email,
      status: "pending",
    };
  }

  if (isEmail(value)) {
    const email = value.toLowerCase();
    return {
      name: email.split("@")[0],
      email,
      status: "pending",
    };
  }

  return { name: value, status: "named" };
}

export function crewKey(entry: Omit<CrewDraft, "key">) {
  if (entry.email) return `email:${entry.email.toLowerCase()}`;
  return `name:${entry.name.toLowerCase()}`;
}

export function selfCrew(displayName: string, email?: string): CrewDraft {
  const name = displayName.trim() || "You";
  return {
    key: "self",
    name,
    email: email?.toLowerCase() || undefined,
    status: "self",
  };
}
