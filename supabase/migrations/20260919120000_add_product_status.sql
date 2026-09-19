ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

UPDATE public.products
SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END
WHERE status = 'active' AND NOT is_active;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_status_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_status_check
      CHECK (status IN ('active', 'inactive', 'coming_soon'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);

COMMENT ON COLUMN public.products.status IS
  'Catalog status. active is purchasable, inactive is hidden, coming_soon is visible but unavailable.';