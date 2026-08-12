export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTnd(value: number): string {
  return `${Math.round(value)} TND`;
}

export function formatMoney(value: number, currency: string): string {
  return `${Math.round(value)} ${currency}`;
}

export function generateOrderRef(): string {
  return `KH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function joinTags(tags: string[]): string {
  return tags.join(", ");
}
