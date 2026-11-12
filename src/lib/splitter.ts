import { customAlphabet } from "nanoid";
import { createClient } from "@/lib/supabase/client";
import { parseCrewInput } from "@/lib/crew";
import { settleBalances, splitEqualCents, sumRecord, toCents } from "@/lib/money";
import type {
  EventDateMode,
  ExpensePayment,
  ExpenseShare,
  ExpenseWithShares,
  Group,
  Member,
  Settlement,
  StubKind,
} from "@/lib/types";
import { normalizeEventDates } from "@/lib/stubKind";

const slugId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export type ExpenseDraft = {
  groupId: string;
  description: string;
  amountCents: number;
  payments: Record<string, number>;
  shares: Record<string, number>;
};

function assertBalanced(draft: ExpenseDraft) {
  if (!draft.description.trim()) throw new Error("Add a description");
  if (draft.amountCents <= 0) throw new Error("Amount must be greater than zero");
  const payIds = Object.keys(draft.payments).filter((id) => draft.payments[id] > 0);
  const shareIds = Object.keys(draft.shares).filter((id) => draft.shares[id] > 0);
  if (!payIds.length) throw new Error("Pick who paid");
  if (!shareIds.length) throw new Error("Pick who shares the split");
  if (sumRecord(draft.payments) !== draft.amountCents) {
    throw new Error("Payer amounts must add up to the total");
  }
  if (sumRecord(draft.shares) !== draft.amountCents) {
    throw new Error("Split amounts must add up to the total");
  }
}

export async function listMyGroups(): Promise<Group[]> {
  const sb = createClient();
  const { data: access, error } = await sb
    .from("split_group_access")
    .select("group_id, split_groups(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const groups = (access || [])
    .map((row) => {
      const g = row.split_groups as unknown;
      return (Array.isArray(g) ? g[0] : g) as Group | null;
    })
    .filter(Boolean) as Group[];
  // de-dupe
  const seen = new Set<string>();
  return groups.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}

export type CreateMemberInput = {
  name: string;
  email?: string;
  isSelf?: boolean;
};

export async function createGroup(input: {
  name: string;
  currency?: string;
  members: CreateMemberInput[];
  stubKind?: StubKind;
  eventDateMode?: EventDateMode;
  startsOn?: string;
  endsOn?: string;
}) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Sign in to create a group");

  const stubKind: StubKind = input.stubKind === "event" ? "event" : "group";
  let eventFields: {
    event_date_mode: EventDateMode | null;
    starts_on: string | null;
    ends_on: string | null;
  } = {
    event_date_mode: null,
    starts_on: null,
    ends_on: null,
  };
  if (stubKind === "event") {
    const normalized = normalizeEventDates({
      mode: input.eventDateMode === "range" ? "range" : "single",
      startsOn: input.startsOn || "",
      endsOn: input.endsOn,
    });
    eventFields = {
      event_date_mode: normalized.mode,
      starts_on: normalized.startsOn,
      ends_on: normalized.endsOn,
    };
  }

  const slug = slugId();
  const { data: group, error } = await sb
    .from("split_groups")
    .insert({
      name: input.name.trim(),
      slug,
      currency: input.currency || "INR",
      owner_id: user.id,
      stub_kind: stubKind,
      ...eventFields,
    })
    .select("*")
    .single();
  if (error) throw error;

  const { error: aErr } = await sb.from("split_group_access").insert({
    group_id: group.id,
    user_id: user.id,
    role: "owner",
  });
  if (aErr) throw aErr;

  type MemberInsert = {
    group_id: string;
    name: string;
    email?: string;
    status: "named" | "pending" | "claimed";
    profile_id?: string;
  };

  const rows: MemberInsert[] = [];
  for (const m of input.members) {
    const name = m.name.trim();
    const email = m.email?.trim().toLowerCase() || undefined;
    if (!name && !email) continue;
    if (m.isSelf) {
      rows.push({
        group_id: group.id,
        name: name || "You",
        email: email || user.email?.toLowerCase() || undefined,
        status: "claimed",
        profile_id: user.id,
      });
      continue;
    }
    if (email) {
      rows.push({
        group_id: group.id,
        name: name || email.split("@")[0],
        email,
        status: "pending",
      });
      continue;
    }
    rows.push({
      group_id: group.id,
      name,
      status: "named",
    });
  }
  if (!rows.length) throw new Error("Add at least one person");

  const { data: members, error: mErr } = await sb
    .from("split_members")
    .insert(rows)
    .select("*");
  if (mErr) throw mErr;

  await sb.rpc("claim_split_invites");

  return { group: group as Group, members: (members || []) as Member[] };
}

export async function joinGroupBySlug(slug: string) {
  const sb = createClient();
  const { data, error } = await sb.rpc("join_split_group", { p_slug: slug });
  if (error) throw error;
  return data as Group;
}

