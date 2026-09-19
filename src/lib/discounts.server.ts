import { getExternalSupabaseAdmin } from "@/integrations/supabase/external-admin.server";

export type DiscountRow = {
  id: string;
  code: string;
  discount_percent: number;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AppliedDiscount = {
  id: string;
  code: string;
  discountPercent: number;
};

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export function calculateDiscountAmount(subtotal: number, discountPercent: number): number {
  return Math.round(subtotal * (discountPercent / 100));
}

export async function findActiveDiscountByCode(
  code: string,
): Promise<AppliedDiscount | null> {
  const normalized = normalizePromoCode(code);
  if (!normalized) return null;

  const { data, error } = await getExternalSupabaseAdmin()
    .from("discounts")
    .select("id, code, discount_percent, is_active")
    .ilike("code", normalized)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;

  return {
    id: data.id,
    code: data.code,
    discountPercent: Number(data.discount_percent),
  };
}

export async function incrementDiscountUsage(discountId: string): Promise<void> {
  const { error } = await getExternalSupabaseAdmin().rpc("increment_discount_usage", {
    discount_id: discountId,
  });

  if (error) {
    console.error("incrementDiscountUsage failed:", error.message);
  }
}
