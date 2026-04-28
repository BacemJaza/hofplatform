-- Remove the permissive anon insert policy.
-- Order creation now goes through a server function using the service role,
-- which bypasses RLS, so no client-facing INSERT policy is needed.
DROP POLICY IF EXISTS "Anyone can place an order" ON public.orders;

-- Lock allowed status values.
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','processing','shipped','completed','cancelled'));

-- No SELECT/INSERT/UPDATE/DELETE policies for anon/authenticated.
-- Service role bypasses RLS and is used by the server function and dashboard.