export async function getGroupBySlug(slug: string) {
  const sb = createClient();
  // Ensure access via share link for signed-in users
  try {
    await joinGroupBySlug(slug);
  } catch {
    /* may already have access or not found — fall through */
  }

  const { data: group, error } = await sb
    .from("split_groups")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!group) return null;

  const [{ data: members }, { data: expenses }, { data: settlements }] =
    await Promise.all([
      sb
        .from("split_members")
        .select("*")
        .eq("group_id", group.id)
        .order("created_at"),
      sb
        .from("split_expenses")
        .select("*")
        .eq("group_id", group.id)
        .order("created_at", { ascending: false }),
      sb
        .from("split_settlements")
        .select("*")
        .eq("group_id", group.id)
        .order("created_at", { ascending: false }),
    ]);

  const expenseIds = (expenses || []).map((e) => e.id);
  let shares: ExpenseShare[] = [];
  let payments: ExpensePayment[] = [];
  if (expenseIds.length) {
    const [{ data: shareRows }, { data: payRows }] = await Promise.all([
      sb.from("split_expense_shares").select("*").in("expense_id", expenseIds),
      sb.from("split_expense_payments").select("*").in("expense_id", expenseIds),
    ]);
    shares = (shareRows || []) as ExpenseShare[];
    payments = (payRows || []) as ExpensePayment[];
  }

  const memberMap = new Map((members || []).map((m) => [m.id, m.name]));
  const withShares: ExpenseWithShares[] = (expenses || []).map((e) => {
    let pays = payments.filter((p) => p.expense_id === e.id);
    if (!pays.length && e.paid_by) {
      pays = [
        {
          expense_id: e.id,
          member_id: e.paid_by,
          paid_cents: e.amount_cents,
        },
      ];
    }
    return {
      ...e,
      payments: pays,
      shares: shares.filter((s) => s.expense_id === e.id),
      payer_names: pays.map((p) => memberMap.get(p.member_id) || "Someone"),
    };
  });

  return {
    group: group as Group,
    members: (members || []) as Member[],
    expenses: withShares,
    settlements: (settlements || []) as Settlement[],
  };
}

export async function addMember(
  groupId: string,
  input: string | CreateMemberInput,
) {
  const sb = createClient();
  const parsed =
    typeof input === "string"
      ? (() => {
          const p = parseCrewInput(input);
          if (!p) throw new Error("Add a name or email");
          return { name: p.name, email: p.email, isSelf: false as boolean };
        })()
      : input;

  const email = parsed.email?.trim().toLowerCase() || undefined;
  const name = parsed.name.trim() || (email ? email.split("@")[0] : "");
  if (!name) throw new Error("Add a name or email");

  const row: {
    group_id: string;
    name: string;
    email?: string;
    status: "named" | "pending";
  } = {
    group_id: groupId,
    name,
    status: email ? "pending" : "named",
  };
  if (email) row.email = email;

  const { data, error } = await sb
    .from("split_members")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as Member;
}

export async function saveExpense(draft: ExpenseDraft, expenseId?: string) {
  assertBalanced(draft);
  const sb = createClient();
  const payments = Object.entries(draft.payments)
    .filter(([, cents]) => cents > 0)
    .map(([member_id, paid_cents]) => ({ member_id, paid_cents }));
  const shares = Object.entries(draft.shares)
    .filter(([, cents]) => cents > 0)
    .map(([member_id, share_cents]) => ({ member_id, share_cents }));

  const { data, error } = await sb.rpc("save_split_expense", {
    p_group_id: draft.groupId,
    p_description: draft.description.trim(),
    p_amount_cents: draft.amountCents,
    p_payments: payments,
    p_shares: shares,
    p_expense_id: expenseId || null,
  });
  if (error) throw error;
  return data;
}

export async function addExpense(input: {
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
}) {
  const amountCents = toCents(input.amount);
  return saveExpense({
    groupId: input.groupId,
    description: input.description,
    amountCents,
    payments: { [input.paidBy]: amountCents },
    shares: splitEqualCents(amountCents, input.splitAmong),
  });
}

export async function deleteExpense(expenseId: string) {
  const sb = createClient();
  const { error } = await sb.from("split_expenses").delete().eq("id", expenseId);
  if (error) throw error;
}

export async function recordSettlement(input: {
  groupId: string;
  fromMember: string;
  toMember: string;
  amountCents: number;
  note?: string;
}) {
  if (input.amountCents <= 0) throw new Error("Settlement must be greater than zero");
  const sb = createClient();
  const { data, error } = await sb
    .from("split_settlements")
    .insert({
      group_id: input.groupId,
      from_member: input.fromMember,
      to_member: input.toMember,
      amount_cents: input.amountCents,
      note: input.note || "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Settlement;
}

export function computeBalances(
  members: Member[],
  expenses: ExpenseWithShares[],
  settlements: Settlement[],
) {
  const net = new Map(members.map((m) => [m.id, 0]));
  for (const e of expenses) {
    const pays =
      e.payments?.length > 0
        ? e.payments
        : e.paid_by
          ? [{ member_id: e.paid_by, paid_cents: e.amount_cents }]
          : [];
    for (const p of pays) {
      net.set(p.member_id, (net.get(p.member_id) || 0) + p.paid_cents);
    }
    for (const s of e.shares) {
      net.set(s.member_id, (net.get(s.member_id) || 0) - s.share_cents);
    }
  }
  for (const s of settlements) {
    net.set(s.from_member, (net.get(s.from_member) || 0) + s.amount_cents);
    net.set(s.to_member, (net.get(s.to_member) || 0) - s.amount_cents);
  }

  const balances = members.map((m) => ({
    memberId: m.id,
    name: m.name,
    netCents: net.get(m.id) || 0,
  }));
  return { balances, transfers: settleBalances(balances) };
}

export function describePayers(expense: ExpenseWithShares) {
  if (!expense.payer_names?.length) return "Someone";
  if (expense.payer_names.length === 1) return expense.payer_names[0];
  if (expense.payer_names.length === 2) {
    return `${expense.payer_names[0]} + ${expense.payer_names[1]}`;
  }
  return `${expense.payer_names[0]} +${expense.payer_names.length - 1}`;
}
