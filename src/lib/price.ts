// Convert legacy EUR strings in product data to Tunisian Dinar.
// Approx 1 EUR ≈ 3.4 TND — rounded.

export function parseEuro(s: string): number {
  return Number(s.replace(/[^0-9.]/g, "")) || 0;
}

export function toTND(eurString: string): number {
  const eur = parseEuro(eurString);
  return Math.round(eur * 3.4);
}

export function formatTND(eurString: string): string {
  return `${toTND(eurString)} TND`;
}

export function formatTotalTND(eurTotal: number): string {
  return `${Math.round(eurTotal * 3.4)} TND`;
}
