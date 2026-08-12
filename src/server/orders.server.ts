// Server-only canonical product prices (slug -> TND).

import { getProductPrice, getProductPricing } from "@/lib/products.server";

export async function getCanonicalPriceTND(slug: string): Promise<number | null> {
  try {
    return await getProductPrice(slug);
  } catch (error) {
    console.error(`Failed to resolve canonical price for ${slug}`, error);
    return null;
  }
}

export async function getCanonicalProductPricing(slug: string) {
  try {
    return await getProductPricing(slug);
  } catch (error) {
    console.error(`Failed to resolve canonical pricing for ${slug}`, error);
    return null;
  }
}

export function generateOrderRef(): string {
  return `KH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
