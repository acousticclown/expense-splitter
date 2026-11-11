"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addExpense,
  addMember,
  computeBalances,
  getGroupBySlug,
  recordSettlement,
} from "@/lib/splitter";
import { formatMoney, toCents } from "@/lib/money";
import type {
  ExpenseWithShares,
  Group,
  Member,
  Settlement,
} from "@/lib/types";
import { BottomNav, type TabId } from "@/components/ui/BottomNav";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";

export function GroupWorkspace({ slug }: { slug: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithShares[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("balances");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
    if (!paidBy || !splitIds.length) {
      setError("Pick who paid and who shares the split");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await addExpense({
        groupId: group.id,
        description: desc,
        amount: Number(amount),
        paidBy,
        splitAmong: splitIds,
      });
      const cents = toCents(Number(amount));
      const n = splitIds.length;
      const base = Math.floor(cents / n);
      let remainder = cents - base * n;
      const optimistic: ExpenseWithShares = {
        ...saved,
        payer_name: members.find((m) => m.id === paidBy)?.name,
        shares: splitIds.map((memberId) => {
          const extra = remainder > 0 ? 1 : 0;
          if (remainder > 0) remainder -= 1;
          return { expense_id: saved.id, member_id: memberId, share_cents: base + extra };
        }),
      };
      setExpenses((prev) => [optimistic, ...prev.filter((x) => x.id !== saved.id)]);
      setDesc("");
      setAmount("");
      setSheetOpen(false);
      setTab("spends");
      setBusy(false);
      // Refresh from server after paint; don't block the sheet close path.
      queueMicrotask(() => {
        void reload().catch((err) => {
          setError(err instanceof Error ? err.message : "Could not refresh");
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add expense");
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

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
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
    return (
      <main className="shell space-y-4 py-16">
        <p className="text-[var(--bad)]">{error || "Not found"}</p>
        <Link href="/" className="btn btn-ghost inline-flex">
          ← Back home
        </Link>
      </main>
    );
  }

  const currency = group.currency;
  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }));

  return (
    <>
      <main className="shell page-pad anim-rise space-y-5 pt-5 sm:space-y-7 sm:pt-10">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-sm font-700 text-ink-soft hover:text-ink"
            >
              ← New group
            </Link>
            <p className="text-[0.7rem] font-800 uppercase tracking-[0.14em] text-ink-soft">
              Expense Splitter
            </p>
            <h1 className="font-display mt-1 truncate text-3xl font-800 tracking-tight text-ink sm:text-5xl">
              {group.name}
            </h1>
          </div>
          <button type="button" className="btn btn-ghost text-sm" onClick={copyLink}>
            {copied ? "Copied" : "Copy link"}
          </button>
        </header>

        {error && (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-[var(--bad)]">
            {error}
          </p>
        )}

        {/* Desktop side tabs */}
        <div
          className="hidden gap-2 md:flex"
          role="tablist"
          aria-label="Group sections"
        >
          {(
            [
              ["balances", "Balances"],
              ["spends", "Spends"],
              ["people", "People"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`chip ${tab === id ? "is-on" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-primary ml-auto"
            onClick={() => setSheetOpen(true)}
          >
            Add expense
          </button>
        </div>

        {tab === "balances" && (
          <section aria-label="Balances" className="space-y-5">
            <div>
              <h2 className="font-display text-2xl font-700 tracking-tight">
                Who owes whom
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                One job: clear the slate.
              </p>
            </div>
            <ul className="space-y-3">
              {balances.map((b) => (
                <li
                  key={b.memberId}
                  className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3"
                >
                  <span className="font-700">{b.name}</span>
                  <span
                    className={
                      b.netCents > 1
                        ? "font-800 text-[var(--good)]"
                        : b.netCents < -1
                          ? "font-800 text-[var(--bad)]"
                          : "font-650 text-ink-soft"
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

            <div className="pt-2">
              <h3 className="font-display text-xl font-700">Settle up</h3>
              {!transfers.length ? (
                <p className="mt-3 text-sm text-ink-soft">All square — nice.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {transfers.map((t) => (
                    <li
                      key={`${t.fromId}-${t.toId}-${t.amountCents}`}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <p className="text-sm">
                        <strong>{t.fromName}</strong> pays{" "}
                        <strong>{t.toName}</strong>{" "}
                        {formatMoney(t.amountCents, currency)}
                      </p>
                      <button
                        type="button"
                        className="btn btn-ink px-3 py-2 text-xs"
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
        )}

        {tab === "spends" && (
          <section aria-label="Spends" className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-700 tracking-tight">
                  Spends
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  What got paid, and by whom.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary hidden sm:inline-flex md:hidden"
                onClick={() => setSheetOpen(true)}
              >
                Add
              </button>
            </div>
            <ul className="space-y-0">
              {expenses.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start justify-between gap-3 border-b border-[var(--line)] py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-700">{e.description}</p>
                    <p className="text-sm text-ink-soft">
                      {e.payer_name || "Someone"} ·{" "}
                      {new Date(e.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="shrink-0 font-800">
                    {formatMoney(e.amount_cents, currency)}
                  </p>
                </li>
              ))}
              {!expenses.length && (
                <li className="py-10 text-sm text-ink-soft">
                  No spends yet. Tap + to add one.
                </li>
              )}
            </ul>
          </section>
        )}

        {tab === "people" && (
          <section aria-label="People" className="space-y-4">
            <div>
              <h2 className="font-display text-2xl font-700 tracking-tight">
                People
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Who&apos;s in this group.</p>
            </div>
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="border-b border-[var(--line)] py-3 font-700"
                >
                  {m.name}
                </li>
              ))}
            </ul>
            <form onSubmit={onAddPerson} className="flex gap-2 pt-2">
              <input
                className="input"
                placeholder="Add person"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-ink shrink-0"
                disabled={busy}
              >
                Add
              </button>
            </form>
          </section>
        )}
      </main>

      {/* Mobile FAB for add expense */}
      <button
        type="button"
        className="fixed bottom-[calc(var(--nav-h)+var(--safe-b)+0.85rem)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-2xl font-800 text-[var(--accent-ink)] shadow-[0_12px_28px_rgba(155,196,31,0.4)] md:hidden"
        aria-label="Add expense"
        onClick={() => setSheetOpen(true)}
      >
        +
      </button>

      <BottomNav tab={tab} onChange={setTab} />

      <Sheet
        open={sheetOpen}
        title="Add expense"
        onClose={() => setSheetOpen(false)}
      >
        <form onSubmit={onAddExpense} className="space-y-4">
          <div>
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
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Select
            label="Paid by"
            value={paidBy}
            onChange={setPaidBy}
            options={memberOptions}
            required
          />
          <div>
            <p className="label">Split among</p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = splitIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`chip ${on ? "is-on" : ""}`}
                    aria-pressed={on}
                    onClick={() =>
                      setSplitIds((ids) =>
                        on ? ids.filter((id) => id !== m.id) : [...ids, m.id],
                      )
                    }
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Saving…" : "Save expense"}
          </button>
        </form>
      </Sheet>
    </>
  );
}
