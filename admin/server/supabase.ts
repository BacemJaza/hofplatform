import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  label: string;
  price_eur: number;
  quantity: number;
  image_url: string;
  image_urls: string[];
  story: string;
  tags: string[];
  is_active: boolean;
  support_enabled: boolean;
  support_name: string | null;
  support_price_eur: number | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  slug: string;
  qty: number;
  unit_price_tnd: number;
  line_total_tnd: number;
  with_support?: boolean;
  support_name?: string | null;
  support_unit_price_tnd?: number;
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
  delivery_fee: number;
  currency: string;
  status: string;
  created_at: string;
};

export type SiteSettingsRow = {
  id: number;
  delivery_fee_tnd: number;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  full_name: string;
  email: string;
  notes: string;
  created_at: string;
};

export type PreOrderItem = {
  slug: string;
  qty: number;
  unit_price_tnd: number;
  line_total_tnd: number;
  with_support?: boolean;
  support_name?: string | null;
  support_unit_price_tnd?: number;
};

export type PreOrderRow = {
  id: string;
  pre_order_ref: string;
  customer_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes: string | null;
  items: PreOrderItem[];
  total: number;
  delivery_fee: number;
  currency: string;
  status: string;
  created_at: string;
};

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
