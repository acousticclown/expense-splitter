"use client";

import { useEffect, useMemo, useState } from "react";
import {
  centsToInput,
  parseMoneyInput,
  splitEqualCents,
  sumRecord,
} from "@/lib/money";
import type { ExpenseWithShares, Member } from "@/lib/types";
import type { ExpenseDraft } from "@/lib/splitter";

type Props = {
  members: Member[];
  currency: string;
  groupId: string;
  initial?: ExpenseWithShares | null;
  busy?: boolean;
  onSubmit: (draft: ExpenseDraft, expenseId?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function ExpenseForm({
  members,
  currency,
  groupId,
  initial,
  busy,
  onSubmit,
  onDelete,
}: Props) {
  const [desc, setDesc] = useState(initial?.description || "");
  const [amount, setAmount] = useState(
    initial ? centsToInput(initial.amount_cents) : "",
  );
  const [payerIds, setPayerIds] = useState<string[]>(() => {
    if (initial?.payments?.length) return initial.payments.map((p) => p.member_id);
    if (initial?.paid_by) return [initial.paid_by];
    return members[0] ? [members[0].id] : [];
  });
  const [splitIds, setSplitIds] = useState<string[]>(() => {
    if (initial?.shares?.length) return initial.shares.map((s) => s.member_id);
    return members.map((m) => m.id);
  });
  const [unequalPay, setUnequalPay] = useState(false);
  const [unequalSplit, setUnequalSplit] = useState(false);
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [shareAmounts, setShareAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!initial) return;
    const pays: Record<string, string> = {};
    for (const p of initial.payments || []) {
      pays[p.member_id] = centsToInput(p.paid_cents);
    }
    const shares: Record<string, string> = {};
    for (const s of initial.shares || []) {
      shares[s.member_id] = centsToInput(s.share_cents);
    }
    const payEqual =
      initial.payments.length <= 1 ||
      initial.payments.every((p) => p.paid_cents === initial.payments[0]?.paid_cents);
    const shareEqual =
      initial.shares.length > 0 &&
      Math.max(...initial.shares.map((s) => s.share_cents)) -
        Math.min(...initial.shares.map((s) => s.share_cents)) <=
        1;
    setUnequalPay(initial.payments.length > 1 && !payEqual);
    setUnequalSplit(!shareEqual);
    setPayAmounts(pays);
    setShareAmounts(shares);
  }, [initial]);

  const totalCents = useMemo(() => {
    try {
      return amount.trim() ? parseMoneyInput(amount) : 0;
    } catch {
      return 0;
    }
  }, [amount]);

  useEffect(() => {
    if (!totalCents || unequalPay) return;
    const eq = splitEqualCents(totalCents, payerIds);
    const next: Record<string, string> = {};
    for (const id of payerIds) next[id] = centsToInput(eq[id] || 0);
    setPayAmounts(next);
  }, [totalCents, payerIds, unequalPay]);

  useEffect(() => {
    if (!totalCents || unequalSplit) return;
    const eq = splitEqualCents(totalCents, splitIds);
    const next: Record<string, string> = {};
    for (const id of splitIds) next[id] = centsToInput(eq[id] || 0);
    setShareAmounts(next);
  }, [totalCents, splitIds, unequalSplit]);

  function toggleId(
    id: string,
    list: string[],
    setList: (v: string[]) => void,
  ) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const amountCents = parseMoneyInput(amount);
      const payments: Record<string, number> = {};
      for (const id of payerIds) {
        payments[id] = unequalPay
          ? parseMoneyInput(payAmounts[id] || "0")
          : (splitEqualCents(amountCents, payerIds)[id] || 0);
      }
      const shares: Record<string, number> = {};
      for (const id of splitIds) {
        shares[id] = unequalSplit
          ? parseMoneyInput(shareAmounts[id] || "0")
          : (splitEqualCents(amountCents, splitIds)[id] || 0);
      }
      if (sumRecord(payments) !== amountCents) {
        throw new Error(
          `Payer amounts total ${centsToInput(sumRecord(payments))} — need ${centsToInput(amountCents)}`,
        );
      }
      if (sumRecord(shares) !== amountCents) {
        throw new Error(
          `Split amounts total ${centsToInput(sumRecord(shares))} — need ${centsToInput(amountCents)}`,
        );
      }
      await onSubmit(
        {
          groupId,
          description: desc,
          amountCents,
          payments,
          shares,
        },
        initial?.id,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="exp-desc">
          Description
        </label>
        <input
          id="exp-desc"
          className="input"
          required
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Dinner, cab, groceries…"
        />
      </div>

      <div>
        <label className="label" htmlFor="exp-amount">
          Amount ({currency})
        </label>
        <input
          id="exp-amount"
          className="input"
          required
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => {
            try {
              if (amount.trim()) setAmount(centsToInput(parseMoneyInput(amount)));
            } catch {
              /* keep raw until submit */
            }
          }}
        />
        <p className="mt-1 text-xs text-ink-soft">Exactly 2 decimal places.</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="label mb-0">Paid by</p>
          <button
            type="button"
            className="text-link text-xs"
            onClick={() => {
              setUnequalPay((v) => {
                const next = !v;
                if (next && totalCents && payerIds.length) {
                  const eq = splitEqualCents(totalCents, payerIds);
                  const seeded: Record<string, string> = {};
                  for (const id of payerIds) seeded[id] = centsToInput(eq[id] || 0);
                  setPayAmounts(seeded);
                }
                return next;
              });
            }}
          >
            {unequalPay ? "Equal payments" : "Unequal payments"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const on = payerIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                className={`chip ${on ? "is-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggleId(m.id, payerIds, setPayerIds)}
              >
                {m.name}
              </button>
            );
          })}
        </div>
        {unequalPay && payerIds.length > 0 && (
          <ul className="mt-3 space-y-2">
            {payerIds.map((id) => {
              const m = members.find((x) => x.id === id);
              return (
                <li key={id} className="flex items-center gap-2">
                  <span className="w-24 truncate text-sm font-650">{m?.name}</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={payAmounts[id] || ""}
                    onChange={(e) =>
                      setPayAmounts((prev) => ({ ...prev, [id]: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="label mb-0">Split among</p>
          <button
            type="button"
            className="text-link text-xs"
            onClick={() => setUnequalSplit((v) => !v)}
          >
            {unequalSplit ? "Equal split" : "Unequal split"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const on = splitIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                className={`chip ${on ? "is-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggleId(m.id, splitIds, setSplitIds)}
              >
                {m.name}
              </button>
            );
          })}
        </div>
        {unequalSplit && splitIds.length > 0 && (
          <ul className="mt-3 space-y-2">
            {splitIds.map((id) => {
              const m = members.find((x) => x.id === id);
              return (
                <li key={id} className="flex items-center gap-2">
                  <span className="w-24 truncate text-sm font-650">{m?.name}</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={shareAmounts[id] || ""}
                    onChange={(e) =>
                      setShareAmounts((prev) => ({
                        ...prev,
                        [id]: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="text-sm font-semibold text-[var(--bad)]">{error}</p>}

      <button type="submit" className="btn-boxy-split" disabled={busy}>
        <span className="btn-boxy-split-label">
          {busy ? "Saving…" : initial ? "Save changes" : "Save expense"}
        </span>
        <span className="btn-boxy-split-arrow" aria-hidden>
          →
        </span>
      </button>

      {initial && onDelete && (
        <div className="pt-1">
          {!confirmDelete ? (
            <button
              type="button"
              className="btn btn-ghost w-full text-[var(--bad)]"
              onClick={() => setConfirmDelete(true)}
            >
              Delete expense
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ink flex-1"
                disabled={busy}
                onClick={() => onDelete()}
              >
                Confirm delete
              </button>
              <button
                type="button"
                className="btn btn-ghost flex-1"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
