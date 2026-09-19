CREATE OR REPLACE FUNCTION public.increment_discount_usage(discount_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.discounts
  SET usage_count = usage_count + 1
  WHERE id = $1;
$$;

COMMENT ON FUNCTION public.increment_discount_usage(uuid) IS
  'Atomically increments the usage count for a successfully applied promo code.';