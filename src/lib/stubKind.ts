export type StubKind = "event" | "group";
export type EventDateMode = "single" | "range";

export function formatStubDates(input: {
  stub_kind?: StubKind | null;
  event_date_mode?: EventDateMode | null;
  starts_on?: string | null;
  ends_on?: string | null;
}): string | null {
  if (input.stub_kind !== "event" || !input.starts_on) return null;
  const start = formatDay(input.starts_on);
  if (!input.ends_on || input.ends_on === input.starts_on || input.event_date_mode === "single") {
    return start;
  }
  return `${start} – ${formatDay(input.ends_on)}`;
}

function formatDay(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function normalizeEventDates(input: {
  mode: EventDateMode;
  startsOn: string;
  endsOn?: string;
}): { mode: EventDateMode; startsOn: string; endsOn: string } {
  const startsOn = input.startsOn.trim();
  if (!startsOn) throw new Error("Pick an event date");
  if (input.mode === "single") {
    return { mode: "single", startsOn, endsOn: startsOn };
  }
  const endsOn = (input.endsOn || "").trim();
  if (!endsOn) throw new Error("Pick an end date");
  if (endsOn < startsOn) throw new Error("End date must be on or after the start");
  return { mode: "range", startsOn, endsOn };
}
