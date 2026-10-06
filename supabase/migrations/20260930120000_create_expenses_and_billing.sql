-- Business expenses (Facturation) + billing aggregates + attachment storage

CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT,
  supplier_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  payment_date DATE NOT NULL,
  amount_ht NUMERIC(12, 3) NOT NULL CHECK (amount_ht >= 0),
  vat_rate NUMERIC(5, 2),
  vat_amount NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  amount_ttc NUMERIC(12, 3) NOT NULL CHECK (amount_ttc >= 0),
  currency TEXT NOT NULL DEFAULT 'TND',
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('paid', 'pending')),
  attachment_path TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'voided')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT expenses_category_check CHECK (
    category IN (
      'Materials', 'Fabric', 'Printing', 'Supports', 'Packaging', 'Delivery',
      'Advertising', 'Equipment', 'Software', 'Maintenance', 'Office', 'Services', 'Other'
    )
  )
);

CREATE INDEX expenses_payment_date_idx ON public.expenses (payment_date DESC);
CREATE INDEX expenses_status_idx ON public.expenses (status);
CREATE INDEX expenses_payment_status_idx ON public.expenses (payment_status);
CREATE INDEX expenses_category_idx ON public.expenses (category);

CREATE OR REPLACE FUNCTION public.set_expenses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_expenses_updated_at();

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
-- No client policies: admin API uses service_role (same pattern as orders management).

-- Company info for PDF documents (optional overrides)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT 'HOUSE OF FLAGS',
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS company_email TEXT,
  ADD COLUMN IF NOT EXISTS company_phone TEXT,
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

UPDATE public.site_settings
SET
  company_name = COALESCE(company_name, 'HOUSE OF FLAGS'),
  company_email = COALESCE(company_email, 'houseofflagstn@gmail.com'),
  company_phone = COALESCE(company_phone, '+216 53 069 199')
WHERE id = 1;

-- Order revenue helpers (mirrors admin/server/lib/order-revenue.ts)
CREATE OR REPLACE FUNCTION public.order_line_revenue(item JSONB)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE((item->>'line_total_tnd')::NUMERIC, 0) > 0
      THEN (item->>'line_total_tnd')::NUMERIC
    ELSE GREATEST(
      COALESCE((item->>'qty')::NUMERIC, 0),
      0
    ) * (
      COALESCE((item->>'unit_price_tnd')::NUMERIC, 0)
      + CASE
          WHEN COALESCE((item->>'with_support')::BOOLEAN, FALSE)
            THEN COALESCE((item->>'support_unit_price_tnd')::NUMERIC, 0)
          ELSE 0
        END
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.order_revenue_from_row(
  p_total NUMERIC,
  p_delivery_fee NUMERIC,
  p_items JSONB,
  p_status TEXT
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status = 'cancelled' THEN 0::NUMERIC
    WHEN COALESCE(p_total, 0) > 0 THEN p_total
    ELSE COALESCE((
      SELECT SUM(public.order_line_revenue(elem))
      FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB)) AS elem
    ), 0::NUMERIC) + COALESCE(p_delivery_fee, 0)
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_billing_dashboard(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_revenue NUMERIC(14, 3);
  v_paid NUMERIC(14, 3);
  v_pending NUMERIC(14, 3);
  v_from_date DATE := (p_from AT TIME ZONE 'UTC')::DATE;
  v_to_date DATE := (p_to AT TIME ZONE 'UTC')::DATE;
  v_by_category JSONB;
  v_monthly JSONB;
BEGIN
  SELECT COALESCE(SUM(public.order_revenue_from_row(total, delivery_fee, items, status)), 0)
  INTO v_revenue
  FROM public.orders
  WHERE created_at >= p_from
    AND created_at <= p_to
    AND status <> 'cancelled';

  SELECT
    COALESCE(SUM(amount_ttc) FILTER (WHERE payment_status = 'paid'), 0),
    COALESCE(SUM(amount_ttc) FILTER (WHERE payment_status = 'pending'), 0)
  INTO v_paid, v_pending
  FROM public.expenses
  WHERE status = 'active'
    AND payment_date >= v_from_date
    AND payment_date <= v_to_date;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('category', category, 'totalTtc', total_ttc)
      ORDER BY total_ttc DESC
    ),
    '[]'::JSONB
  )
  INTO v_by_category
  FROM (
    SELECT category, SUM(amount_ttc) AS total_ttc
    FROM public.expenses
    WHERE status = 'active'
      AND payment_status = 'paid'
      AND payment_date >= v_from_date
      AND payment_date <= v_to_date
    GROUP BY category
  ) AS cat;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'period', period,
        'revenue', revenue,
        'expenses', expenses,
        'net', revenue - expenses
      )
      ORDER BY period
    ),
    '[]'::JSONB
  )
  INTO v_monthly
  FROM (
    SELECT
      to_char(month_start, 'YYYY-MM') AS period,
      COALESCE(rev.revenue, 0) AS revenue,
      COALESCE(exp.expenses, 0) AS expenses
    FROM generate_series(
      date_trunc('month', v_from_date::TIMESTAMP)::DATE,
      date_trunc('month', v_to_date::TIMESTAMP)::DATE,
      INTERVAL '1 month'
    ) AS month_start
    LEFT JOIN (
      SELECT
        date_trunc('month', created_at)::DATE AS m,
        SUM(public.order_revenue_from_row(total, delivery_fee, items, status)) AS revenue
      FROM public.orders
      WHERE created_at >= p_from
        AND created_at <= p_to
        AND status <> 'cancelled'
      GROUP BY 1
    ) AS rev ON rev.m = month_start
    LEFT JOIN (
      SELECT
        date_trunc('month', payment_date::TIMESTAMP)::DATE AS m,
        SUM(amount_ttc) AS expenses
      FROM public.expenses
      WHERE status = 'active'
        AND payment_status = 'paid'
        AND payment_date >= v_from_date
        AND payment_date <= v_to_date
      GROUP BY 1
    ) AS exp ON exp.m = month_start
  ) AS series;

  RETURN jsonb_build_object(
    'revenue', v_revenue,
    'paidExpenses', v_paid,
    'pendingExpenses', v_pending,
    'net', v_revenue - v_paid,
    'currency', 'TND',
    'expensesByCategory', v_by_category,
    'monthlySeries', v_monthly
  );
END;
$$;

-- Private bucket for expense attachments (admin uploads via service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-attachments',
  'expense-attachments',
  FALSE,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
