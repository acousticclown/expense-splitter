export function toCents(amount: number) {
  return Math.round(amount * 100);
}

export function fromCents(cents: number) {
  return cents / 100;
}

export function formatMoney(cents: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(fromCents(cents));
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
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
