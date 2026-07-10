// Convert legacy EUR strings in product data to Tunisian Dinar.
// Approx 1 EUR ≈ 3.4 TND — rounded.

export function parseEuro(s: string): number {
  return Number(s.replace(/[^0-9.]/g, "")) || 0;
}

export function toTND(eur: string | number): number {
  const value = typeof eur === "number" ? eur : parseEuro(eur);
  return Math.round(value * 3.4);
}

export function formatTND(eur: string | number): string {
  return `${toTND(eur)} TND`;
}

export function formatTotalTND(eurTotal: number): string {
  return `${Math.round(eurTotal * 3.4)} TND`;
}
