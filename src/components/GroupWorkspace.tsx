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
import { EmptyStage } from "@/components/ui/EmptyStage";
import { ExpenseForm } from "@/components/ExpenseForm";

export function GroupWorkspace({ slug }: { slug: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithShares[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("settle");
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
      setTab("ledger");
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
        <EmptyStage
          title="Stub locked"
          body="Sign in with your Mini Apps account to open this group."
          action={
            <Link href={`/login?next=/g/${slug}`} className="btn btn-primary inline-flex">
              Sign in
            </Link>
          }
        />
      </main>
    );
  }

  if (loading || authed === null) {
    return (
      <main className="shell flex min-h-[40vh] items-center justify-center py-16">
        <Loader label="Finding the stub…" />
      </main>
    );
  }

  if (!group) {
    return (
      <main className="shell space-y-4 py-16">
        <p className="text-[var(--bad)]">{error || "Not found"}</p>
        <Link href="/" className="btn btn-ghost inline-flex">
          ← Stubs
        </Link>
      </main>
    );
  }

  const currency = group.currency;

  return (
    <>
      <main className="shell page-pad anim-rise space-y-5 pt-5 sm:space-y-7 sm:pt-10">
        <header className="min-w-0">
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1 text-sm font-700 text-ink-soft hover:text-ink"
          >
            ← Stubs
          </Link>
          <p className="text-[0.7rem] font-800 uppercase tracking-[0.16em] text-ink-soft">
            {currency}
          </p>
          <h1 className="font-display mt-1 truncate text-3xl font-800 tracking-tight text-ink sm:text-4xl">
            {group.name}
          </h1>
          <button
            type="button"
            className="mt-2 text-sm font-700 text-ink-soft underline decoration-[var(--line)] underline-offset-4 hover:text-ink"
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
            {copied ? "Link copied" : "Copy share link"}
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
              ["settle", "Settle"],
              ["ledger", "Ledger"],
              ["crew", "Crew"],
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
          {tab === "ledger" && (
            <button
              type="button"
              className="btn btn-primary ml-auto"
              onClick={() => {
                setEditing(null);
                setSheetOpen(true);
              }}
            >
              Stamp expense
            </button>
          )}
        </div>

        {tab === "settle" && (
          <section aria-label="Settle" className="space-y-4">
            <div>
              <h2 className="font-display text-2xl font-800 tracking-tight">Settle</h2>
              <p className="mt-1 text-sm text-ink-soft">Who owes whom — mark paid when cash moves.</p>
            </div>
            <div className="perforation" aria-hidden />
            {!members.length ? (
              <EmptyStage
                title="Crew missing"
                body="Add people on the Crew tab before balances make sense."
              />
            ) : (
              <>
                <ul>
                  {balances.map((b) => (
                    <li key={b.memberId} className="stub-row cursor-default">
                      <span className="font-800">{b.name}</span>
                      <span
                        className={
                          b.netCents > 1
                            ? "font-800 text-[var(--mark)]"
                            : b.netCents < -1
                              ? "font-800 text-[var(--accent-deep)]"
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
                {transfers.length ? (
                  <div className="pt-2">
                    <p className="label">To clear it</p>
                    <ul>
                      {transfers.map((t) => (
                        <li
                          key={`${t.fromId}-${t.toId}-${t.amountCents}`}
                          className="stub-row cursor-default"
                        >
                          <p className="text-sm">
                            <strong>{t.fromName}</strong> → <strong>{t.toName}</strong>
                            <span className="mt-0.5 block font-800">
                              {formatMoney(t.amountCents, currency)}
                            </span>
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
                  </div>
                ) : (
                  <p className="pt-1 text-sm font-650 text-ink-soft">All square — nice.</p>
                )}
              </>
            )}
          </section>
        )}

        {tab === "ledger" && (
          <section aria-label="Ledger" className="space-y-4">
            <div>
              <h2 className="font-display text-2xl font-800 tracking-tight">Ledger</h2>
              <p className="mt-1 text-sm text-ink-soft">Tap a line to edit.</p>
            </div>
            <div className="perforation" aria-hidden />
            {!expenses.length ? (
              <EmptyStage
                title="Blank ledger"
                body="Stamp the first spend."
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setEditing(null);
                      setSheetOpen(true);
                    }}
                  >
                    Stamp expense
                  </button>
                }
              />
            ) : (
              <ul>
                {expenses.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className="stub-row"
                      onClick={() => {
                        setEditing(e);
                        setSheetOpen(true);
                      }}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-800">{e.description}</p>
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
              </ul>
            )}
          </section>
        )}

        {tab === "crew" && (
          <section aria-label="Crew" className="space-y-4">
            <div>
              <h2 className="font-display text-2xl font-800 tracking-tight">Crew</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Name or email — emails stay pending until they join.
              </p>
            </div>
            <div className="perforation" aria-hidden />
            {!members.length ? (
              <EmptyStage title="Nobody here yet" body="Add the first name or email below." />
            ) : (
              <ul>
                {members.map((m) => (
                  <li key={m.id} className="stub-row cursor-default">
                    <span className="min-w-0">
                      <span className="block font-800">{m.name}</span>
                      {m.email ? (
                        <span className="text-xs text-ink-soft">{m.email}</span>
                      ) : null}
                    </span>
                    <span
                      className={`text-xs font-800 uppercase tracking-wide ${
                        m.status === "pending"
                          ? "text-[var(--accent-deep)]"
                          : m.status === "claimed"
                            ? "text-[var(--mark)]"
                            : "text-ink-soft"
                      }`}
                    >
                      {m.status === "pending"
                        ? "Pending"
                        : m.status === "claimed"
                          ? "Joined"
                          : "Named"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={onAddPerson}
              className="flex gap-2 border-t border-dashed border-[var(--line)] pt-4"
            >
              <input
                className="input"
                placeholder="Name or email"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                aria-label="Add person by name or email"
              />
              <button type="submit" className="btn btn-ink shrink-0" disabled={busy}>
                Add
              </button>
            </form>
          </section>
        )}
      </main>

      {tab === "ledger" && (
        <button
          type="button"
          className="stamp-fab"
          aria-label="Stamp expense"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          +
        </button>
      )}

      <BottomNav tab={tab} onChange={setTab} />

      <Sheet
        open={sheetOpen}
        title={editing ? "Edit stamp" : "Stamp expense"}
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
