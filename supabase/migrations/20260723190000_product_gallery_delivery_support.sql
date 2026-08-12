-- =============================================================================
-- HOUSE OF FLAGS — Product gallery, delivery fee settings, support option
-- Production-ready migration for Supabase / PostgreSQL
-- Do NOT auto-run; apply manually via Supabase SQL editor or CLI.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Product image gallery (multi-URL album)
-- -----------------------------------------------------------------------------
-- Keep `image_url` as the primary/cover image for backward compatibility.
-- `image_urls` is the full ordered gallery; index 1 (array[1]) is always primary.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Migrate existing single images into the gallery
UPDATE public.products
SET image_urls = ARRAY[image_url]
WHERE (image_urls IS NULL OR cardinality(image_urls) = 0)
  AND image_url IS NOT NULL
  AND btrim(image_url) <> '';

-- Ensure every product has at least one gallery image
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_image_urls_not_empty;

ALTER TABLE public.products
  ADD CONSTRAINT products_image_urls_not_empty
  CHECK (cardinality(image_urls) >= 1);

-- Keep image_url synced with the first gallery entry on write
CREATE OR REPLACE FUNCTION public.sync_product_primary_image()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.image_urls IS NOT NULL AND cardinality(NEW.image_urls) >= 1 THEN
    NEW.image_url := NEW.image_urls[1];
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_primary_image ON public.products;

CREATE TRIGGER trg_sync_product_primary_image
  BEFORE INSERT OR UPDATE OF image_urls ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_primary_image();

-- One-time sync for any rows where image_url drifted
UPDATE public.products
SET image_url = image_urls[1]
WHERE cardinality(image_urls) >= 1
  AND image_url IS DISTINCT FROM image_urls[1];

-- -----------------------------------------------------------------------------
-- 2. Optional product support / stand
-- -----------------------------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS support_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS support_name text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS support_price_eur numeric(10, 2);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_support_price_nonneg;

ALTER TABLE public.products
  ADD CONSTRAINT products_support_price_nonneg
  CHECK (support_price_eur IS NULL OR support_price_eur >= 0);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_support_fields_consistent;

ALTER TABLE public.products
  ADD CONSTRAINT products_support_fields_consistent
  CHECK (
    support_enabled = false
    OR (
      support_enabled = true
      AND support_name IS NOT NULL
      AND length(btrim(support_name)) > 0
      AND support_price_eur IS NOT NULL
      AND support_price_eur >= 0
    )
  );

-- Existing products remain without support (defaults already apply)

-- -----------------------------------------------------------------------------
-- 3. Global site settings (delivery fee)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  delivery_fee_tnd numeric(10, 2) NOT NULL DEFAULT 8
    CHECK (delivery_fee_tnd >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_site_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;

CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_site_settings_updated_at();

INSERT INTO public.site_settings (id, delivery_fee_tnd)
VALUES (1, 8)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes go through the service role (admin API); no public INSERT/UPDATE/DELETE.

-- -----------------------------------------------------------------------------
-- 4. Orders: snapshot delivery fee at purchase time
-- -----------------------------------------------------------------------------
-- Existing orders keep delivery_fee = 0 (shipping was previously "included").

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_fee_nonneg;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_fee_nonneg
  CHECK (delivery_fee >= 0);

COMMENT ON COLUMN public.orders.delivery_fee IS
  'Delivery fee (TND) applied at the time of purchase. Independent of current site_settings.';

COMMENT ON COLUMN public.products.image_urls IS
  'Ordered gallery URLs. First element is the primary/cover image (synced to image_url).';

COMMENT ON COLUMN public.products.support_enabled IS
  'When true, customers may optionally add a support/stand at checkout.';

COMMENT ON COLUMN public.site_settings.delivery_fee_tnd IS
  'Current storefront delivery fee in TND. Default 8.';
