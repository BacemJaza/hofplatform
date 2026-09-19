CREATE TABLE public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  discount_percent numeric(5, 2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX discounts_code_lower_idx ON public.discounts (lower(code));

CREATE OR REPLACE FUNCTION public.set_discounts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_discounts_updated_at();

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.discounts IS 'Promo codes managed in admin. Validated server-side at checkout.';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5, 2),
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.orders.promo_code IS 'Snapshot of promo code applied at checkout.';
COMMENT ON COLUMN public.orders.discount_percent IS 'Snapshot of discount percentage at time of order.';
COMMENT ON COLUMN public.orders.discount_amount IS 'Amount saved on items subtotal at time of order.';
