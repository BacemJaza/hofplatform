import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  label: string;
  price_eur: number;
  image_url: string;
  story: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  slug: string;
  qty: number;
  unit_price_tnd: number;
  line_total_tnd: number;
};

export type OrderRow = {
  id: string;
  order_ref: string;
  customer_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes: string | null;
  items: OrderItem[];
  total: number;
  currency: string;
  status: string;
  created_at: string;
};

export type MessageRow = {
  id: string;
  full_name: string;
  email: string;
  notes: string;
  created_at: string;
};

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
