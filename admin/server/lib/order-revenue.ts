import type { OrderItem, OrderRow } from "../supabase";

function safeNumber(value: unknown): number {
  const number = Number(value);
  return !Number.isFinite(number) || number < 0 ? 0 : number;
}

export function countsAsRevenue(status: string): boolean {
  return status !== "cancelled";
}

function lineRevenue(item: OrderItem): number {
  const lineTotal = safeNumber(item.line_total_tnd);
  if (lineTotal > 0) return lineTotal;
  const quantity = safeNumber(item.qty);
  const unit = safeNumber(item.unit_price_tnd);
  const support = item.with_support ? safeNumber(item.support_unit_price_tnd) : 0;
  return (unit + support) * quantity;
}

export function orderRevenue(order: Pick<OrderRow, "total" | "delivery_fee" | "items">): number {
  const total = safeNumber(order.total);
  if (total > 0) return total;
  return (order.items ?? []).reduce((sum, item) => sum + lineRevenue(item), 0) + safeNumber(order.delivery_fee);
}
