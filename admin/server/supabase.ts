import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  label: string;
  width_cm: number;
  height_cm: number;
  price_eur: number;
  discount_percent: number;
  quantity: number;
  image_url: string;
  image_urls: string[];
  story: string;
  tags: string[];
  is_active: boolean;
  status: "active" | "inactive" | "coming_soon";
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
  support_qty?: number;
  without_support_qty?: number;
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
  promo_code: string | null;
  discount_percent: number | null;
  discount_amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export type SiteSettingsRow = {
  id: number;
  delivery_fee_tnd: number;
  company_name?: string;
  company_address?: string | null;
  company_email?: string | null;
  company_phone?: string | null;
  company_logo_url?: string | null;
  updated_at: string;
};

export type ExpenseRow = {
  id: string;
  invoice_number: string | null;
  supplier_name: string | null;
  title: string;
  description: string | null;
  category: string;
  payment_date: string;
  amount_ht: number;
  vat_rate: number | null;
  vat_amount: number;
  amount_ttc: number;
  currency: string;
  payment_status: "paid" | "pending";
  attachment_path: string | null;
  notes: string | null;
  status: "active" | "voided";
  created_at: string;
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

export type DiscountRow = {
  id: string;
  code: string;
  discount_percent: number;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
