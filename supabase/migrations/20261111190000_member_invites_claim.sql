-- Pending email memberships + auto-claim on shared userbase signup/login

alter table public.split_members
  add column if not exists email text,
  add column if not exists status text not null default 'named';

update public.split_members
set status = case
  when profile_id is not null then 'claimed'
  when email is not null and length(trim(email)) > 0 then 'pending'
  else 'named'
end
where status is null or status = 'named';

alter table public.split_members
  drop constraint if exists split_members_status_check;

alter table public.split_members
  add constraint split_members_status_check
  check (status in ('named', 'pending', 'claimed'));

alter table public.split_members
  drop constraint if exists split_members_pending_email_check;

alter table public.split_members
  add constraint split_members_pending_email_check
  check (
    (status <> 'pending')
    or (email is not null and length(trim(email)) > 0)
  );

create unique index if not exists split_members_group_email_uidx
  on public.split_members (group_id, lower(email))
  where email is not null and length(trim(email)) > 0;

create index if not exists split_members_email_idx
  on public.split_members (lower(email))
  where email is not null;

-- Normalize email on write
create or replace function public.normalize_split_member_email()
returns trigger
language plpgsql
as $$
begin
  if new.email is not null then
    new.email := lower(trim(new.email));
    if new.email = '' then
      new.email := null;
    end if;
  end if;
  if new.status = 'pending' and new.email is null then
    raise exception 'Pending members require an email';
  end if;
  if new.status = 'claimed' and new.profile_id is null then
    raise exception 'Claimed members require a profile';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_split_member_email on public.split_members;
create trigger trg_normalize_split_member_email
  before insert or update on public.split_members
  for each row execute function public.normalize_split_member_email();

-- Claim all pending memberships for the current auth user (by email)
create or replace function public.claim_split_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mail text;
  claimed int := 0;
  r record;
begin
  if uid is null then
    return 0;
  end if;

  select lower(coalesce(email, '')) into mail from public.app_profiles where id = uid;
  if mail is null or mail = '' then
    select lower(coalesce(email, '')) into mail from auth.users where id = uid;
  end if;
  if mail is null or mail = '' then
    return 0;
  end if;

  for r in
    select m.id, m.group_id, m.name
    from public.split_members m
    where m.email is not null
      and lower(m.email) = mail
      and (m.profile_id is null or m.status = 'pending')
  loop
    update public.split_members
    set
      profile_id = uid,
      status = 'claimed',
      name = case
        when r.name is null or r.name = '' or r.name = split_part(mail, '@', 1)
          then coalesce(
            (select nullif(display_name, '') from public.app_profiles where id = uid),
            nullif(r.name, ''),
            split_part(mail, '@', 1)
          )
        else r.name
      end
    where id = r.id;

    insert into public.split_group_access (group_id, user_id, role)
    values (
      r.group_id,
      uid,
      case
        when exists (
          select 1 from public.split_groups g
          where g.id = r.group_id and g.owner_id = uid
        ) then 'owner'
        else 'member'
      end
    )
    on conflict (group_id, user_id) do nothing;

    claimed := claimed + 1;
  end loop;

  return claimed;
end;
$$;

grant execute on function public.claim_split_invites() to authenticated;

-- Also claim when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mail text := lower(coalesce(new.email, ''));
begin
  insert into public.app_profiles (id, email, phone, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(coalesce(new.email, 'friend'), '@', 1)
    )
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = coalesce(nullif(excluded.phone, ''), public.app_profiles.phone),
    display_name = coalesce(nullif(excluded.display_name, ''), public.app_profiles.display_name),
    updated_at = now();

  if mail <> '' then
    update public.split_members m
    set
      profile_id = new.id,
      status = 'claimed',
      name = coalesce(
        nullif(m.name, ''),
        nullif(new.raw_user_meta_data->>'display_name', ''),
        split_part(mail, '@', 1)
      )
    where m.email is not null
      and lower(m.email) = mail
      and (m.profile_id is null or m.status = 'pending');

    insert into public.split_group_access (group_id, user_id, role)
    select m.group_id, new.id, 'member'
    from public.split_members m
    where m.profile_id = new.id
    on conflict (group_id, user_id) do nothing;
  end if;

  return new;
end;
$$;
