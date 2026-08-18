-- =============================================================================
-- HOUSE OF FLAGS — Stock management & pre-orders migration
-- Safe to run on an existing database (uses IF NOT EXISTS / IF EXISTS guards).
-- Apply in the Supabase SQL editor or via supabase db push.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Product stock (quantity)
-- -----------------------------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quantity integer;

-- Backfill existing rows so active catalog items stay purchasable until admin sets real counts.
UPDATE public.products
SET quantity = 9999
WHERE quantity IS NULL;

ALTER TABLE public.products
  ALTER COLUMN quantity SET NOT NULL,
  ALTER COLUMN quantity SET DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_quantity_nonneg'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_quantity_nonneg CHECK (quantity >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_quantity ON public.products (quantity);

COMMENT ON COLUMN public.products.quantity IS
  'Available units. 0 = out of stock (pre-order only when is_active).';

-- -----------------------------------------------------------------------------
-- 2. Pre-orders table (separate from orders)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pre_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_order_ref text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10, 2) NOT NULL,
  delivery_fee numeric(10, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TND',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pre_orders_status_check'
  ) THEN
    ALTER TABLE public.pre_orders
      ADD CONSTRAINT pre_orders_status_check
      CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pre_orders_items_is_array'
  ) THEN
    ALTER TABLE public.pre_orders
      ADD CONSTRAINT pre_orders_items_is_array CHECK (jsonb_typeof(items) = 'array');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pre_orders_created_at ON public.pre_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pre_orders_status ON public.pre_orders (status);
CREATE INDEX IF NOT EXISTS idx_pre_orders_email ON public.pre_orders (email);

-- RLS: deny direct client access; service role bypasses RLS (same pattern as orders).
ALTER TABLE public.pre_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pre_orders' AND policyname = 'Deny all pre_orders for anon'
  ) THEN
    CREATE POLICY "Deny all pre_orders for anon"
      ON public.pre_orders FOR ALL TO anon USING (false) WITH CHECK (false);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pre_orders' AND policyname = 'Deny all pre_orders for authenticated'
  ) THEN
    CREATE POLICY "Deny all pre_orders for authenticated"
      ON public.pre_orders FOR ALL TO authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Stock decrease helpers (orders only — pre-orders do NOT touch stock)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.decrease_product_stock(p_slug text, p_qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'decrease_product_stock: quantity must be a positive integer';
  END IF;

  SELECT quantity INTO v_current
  FROM public.products
  WHERE slug = p_slug
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'decrease_product_stock: unknown product slug %', p_slug;
  END IF;

  IF v_current < p_qty THEN
    RAISE EXCEPTION 'decrease_product_stock: insufficient stock for % (requested %, available %)',
      p_slug, p_qty, v_current;
  END IF;

  UPDATE public.products
  SET quantity = quantity - p_qty,
      updated_at = now()
  WHERE slug = p_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.orders_decrease_stock_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_slug text;
  v_qty integer;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.items) AS t(value)
  LOOP
    v_slug := item->>'slug';
    v_qty := (item->>'qty')::integer;

    IF v_slug IS NULL OR v_slug = '' THEN
      RAISE EXCEPTION 'orders_decrease_stock_trigger: item missing slug';
    END IF;

    PERFORM public.decrease_product_stock(v_slug, v_qty);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_decrease_stock ON public.orders;

CREATE TRIGGER orders_decrease_stock
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_decrease_stock_trigger();

-- Read-only helper for server-side stock checks before insert.
CREATE OR REPLACE FUNCTION public.get_product_stock(p_slug text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT quantity FROM public.products WHERE slug = p_slug;
$$;
