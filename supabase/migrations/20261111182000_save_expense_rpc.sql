-- Atomic expense write to avoid multi-roundtrip hangs under RLS
create or replace function public.save_split_expense(
  p_group_id uuid,
  p_description text,
  p_amount_cents bigint,
  p_payments jsonb,
  p_shares jsonb,
  p_expense_id uuid default null
)
returns public.split_expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  exp public.split_expenses;
  primary_payer uuid;
  pay jsonb;
  shr jsonb;
begin
  if auth.uid() is null or not public.can_access_split_group(p_group_id) then
    raise exception 'Forbidden';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Invalid amount';
  end if;
  if coalesce(p_description, '') = '' then
    raise exception 'Description required';
  end if;

  select (p->>'member_id')::uuid into primary_payer
  from jsonb_array_elements(p_payments) p
  where (p->>'paid_cents')::bigint > 0
  limit 1;

  if p_expense_id is null then
    insert into public.split_expenses (group_id, description, amount_cents, paid_by)
    values (p_group_id, trim(p_description), p_amount_cents, primary_payer)
    returning * into exp;
  else
    update public.split_expenses
    set description = trim(p_description),
        amount_cents = p_amount_cents,
        paid_by = primary_payer
    where id = p_expense_id and group_id = p_group_id
    returning * into exp;
    if exp.id is null then
      raise exception 'Expense not found';
    end if;
    delete from public.split_expense_payments where expense_id = exp.id;
    delete from public.split_expense_shares where expense_id = exp.id;
  end if;

  for pay in select * from jsonb_array_elements(p_payments)
  loop
    if (pay->>'paid_cents')::bigint > 0 then
      insert into public.split_expense_payments (expense_id, member_id, paid_cents)
      values (exp.id, (pay->>'member_id')::uuid, (pay->>'paid_cents')::bigint);
    end if;
  end loop;

  for shr in select * from jsonb_array_elements(p_shares)
  loop
    if (shr->>'share_cents')::bigint > 0 then
      insert into public.split_expense_shares (expense_id, member_id, share_cents)
      values (exp.id, (shr->>'member_id')::uuid, (shr->>'share_cents')::bigint);
    end if;
  end loop;

  return exp;
end;
$$;

grant execute on function public.save_split_expense(uuid, text, bigint, jsonb, jsonb, uuid) to authenticated;
