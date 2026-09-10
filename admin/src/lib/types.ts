export type Product = {
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
  support_qty?: number;
  without_support_qty?: number;
  support_name?: string | null;
  support_unit_price_tnd?: number;
};

export type Order = {
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

export type PreOrderItem = {
  slug: string;
  qty: number;
  unit_price_tnd: number;
  line_total_tnd: number;
  with_support?: boolean;
  support_name?: string | null;
  support_unit_price_tnd?: number;
};

export type PreOrder = {
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

export type SiteSettings = {
  id: number;
  delivery_fee_tnd: number;
  updated_at: string;
};

export type Message = {
  id: string;
  full_name: string;
  email: string;
  notes: string;
  created_at: string;
};

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type SalesGranularity = "daily" | "monthly" | "yearly";

export type SalesSummary = {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  productsSold: number;
  currency: string;
};

export type OrdersByStatus = {
  completed: number;
  pending: number;
  cancelled: number;
};

export type RevenuePoint = {
  period: string;
  label: string;
  revenue: number;
  orders: number;
};

export type TopProduct = {
  slug: string;
  name: string;
  quantity: number;
  revenue: number;
};

export type RecentOrder = {
  id: string;
  order_ref: string;
  customer_name: string;
  total: number;
  currency: string;
  status: string;
  created_at: string;
};

export type SalesStats = {
  summary: SalesSummary;
  ordersByStatus: OrdersByStatus;
  revenueSeries: RevenuePoint[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
};
