-- Shared mini-app identity + Expense Splitter ownership
-- Decision: one Supabase project (yconkkmnfyykhwflumed) = one userbase across portal + apps.

-- ── Shared profiles (cross-app) ─────────────────────────────────────────────
create table if not exists public.app_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  phone text not null default '',
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_profiles_email_idx on public.app_profiles (email);

alter table public.app_profiles enable row level security;

drop policy if exists "profiles read own or public fields" on public.app_profiles;
drop policy if exists "profiles insert own" on public.app_profiles;
drop policy if exists "profiles update own" on public.app_profiles;

create policy "profiles read own or public fields"
  on public.app_profiles for select
  using (true);

create policy "profiles insert own"
  on public.app_profiles for insert
  with check (id = auth.uid());

create policy "profiles update own"
  on public.app_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_profiles (id, email, phone, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'friend'), '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = coalesce(nullif(excluded.phone, ''), public.app_profiles.phone),
    display_name = coalesce(nullif(excluded.display_name, ''), public.app_profiles.display_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Multi-payer payments ────────────────────────────────────────────────────
create table if not exists public.split_expense_payments (
  expense_id uuid not null references public.split_expenses (id) on delete cascade,
  member_id uuid not null references public.split_members (id) on delete cascade,
  paid_cents bigint not null check (paid_cents > 0),
  primary key (expense_id, member_id)
);

create index if not exists split_expense_payments_member_idx
  on public.split_expense_payments (member_id);

alter table public.split_expense_payments enable row level security;

insert into public.split_expense_payments (expense_id, member_id, paid_cents)
select e.id, e.paid_by, e.amount_cents
from public.split_expenses e
where e.paid_by is not null
on conflict do nothing;

alter table public.split_expenses alter column paid_by drop not null;

-- ── Group ownership + collaborators ────────────────────────────────────────
alter table public.split_groups
  add column if not exists owner_id uuid references auth.users (id) on delete set null;

create table if not exists public.split_group_access (
  group_id uuid not null references public.split_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists split_group_access_user_idx on public.split_group_access (user_id);

alter table public.split_group_access enable row level security;

create or replace function public.can_access_split_group(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.split_group_access a
      where a.group_id = gid and a.user_id = auth.uid()
    )
    or exists (
      select 1 from public.split_groups g
      where g.id = gid and g.owner_id = auth.uid()
    )
  );
$$;

-- Replace open anon policies
drop policy if exists "anon all split_groups" on public.split_groups;
drop policy if exists "anon all split_members" on public.split_members;
drop policy if exists "anon all split_expenses" on public.split_expenses;
drop policy if exists "anon all split_expense_shares" on public.split_expense_shares;
drop policy if exists "anon all split_settlements" on public.split_settlements;
drop policy if exists "anon all split_expense_payments" on public.split_expense_payments;
drop policy if exists "auth all split_expense_payments" on public.split_expense_payments;
drop policy if exists "auth payments" on public.split_expense_payments;
drop policy if exists "auth select groups" on public.split_groups;
drop policy if exists "auth insert groups" on public.split_groups;
drop policy if exists "auth update groups" on public.split_groups;
drop policy if exists "auth delete groups" on public.split_groups;
drop policy if exists "auth access select" on public.split_group_access;
drop policy if exists "auth access insert self" on public.split_group_access;
drop policy if exists "auth access delete self" on public.split_group_access;
drop policy if exists "auth members" on public.split_members;
drop policy if exists "auth expenses" on public.split_expenses;
drop policy if exists "auth shares" on public.split_expense_shares;
drop policy if exists "auth settlements" on public.split_settlements;

create policy "auth select groups"
  on public.split_groups for select
  using (public.can_access_split_group(id));

create policy "auth insert groups"
  on public.split_groups for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

create policy "auth update groups"
  on public.split_groups for update
  using (public.can_access_split_group(id));

create policy "auth delete groups"
  on public.split_groups for delete
  using (owner_id = auth.uid());

create policy "auth access select"
  on public.split_group_access for select
  using (user_id = auth.uid() or public.can_access_split_group(group_id));

create policy "auth access insert self"
  on public.split_group_access for insert
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "auth access delete self"
  on public.split_group_access for delete
  using (user_id = auth.uid() or exists (
    select 1 from public.split_groups g
    where g.id = group_id and g.owner_id = auth.uid()
  ));

create policy "auth members"
  on public.split_members for all
  using (public.can_access_split_group(group_id))
  with check (public.can_access_split_group(group_id));

create policy "auth expenses"
  on public.split_expenses for all
  using (public.can_access_split_group(group_id))
  with check (public.can_access_split_group(group_id));

create policy "auth shares"
  on public.split_expense_shares for all
  using (
    exists (
      select 1 from public.split_expenses e
      where e.id = expense_id and public.can_access_split_group(e.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.split_expenses e
      where e.id = expense_id and public.can_access_split_group(e.group_id)
    )
  );

create policy "auth payments"
  on public.split_expense_payments for all
  using (
    exists (
      select 1 from public.split_expenses e
      where e.id = expense_id and public.can_access_split_group(e.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.split_expenses e
      where e.id = expense_id and public.can_access_split_group(e.group_id)
    )
  );

create policy "auth settlements"
  on public.split_settlements for all
  using (public.can_access_split_group(group_id))
  with check (public.can_access_split_group(group_id));

alter table public.split_members
  add column if not exists profile_id uuid references public.app_profiles (id) on delete set null;

create or replace function public.join_split_group(p_slug text)
returns public.split_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.split_groups;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  select * into g from public.split_groups where slug = p_slug;
  if g.id is null then
    raise exception 'Group not found';
  end if;
  insert into public.split_group_access (group_id, user_id, role)
  values (g.id, uid, case when g.owner_id = uid then 'owner' else 'member' end)
  on conflict (group_id, user_id) do nothing;
  return g;
end;
$$;

grant execute on function public.join_split_group(text) to authenticated;
grant execute on function public.can_access_split_group(uuid) to authenticated;
