export function toCents(amount: number) {
  return Math.round(amount * 100);
}

export function fromCents(cents: number) {
  return cents / 100;
}

/** Parse user money input → integer cents. Exactly 0–2 decimal places. */
export function parseMoneyInput(raw: string): number {
  const t = raw.trim().replace(/,/g, "");
  if (!t) throw new Error("Enter an amount");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) {
    throw new Error("Amount must use up to 2 decimal places (e.g. 12.50)");
  }
  const cents = toCents(Number(t));
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  return cents;
}

export function centsToInput(cents: number): string {
  return fromCents(cents).toFixed(2);
}

export function formatMoney(cents: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(fromCents(cents));
  } catch {
    return `${fromCents(cents).toFixed(2)} ${currency}`;
  }
}

/** Split total cents across ids as evenly as possible (remainder by order). */
export function splitEqualCents(totalCents: number, ids: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (!ids.length) return out;
  const base = Math.floor(totalCents / ids.length);
  let rem = totalCents - base * ids.length;
  for (const id of ids) {
    const extra = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    out[id] = base + extra;
  }
  return out;
}

export function sumRecord(map: Record<string, number>) {
  return Object.values(map).reduce((a, b) => a + b, 0);
}

/** Minimize cash flow: who pays whom to settle balances. */
export function settleBalances(
  balances: { memberId: string; name: string; netCents: number }[],
) {
  const debtors = balances
    .filter((b) => b.netCents < -1)
    .map((b) => ({ ...b, left: -b.netCents }))
    .sort((a, b) => b.left - a.left);
  const creditors = balances
    .filter((b) => b.netCents > 1)
    .map((b) => ({ ...b, left: b.netCents }))
    .sort((a, b) => b.left - a.left);

  const transfers: {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    amountCents: number;
  }[] = [];

  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].left, creditors[j].left);
    if (pay > 0) {
      transfers.push({
        fromId: debtors[i].memberId,
        fromName: debtors[i].name,
        toId: creditors[j].memberId,
        toName: creditors[j].name,
        amountCents: pay,
      });
      debtors[i].left -= pay;
      creditors[j].left -= pay;
    }
    if (debtors[i].left <= 1) i += 1;
    if (creditors[j].left <= 1) j += 1;
  }
  return transfers;
}
