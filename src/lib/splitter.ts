import { customAlphabet } from "nanoid";
import { createBrowserSupabase } from "@/lib/supabase";
import { settleBalances, toCents } from "@/lib/money";
import type {
  ExpenseWithShares,
  Group,
  Member,
  Settlement,
} from "@/lib/types";

const slugId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export async function createGroup(input: {
  name: string;
  currency?: string;
  members: string[];
}) {
  const sb = createBrowserSupabase();
  const slug = slugId();
  const { data: group, error } = await sb
    .from("split_groups")
    .insert({
      name: input.name.trim(),
      slug,
      currency: input.currency || "INR",
    })
    .select("*")
    .single();
  if (error) throw error;

  const names = input.members.map((n) => n.trim()).filter(Boolean);
  if (!names.length) throw new Error("Add at least one person");

  const { data: members, error: mErr } = await sb
    .from("split_members")
    .insert(names.map((name) => ({ group_id: group.id, name })))
    .select("*");
  if (mErr) throw mErr;

  return { group: group as Group, members: (members || []) as Member[] };
}

export async function getGroupBySlug(slug: string) {
  const sb = createBrowserSupabase();
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
  let shares: { expense_id: string; member_id: string; share_cents: number }[] =
    [];
  if (expenseIds.length) {
    const { data } = await sb
      .from("split_expense_shares")
      .select("*")
      .in("expense_id", expenseIds);
    shares = data || [];
  }

  const memberMap = new Map((members || []).map((m) => [m.id, m.name]));
  const withShares: ExpenseWithShares[] = (expenses || []).map((e) => ({
    ...e,
    payer_name: memberMap.get(e.paid_by),
    shares: shares.filter((s) => s.expense_id === e.id),
  }));

  return {
    group: group as Group,
    members: (members || []) as Member[],
    expenses: withShares,
    settlements: (settlements || []) as Settlement[],
  };
}

export async function addMember(groupId: string, name: string) {
  const sb = createBrowserSupabase();
  const { data, error } = await sb
    .from("split_members")
    .insert({ group_id: groupId, name: name.trim() })
    .select("*")
    .single();
  if (error) throw error;
  return data as Member;
}

export async function addExpense(input: {
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
}) {
  if (!input.splitAmong.length) throw new Error("Pick at least one person to split with");
  const cents = toCents(input.amount);
  if (cents <= 0) throw new Error("Amount must be greater than zero");

  const sb = createBrowserSupabase();
  const { data: expense, error } = await sb
    .from("split_expenses")
    .insert({
      group_id: input.groupId,
      description: input.description.trim(),
      amount_cents: cents,
      paid_by: input.paidBy,
    })
    .select("*")
    .single();
  if (error) throw error;

  const n = input.splitAmong.length;
  const base = Math.floor(cents / n);
  let remainder = cents - base * n;
  const rows = input.splitAmong.map((memberId) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return {
      expense_id: expense.id,
      member_id: memberId,
      share_cents: base + extra,
    };
  });

  const { error: sErr } = await sb.from("split_expense_shares").insert(rows);
  if (sErr) throw sErr;
  return expense;
}

export async function recordSettlement(input: {
  groupId: string;
  fromMember: string;
  toMember: string;
  amount: number;
  note?: string;
}) {
  const sb = createBrowserSupabase();
  const { data, error } = await sb
    .from("split_settlements")
    .insert({
      group_id: input.groupId,
      from_member: input.fromMember,
      to_member: input.toMember,
      amount_cents: toCents(input.amount),
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
    net.set(e.paid_by, (net.get(e.paid_by) || 0) + e.amount_cents);
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
  const transfers = settleBalances(balances);
  return { balances, transfers };
}
