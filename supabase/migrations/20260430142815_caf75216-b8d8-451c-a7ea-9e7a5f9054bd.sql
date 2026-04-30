-- Lock down the public.orders table: deny all access to anon and authenticated roles.
-- Only the service role (used by trusted server functions) can read/write.

CREATE POLICY "Deny all access to anon"
ON public.orders
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny all access to authenticated"
ON public.orders
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
