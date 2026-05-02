// Server-only canonical product catalog (slug -> price in TND).
// Mirrors src/data/products.ts so prices cannot be manipulated from the client.

const EUR_TO_TND = 3.4;

// Only currently-purchasable pieces. Anything not listed here is rejected
// server-side regardless of what the client cart claims.
const CATALOG_EUR: Record<string, number> = {
  "no-rules": 89,
};

export function getCanonicalPriceTND(slug: string): number | null {
  const eur = CATALOG_EUR[slug];
  if (eur == null) return null;
  return Math.round(eur * EUR_TO_TND);
}

export function generateOrderRef(): string {
  return `KH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
