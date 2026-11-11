"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
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
import { GroupHeader } from "@/components/GroupHeader";
import { takeStubOpen, type StubOpenPayload } from "@/lib/stubTheme";

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
  const [newPerson, setNewPerson] = useState("");
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [arrive, setArrive] = useState<StubOpenPayload | null>(null);

  useEffect(() => {
    const payload = takeStubOpen();
    if (payload && payload.slug === slug) {
      setArrive(payload);
      const t = window.setTimeout(() => setArrive(null), 1400);
      return () => window.clearTimeout(t);
    }
  }, [slug]);

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
        <Link href={`/login?next=/g/${slug}`} className="block no-underline">
          <span className="btn-boxy-split pointer-events-none">
            <span className="btn-boxy-split-label">Sign in</span>
            <span className="btn-boxy-split-arrow" aria-hidden>
              →
            </span>
          </span>
        </Link>
          }
        />
      </main>
    );
  }

  if (loading || authed === null) {
    return (
      <main className="shell flex min-h-[40vh] items-center justify-center py-16">
        <Loader />
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
      <main
        className={`shell page-pad space-y-5 pt-5 sm:space-y-7 sm:pt-10 ${
          arrive ? `stub-arrive theme-${arrive.theme}` : "anim-rise"
        }`}
        style={
          arrive
            ? ({ viewTransitionName: "stub-cover" } as CSSProperties)
            : undefined
        }
      >
        <GroupHeader name={group.name} currency={currency} />

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
              className="btn-boxy-split ml-auto max-w-[14rem]"
              onClick={() => {
                setEditing(null);
                setSheetOpen(true);
              }}
            >
              <span className="btn-boxy-split-label">Add spend</span>
              <span className="btn-boxy-split-arrow" aria-hidden>
                →
              </span>
            </button>
          )}
        </div>

        {tab === "settle" && (
          <section aria-label="Settle" className="space-y-5">
            {!members.length ? (
              <EmptyStage title="No crew yet" body="Add people on Crew." />
            ) : (
              <>
                <div className="settle-hero">
                  <p className="settle-hero-label">Open balance</p>
                  <p className="settle-hero-value">
                    {formatMoney(
                      transfers.reduce((sum, t) => sum + t.amountCents, 0),
                      currency,
                    )}
                  </p>
                </div>

                <div className="balance-board">
                  <div className="balance-head" aria-hidden>
                    <span>Name</span>
                    <span>Balance</span>
                  </div>
                  <ul className="balance-list">
                    {balances.map((b) => (
                      <li key={b.memberId} className="balance-row">
                        <span className="font-800">{b.name}</span>
                        <span
                          className={
                            b.netCents > 1
                              ? "balance-amt is-credit"
                              : b.netCents < -1
                                ? "balance-amt is-debt"
                                : "balance-amt is-zero"
                          }
                        >
                          {b.netCents > 1
                            ? `+${formatMoney(b.netCents, currency)}`
                            : b.netCents < -1
                              ? `−${formatMoney(-b.netCents, currency)}`
                              : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="transfer-block">
                  <p className="label">Transfers</p>
                  {!transfers.length ? (
                    <p className="transfer-empty">All square.</p>
                  ) : (
                    <ul className="transfer-list">
                      {transfers.map((t) => (
                        <li
                          key={`${t.fromId}-${t.toId}-${t.amountCents}`}
                          className="transfer-row"
                        >
                          <div className="min-w-0">
                            <p className="transfer-route">
                              <span className="font-800">{t.fromName}</span>
                              <span className="transfer-arrow" aria-hidden>
                                →
                              </span>
                              <span className="font-800">{t.toName}</span>
                            </p>
                            <p className="transfer-amt">
                              {formatMoney(t.amountCents, currency)}
                            </p>
                          </div>
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
              </>
            )}
          </section>
        )}

        {tab === "ledger" && (
          <section aria-label="Ledger" className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-800 tracking-tight">Ledger</h2>
              <button
                type="button"
                className="btn btn-ghost hidden text-sm md:inline-flex"
                onClick={() => {
                  setEditing(null);
                  setSheetOpen(true);
                }}
              >
                Add spend
              </button>
            </div>
            {!expenses.length ? (
              <EmptyStage
                title="No entries"
                action={
                  <button
                    type="button"
                    className="btn-boxy-split"
                    onClick={() => {
                      setEditing(null);
                      setSheetOpen(true);
                    }}
                  >
                    <span className="btn-boxy-split-label">Add spend</span>
                    <span className="btn-boxy-split-arrow" aria-hidden>
                      →
                    </span>
                  </button>
                }
              />
            ) : (
              <div className="ledger-book">
                <div className="ledger-rule-head" aria-hidden>
                  <span>Date</span>
                  <span>Entry</span>
                  <span className="text-right">Amount</span>
                </div>
                <ul className="ledger-rows">
                  {expenses.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="ledger-row"
                        onClick={() => {
                          setEditing(e);
                          setSheetOpen(true);
                        }}
                      >
                        <span className="ledger-date">
                          {new Date(e.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="ledger-entry min-w-0">
                          <span className="ledger-desc">{e.description}</span>
                          <span className="ledger-meta">{describePayers(e)}</span>
                        </span>
                        <span className="ledger-amount">
                          {formatMoney(e.amount_cents, currency)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {tab === "crew" && (
          <section aria-label="Crew" className="space-y-4">
            <h2 className="font-display text-2xl font-800 tracking-tight">Crew</h2>
            {!members.length ? (
              <EmptyStage title="Empty roster" />
            ) : (
              <ul className="crew-roster">
                {members.map((m) => (
                  <li key={m.id} className="crew-roster-row">
                    <span className="crew-roster-avatar" aria-hidden>
                      {(m.name[0] || "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-800">{m.name}</span>
                      {m.email ? (
                        <span className="block truncate text-xs text-ink-soft">
                          {m.email}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`crew-status ${
                        m.status === "pending"
                          ? "is-pending"
                          : m.status === "claimed"
                            ? "is-claimed"
                            : "is-named"
                      }`}
                    >
                      {m.status === "pending"
                        ? "Pending"
                        : m.status === "claimed"
                          ? "Joined"
                          : "Guest"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={onAddPerson} className="crew-add-bar">
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
        title={editing ? "Edit spend" : "Add spend"}
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
