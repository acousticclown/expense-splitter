"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addExpense,
  addMember,
  computeBalances,
  getGroupBySlug,
  recordSettlement,
} from "@/lib/splitter";
import { formatMoney } from "@/lib/money";
import type {
  ExpenseWithShares,
  Group,
  Member,
  Settlement,
} from "@/lib/types";

export function GroupWorkspace({ slug }: { slug: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithShares[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitIds, setSplitIds] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const data = await getGroupBySlug(slug);
    if (!data) {
      setError("Group not found");
      setLoading(false);
      return;
    }
    setGroup(data.group);
    setMembers(data.members);
    setExpenses(data.expenses);
    setSettlements(data.settlements);
    setPaidBy((prev) => prev || data.members[0]?.id || "");
    setSplitIds((prev) =>
      prev.length ? prev : data.members.map((m) => m.id),
    );
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    reload().catch((e) => {
      setError(e instanceof Error ? e.message : "Failed to load");
      setLoading(false);
    });
  }, [reload]);

  const { balances, transfers } = useMemo(
    () => computeBalances(members, expenses, settlements),
    [members, expenses, settlements],
  );

  async function onAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!group) return;
    setBusy(true);
    setError(null);
    try {
      await addExpense({
        groupId: group.id,
        description: desc,
        amount: Number(amount),
        paidBy,
        splitAmong: splitIds,
      });
      setDesc("");
      setAmount("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add expense");
    } finally {
      setBusy(false);
    }
  }

  async function onAddPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!group || !newPerson.trim()) return;
    setBusy(true);
    try {
      const m = await addMember(group.id, newPerson);
      setNewPerson("");
      setSplitIds((ids) => [...ids, m.id]);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add person");
    } finally {
      setBusy(false);
    }
  }

  async function onSettle(t: {
    fromId: string;
    toId: string;
    amountCents: number;
  }) {
    if (!group) return;
    setBusy(true);
    try {
      await recordSettlement({
        groupId: group.id,
        fromMember: t.fromId,
        toMember: t.toId,
        amount: t.amountCents / 100,
        note: "Marked settled",
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settle failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="shell py-16 text-ink-soft" aria-busy>
        Loading group…
      </p>
    );
  }
  if (!group) {
    return <p className="shell py-16 text-[var(--bad)]">{error || "Not found"}</p>;
  }

  const currency = group.currency;

  return (
    <main className="shell space-y-8 py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-700 uppercase tracking-wide text-ink-soft">
            Expense Splitter
          </p>
          <h1 className="font-display text-4xl font-700 tracking-tight text-ink sm:text-5xl">
            {group.name}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Share this link with the group — changes sync live.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost text-sm"
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
          }}
        >
          Copy link
        </button>
      </header>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      )}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="panel">
          <h2 className="font-display text-2xl font-700">Balances</h2>
          <ul className="mt-4 space-y-2">
            {balances.map((b) => (
              <li
                key={b.memberId}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-semibold">{b.name}</span>
                <span
                  className={
                    b.netCents > 1
                      ? "font-700 text-[var(--good)]"
                      : b.netCents < -1
                        ? "font-700 text-[var(--bad)]"
                        : "text-ink-soft"
                  }
                >
                  {b.netCents > 1
                    ? `gets ${formatMoney(b.netCents, currency)}`
                    : b.netCents < -1
                      ? `owes ${formatMoney(-b.netCents, currency)}`
                      : "settled"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h2 className="font-display text-2xl font-700">Settle up</h2>
          {!transfers.length ? (
            <p className="mt-4 text-sm text-ink-soft">All square — nice.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {transfers.map((t) => (
                <li
                  key={`${t.fromId}-${t.toId}-${t.amountCents}`}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span>
                    <strong>{t.fromName}</strong> → <strong>{t.toName}</strong>{" "}
                    {formatMoney(t.amountCents, currency)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ink px-3 py-1.5 text-xs"
                    disabled={busy}
                    onClick={() => onSettle(t)}
                  >
                    Mark paid
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="font-display text-2xl font-700">Add expense</h2>
        <form onSubmit={onAddExpense} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="desc">
              Description
            </label>
            <input
              id="desc"
              className="input"
              required
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Dinner, cab, groceries…"
            />
          </div>
          <div>
            <label className="label" htmlFor="amount">
              Amount ({currency})
            </label>
            <input
              id="amount"
              className="input"
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="paidBy">
              Paid by
            </label>
            <select
              id="paidBy"
              className="select"
              required
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <p className="label">Split among</p>
            <div className="flex flex-wrap gap-3">
              {members.map((m) => {
                const checked = splitIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      checked
                        ? "border-accent bg-accent text-white"
                        : "border-[var(--line)] bg-white/70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() =>
                        setSplitIds((ids) =>
                          checked
                            ? ids.filter((id) => id !== m.id)
                            : [...ids, m.id],
                        )
                      }
                    />
                    {m.name}
                  </label>
                );
              })}
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary sm:col-span-2"
            disabled={busy}
          >
            {busy ? "Saving…" : "Add expense"}
          </button>
        </form>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
        <div className="panel">
          <h2 className="font-display text-2xl font-700">Expenses</h2>
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold">{e.description}</p>
                  <p className="text-ink-soft">
                    Paid by {e.payer_name || "someone"} ·{" "}
                    {new Date(e.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-700">{formatMoney(e.amount_cents, currency)}</p>
              </li>
            ))}
            {!expenses.length && (
              <li className="py-6 text-sm text-ink-soft">No expenses yet.</li>
            )}
          </ul>
        </div>

        <div className="panel">
          <h2 className="font-display text-2xl font-700">People</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {members.map((m) => (
              <li key={m.id} className="font-semibold">
                {m.name}
              </li>
            ))}
          </ul>
          <form onSubmit={onAddPerson} className="mt-4 flex gap-2">
            <input
              className="input"
              placeholder="Add person"
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
            />
            <button type="submit" className="btn btn-ink whitespace-nowrap" disabled={busy}>
              Add
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
