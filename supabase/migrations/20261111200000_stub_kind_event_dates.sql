-- Event vs Group stubs. Existing rows become open-ended Groups.

alter table public.split_groups
  add column if not exists stub_kind text not null default 'group',
  add column if not exists event_date_mode text,
  add column if not exists starts_on date,
  add column if not exists ends_on date,
  -- Schema hooks for later (no UI yet)
  add column if not exists archived_at timestamptz,
  add column if not exists recurrence text;

alter table public.split_groups
  drop constraint if exists split_groups_stub_kind_check;

alter table public.split_groups
  add constraint split_groups_stub_kind_check
  check (stub_kind in ('event', 'group'));

alter table public.split_groups
  drop constraint if exists split_groups_event_date_mode_check;

alter table public.split_groups
  add constraint split_groups_event_date_mode_check
  check (
    event_date_mode is null
    or event_date_mode in ('single', 'range')
  );

alter table public.split_groups
  drop constraint if exists split_groups_event_dates_check;

alter table public.split_groups
  add constraint split_groups_event_dates_check
  check (
    (
      stub_kind = 'group'
      and event_date_mode is null
      and starts_on is null
      and ends_on is null
    )
    or (
      stub_kind = 'event'
      and event_date_mode in ('single', 'range')
      and starts_on is not null
      and ends_on is not null
      and ends_on >= starts_on
      and (
        event_date_mode <> 'single'
        or starts_on = ends_on
      )
    )
  );

update public.split_groups
set stub_kind = 'group'
where stub_kind is distinct from 'event';

comment on column public.split_groups.stub_kind is
  'event = time-bound; group = open-ended';
comment on column public.split_groups.archived_at is
  'Reserved for archive UI later';
comment on column public.split_groups.recurrence is
  'Reserved for recurring events later (e.g. cron/rrule token)';
