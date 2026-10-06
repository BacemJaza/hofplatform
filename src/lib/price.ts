export function parsePrice(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return Number(value.replace(/[^0-9.]/g, "")) || 0;
}

export function formatTND(value: string | number): string {
  const amount = Math.round(parsePrice(value) * 1000) / 1000;
  return `${amount.toFixed(3).replace(/\.?0+$/, "")} TND`;
}
