export type Group = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  created_at: string;
  owner_id?: string | null;
};

export type MemberStatus = "named" | "pending" | "claimed";

export type Member = {
  id: string;
  group_id: string;
  name: string;
  email?: string | null;
  status?: MemberStatus;
  profile_id?: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  group_id: string;
  description: string;
  amount_cents: number;
  paid_by: string | null;
  created_at: string;
};

export type ExpenseShare = {
  expense_id: string;
  member_id: string;
  share_cents: number;
};

export type ExpensePayment = {
  expense_id: string;
  member_id: string;
  paid_cents: number;
};

export type Settlement = {
  id: string;
  group_id: string;
  from_member: string;
  to_member: string;
  amount_cents: number;
  note: string;
  created_at: string;
};

export type ExpenseWithShares = Expense & {
  shares: ExpenseShare[];
  payments: ExpensePayment[];
  payer_names: string[];
};

export type SavedGroup = {
  slug: string;
  name: string;
  currency: string;
  openedAt: string;
};
