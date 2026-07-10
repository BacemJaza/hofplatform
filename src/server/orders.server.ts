// Server-only canonical product catalog (slug -> price in TND).
// Prices are resolved from the Supabase products table so the storefront and checkout stay aligned.

import { getProductPriceEur } from "@/lib/products.server";

const EUR_TO_TND = 3.4;

export async function getCanonicalPriceTND(slug: string): Promise<number | null> {
  try {
    const eur = await getProductPriceEur(slug);
    if (eur == null) return null;
    return Math.round(eur * EUR_TO_TND);
  } catch (error) {
    console.error(`Failed to resolve canonical price for ${slug}`, error);
    return null;
  }
}

export function generateOrderRef(): string {
  return `KH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
