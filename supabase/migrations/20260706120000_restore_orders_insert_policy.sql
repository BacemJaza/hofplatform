-- Re-create the public insert policy that the checkout flow depends on.
-- The earlier migration removed this policy, which caused Supabase to reject
-- order inserts with row-level security errors.
CREATE POLICY "Anyone can place an order"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
