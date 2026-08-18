-- =============================================================================
-- HOUSE OF FLAGS — Stock Management & Pre-Order System
-- Complete Database Migration
-- 
-- This migration adds:
-- 1. Product quantity field for stock management
-- 2. Pre-orders table (separate from orders)
-- 3. Automatic stock decrease on order placement
-- 4. RLS policies for pre-orders
-- 5. Helper functions and triggers
--
-- Safe to run on existing database (all operations use IF NOT EXISTS guards).
-- Apply via: Supabase SQL Editor → Run
-- =============================================================================

-- ============================================================================
-- SECTION 1: Product Stock Management
-- ============================================================================

-- Add quantity column to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS quantity integer;

-- Backfill existing products with high stock (9999) so they remain purchasable
-- until admin explicitly sets real quantities
UPDATE public.products
SET quantity = 9999
WHERE quantity IS NULL;

-- Make quantity required and set default
ALTER TABLE public.products
  ALTER COLUMN quantity SET NOT NULL,
  ALTER COLUMN quantity SET DEFAULT 0;

-- Add constraint: quantity cannot be negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_quantity_nonneg'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_quantity_nonneg CHECK (quantity >= 0);
  END IF;
END $$;

-- Add index for efficient stock queries
CREATE INDEX IF NOT EXISTS idx_products_quantity ON public.products (quantity);

-- Add documentation
COMMENT ON COLUMN public.products.quantity IS
  'Available units in stock. 0 = out of stock (pre-order available when is_active=true). Max = 999,999.';

-- ============================================================================
-- SECTION 2: Pre-Orders Table
-- ============================================================================

-- Create pre-orders table (mirrors orders structure but for pre-order requests)
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

-- Add status constraint (same as orders)
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

-- Add JSON array constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pre_orders_items_is_array'
  ) THEN
    ALTER TABLE public.pre_orders
      ADD CONSTRAINT pre_orders_items_is_array CHECK (jsonb_typeof(items) = 'array');
  END IF;
END $$;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pre_orders_created_at ON public.pre_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pre_orders_status ON public.pre_orders (status);
CREATE INDEX IF NOT EXISTS idx_pre_orders_email ON public.pre_orders (email);

-- Add documentation
COMMENT ON TABLE public.pre_orders IS
  'Pre-order requests for out-of-stock products. Does NOT reduce stock. Uses service role for inserts (RLS denies direct access).';

-- ============================================================================
-- SECTION 3: Row Level Security (RLS) for Pre-Orders
-- ============================================================================

-- Enable RLS on pre-orders table
ALTER TABLE public.pre_orders ENABLE ROW LEVEL SECURITY;

-- Deny all access for anonymous users
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

-- Deny all access for authenticated users (service role bypasses RLS)
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

-- ============================================================================
-- SECTION 4: Stock Management Functions & Triggers
-- ============================================================================

-- Function: Safely decrease product stock (used by order trigger only)
-- Pre-orders do NOT call this function
CREATE OR REPLACE FUNCTION public.decrease_product_stock(p_slug text, p_qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
BEGIN
  -- Validate input
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'decrease_product_stock: quantity must be a positive integer';
  END IF;

  -- Lock and fetch current stock
  SELECT quantity INTO v_current
  FROM public.products
  WHERE slug = p_slug
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'decrease_product_stock: unknown product slug %', p_slug;
  END IF;

  -- Validate sufficient stock exists
  IF v_current < p_qty THEN
    RAISE EXCEPTION 'decrease_product_stock: insufficient stock for % (requested %, available %)',
      p_slug, p_qty, v_current;
  END IF;

  -- Decrease stock and update timestamp
  UPDATE public.products
  SET quantity = quantity - p_qty,
      updated_at = now()
  WHERE slug = p_slug;
END;
$$;

-- Add documentation
COMMENT ON FUNCTION public.decrease_product_stock(text, integer) IS
  'Safely decreases product stock after order placement. Prevents negative stock and race conditions. Called by orders_decrease_stock trigger only.';

-- Function: Trigger to decrease stock when orders are inserted
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
  -- Iterate through each item in the order
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.items) AS t(value)
  LOOP
    v_slug := item->>'slug';
    v_qty := (item->>'qty')::integer;

    -- Validate item data
    IF v_slug IS NULL OR v_slug = '' THEN
      RAISE EXCEPTION 'orders_decrease_stock_trigger: item missing slug';
    END IF;

    -- Decrease stock (will raise exception if insufficient)
    PERFORM public.decrease_product_stock(v_slug, v_qty);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Add documentation
COMMENT ON FUNCTION public.orders_decrease_stock_trigger() IS
  'Automatically called when orders are inserted. Iterates through order items and decreases each product stock. Pre-orders do NOT trigger this.';

-- Remove old trigger if exists
DROP TRIGGER IF EXISTS orders_decrease_stock ON public.orders;

-- Create trigger: automatically decrease stock after order insert
CREATE TRIGGER orders_decrease_stock
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_decrease_stock_trigger();

-- Add documentation
COMMENT ON TRIGGER orders_decrease_stock ON public.orders IS
  'Automatically decreases product stock when an order is inserted. Does not run for pre-orders.';

-- ============================================================================
-- SECTION 5: Helper Functions (Read-Only)
-- ============================================================================

-- Read-only helper: Check product stock before insert
-- Used by application layer to validate stock availability before order attempt
CREATE OR REPLACE FUNCTION public.get_product_stock(p_slug text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT quantity FROM public.products WHERE slug = p_slug;
$$;

-- Add documentation
COMMENT ON FUNCTION public.get_product_stock(text) IS
  'Read-only helper to check current product stock. Used by application layer before placing orders.';

-- ============================================================================
-- SECTION 6: Verification Queries (Optional - for debugging)
-- ============================================================================

-- List all products with stock info
-- SELECT slug, name, quantity, is_active FROM public.products ORDER BY quantity DESC;

-- List all pre-orders
-- SELECT pre_order_ref, customer_name, email, total, status, created_at FROM public.pre_orders ORDER BY created_at DESC;

-- Check active products that are out of stock (ready for pre-order)
-- SELECT slug, name, quantity FROM public.products WHERE is_active = true AND quantity = 0;

-- ============================================================================
-- END OF MIGRATION
-- =============================================================================
