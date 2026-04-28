CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ref TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TND',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can place an order (guest checkout)
CREATE POLICY "Anyone can place an order"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies — keeps customer data private from clients.
-- Owner views/manages orders via the Lovable Cloud dashboard.

CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);