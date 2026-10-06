ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS width_cm numeric(5,2) NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2) NOT NULL DEFAULT 140;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_dimension_positive'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_dimension_positive
      CHECK (width_cm > 0 AND height_cm > 0);
  END IF;
END $$;

UPDATE public.products
SET width_cm = 90
WHERE width_cm IS NULL OR width_cm <= 0;

UPDATE public.products
SET height_cm = 140
WHERE height_cm IS NULL OR height_cm <= 0;

COMMENT ON COLUMN public.products.width_cm IS
  'Flag width in centimeters for display on the storefront.';

COMMENT ON COLUMN public.products.height_cm IS
  'Flag height in centimeters for display on the storefront.';
