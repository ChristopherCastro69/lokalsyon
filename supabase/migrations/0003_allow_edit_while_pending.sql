-- Allow customers to update their pin/phone/notes until the order is delivered.
-- Previously: anon could only update once (while submitted_at IS NULL).
-- Now: anon can update any time the order is still 'pending'; once the seller
-- marks it 'delivered', RLS locks the row for anon.

drop policy if exists "orders_update_anon_pre_submit" on public.orders;

create policy "orders_update_anon_while_pending" on public.orders
  for update
  using (status = 'pending')
  with check (status = 'pending');
