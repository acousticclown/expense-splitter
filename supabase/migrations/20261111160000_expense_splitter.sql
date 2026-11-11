-- Expense Splitter (lite Splitwise) — free-tier tables in shared Supabase project

create extension if not exists "pgcrypto";

create table if not exists public.split_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

create table if not exists public.split_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.split_groups (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists split_members_group_idx on public.split_members (group_id);

create table if not exists public.split_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.split_groups (id) on delete cascade,
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  paid_by uuid not null references public.split_members (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists split_expenses_group_idx on public.split_expenses (group_id);

create table if not exists public.split_expense_shares (
  expense_id uuid not null references public.split_expenses (id) on delete cascade,
  member_id uuid not null references public.split_members (id) on delete cascade,
  share_cents bigint not null check (share_cents >= 0),
  primary key (expense_id, member_id)
);

create table if not exists public.split_settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.split_groups (id) on delete cascade,
  from_member uuid not null references public.split_members (id) on delete restrict,
  to_member uuid not null references public.split_members (id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.split_groups enable row level security;
alter table public.split_members enable row level security;
alter table public.split_expenses enable row level security;
alter table public.split_expense_shares enable row level security;
alter table public.split_settlements enable row level security;

-- Public anon access for shareable group links (lite app; no login required)
create policy "anon all split_groups" on public.split_groups for all using (true) with check (true);
create policy "anon all split_members" on public.split_members for all using (true) with check (true);
create policy "anon all split_expenses" on public.split_expenses for all using (true) with check (true);
create policy "anon all split_expense_shares" on public.split_expense_shares for all using (true) with check (true);
create policy "anon all split_settlements" on public.split_settlements for all using (true) with check (true);
