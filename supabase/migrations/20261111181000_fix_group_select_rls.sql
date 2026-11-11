-- Allow owners to SELECT their own group rows directly (fixes INSERT...RETURNING).
drop policy if exists "auth select groups" on public.split_groups;
create policy "auth select groups"
  on public.split_groups for select
  using (owner_id = auth.uid() or public.can_access_split_group(id));
