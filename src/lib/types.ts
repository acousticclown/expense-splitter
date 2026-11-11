export type Group = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  created_at: string;
};

export type Member = {
  id: string;
  group_id: string;
  name: string;
  created_at: string;
};

export type Expense = {
  id: string;
  group_id: string;
  description: string;
  amount_cents: number;
  paid_by: string;
  created_at: string;
};

export type ExpenseShare = {
  expense_id: string;
  member_id: string;
  share_cents: number;
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
  payer_name?: string;
};
