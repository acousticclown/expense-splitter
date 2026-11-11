"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMember,
  computeBalances,
  deleteExpense,
  describePayers,
  getGroupBySlug,
  recordSettlement,
  saveExpense,
  type ExpenseDraft,
} from "@/lib/splitter";
import { formatMoney } from "@/lib/money";
import { getSessionUser } from "@/lib/auth";
import type {
  ExpenseWithShares,
  Group,
  Member,
  Settlement,
} from "@/lib/types";
import { BottomNav, type TabId } from "@/components/ui/BottomNav";
import { Sheet } from "@/components/ui/Sheet";
import { Loader } from "@/components/ui/Loader";
import { ExpenseForm } from "@/components/ExpenseForm";

export function GroupWorkspace({ slug }: { slug: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithShares[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("balances");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseWithShares | null>(null);
  const [copied, setCopied] = useState(false);
  const [newPerson, setNewPerson] = useState("");
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

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
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    getSessionUser().then((u) => {
      if (!u) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);
      reload().catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setLoading(false);
      });
    });
  }, [reload]);

  const { balances, transfers } = useMemo(
    () => computeBalances(members, expenses, settlements),
    [members, expenses, settlements],
  );

  async function onSaveExpense(draft: ExpenseDraft, expenseId?: string) {
    setBusy(true);
    setError(null);
    try {
      await saveExpense(draft, expenseId);
      setSheetOpen(false);
      setEditing(null);
      setTab("spends");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteExpense() {
    if (!editing) return;
    setBusy(true);
    try {
      await deleteExpense(editing.id);
      setSheetOpen(false);
      setEditing(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  async function onAddPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!group || !newPerson.trim()) return;
    setBusy(true);
    try {
      await addMember(group.id, newPerson);
      setNewPerson("");
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
        amountCents: t.amountCents,
        note: "Marked settled",
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settle failed");
    } finally {
      setBusy(false);
    }
  }

  if (authed === false) {
    return (
      <main className="shell space-y-4 py-16">
        <p className="text-ink-soft">Sign in to open this group.</p>
        <Link href={`/login?next=/g/${slug}`} className="btn btn-primary inline-flex">
          Sign in
        </Link>
      </main>
    );
  }

  if (loading || authed === null) {
    return (
      <main className="shell flex min-h-[40vh] items-center justify-center py-16">
        <Loader label="Loading group…" />
      </main>
    );
  }

  if (!group) {
    return (
      <main className="shell space-y-4 py-16">
        <p className="text-[var(--bad)]">{error || "Not found"}</p>
        <Link href="/" className="btn btn-ghost inline-flex">
          ← Groups
        </Link>
      </main>
    );
  }

  const currency = group.currency;

  return (
    <>
      <main className="shell page-pad anim-rise space-y-5 pt-5 sm:space-y-7 sm:pt-10">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-sm font-700 text-ink-soft hover:text-ink"
            >
              ← Groups
            </Link>
            <p className="text-[0.7rem] font-800 uppercase tracking-[0.14em] text-ink-soft">
              Expense Splitter
            </p>
            <h1 className="font-display mt-1 truncate text-3xl font-800 tracking-tight text-ink sm:text-5xl">
              {group.name}
            </h1>
            <p className="mt-1 text-xs font-650 text-ink-soft">{currency}</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={async () => {
              try {
                await navigator.clipboard?.writeText(window.location.href);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              } catch {
                /* ignore */
              }
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </header>

        {error && (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-[var(--bad)]">
            {error}
          </p>
        )}

        <div className="hidden gap-2 md:flex" role="tablist" aria-label="Group sections">
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
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
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
              <p className="mt-1 text-sm text-ink-soft">Clear the slate.</p>
            </div>
            {!members.length ? (
              <p className="text-sm text-ink-soft">Add people to see balances.</p>
            ) : (
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
            )}

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
                <p className="mt-1 text-sm text-ink-soft">Tap a spend to edit.</p>
              </div>
            </div>
            <ul>
              {expenses.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 border-b border-[var(--line)] py-3.5 text-left"
                    onClick={() => {
                      setEditing(e);
                      setSheetOpen(true);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-700">{e.description}</p>
                      <p className="text-sm text-ink-soft">
                        {describePayers(e)} ·{" "}
                        {new Date(e.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="shrink-0 font-800">
                      {formatMoney(e.amount_cents, currency)}
                    </p>
                  </button>
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
              <p className="mt-1 text-sm text-ink-soft">
                Names used for splitting (not the same as app login).
              </p>
            </div>
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="border-b border-[var(--line)] py-3 font-700">
                  {m.name}
                </li>
              ))}
              {!members.length && (
                <li className="py-6 text-sm text-ink-soft">No people yet.</li>
              )}
            </ul>
            <form onSubmit={onAddPerson} className="flex gap-2 pt-2">
              <input
                className="input"
                placeholder="Add person"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
              />
              <button type="submit" className="btn btn-ink shrink-0" disabled={busy}>
                Add
              </button>
            </form>
          </section>
        )}
      </main>

      <button
        type="button"
        className="fixed bottom-[calc(var(--nav-h)+var(--safe-b)+0.85rem)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-2xl font-800 text-[var(--accent-ink)] shadow-[0_12px_28px_rgba(155,196,31,0.4)] md:hidden"
        aria-label="Add expense"
        onClick={() => {
          setEditing(null);
          setSheetOpen(true);
        }}
      >
        +
      </button>

      <BottomNav tab={tab} onChange={setTab} />

      <Sheet
        open={sheetOpen}
        title={editing ? "Edit expense" : "Add expense"}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
      >
        <ExpenseForm
          key={editing?.id || "new"}
          members={members}
          currency={currency}
          groupId={group.id}
          initial={editing}
          busy={busy}
          onSubmit={onSaveExpense}
          onDelete={editing ? onDeleteExpense : undefined}
        />
      </Sheet>
    </>
  );
}
