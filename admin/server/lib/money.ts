export function roundMoney(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function parseMoney(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return roundMoney(number);
}
