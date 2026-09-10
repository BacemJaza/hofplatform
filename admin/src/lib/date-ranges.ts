export type DatePeriod = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "prevMonth" | "thisYear" | "custom";
export type DateRange = { from: string; to: string };
function startOfDay(date: Date): Date { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
function endOfDay(date: Date): Date { const value = new Date(date); value.setHours(23, 59, 59, 999); return value; }
function startOfMonth(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(date: Date): Date { return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999); }
function startOfYear(date: Date): Date { return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0); }
export function getDateRange(period: DatePeriod, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  switch (period) {
    case "today": return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "yesterday": { const value = new Date(now); value.setDate(value.getDate() - 1); return { from: startOfDay(value).toISOString(), to: endOfDay(value).toISOString() }; }
    case "last7": { const value = new Date(now); value.setDate(value.getDate() - 6); return { from: startOfDay(value).toISOString(), to: endOfDay(now).toISOString() }; }
    case "last30": { const value = new Date(now); value.setDate(value.getDate() - 29); return { from: startOfDay(value).toISOString(), to: endOfDay(now).toISOString() }; }
    case "thisMonth": return { from: startOfMonth(now).toISOString(), to: endOfDay(now).toISOString() };
    case "prevMonth": { const value = new Date(now.getFullYear(), now.getMonth() - 1, 1); return { from: startOfMonth(value).toISOString(), to: endOfMonth(value).toISOString() }; }
    case "thisYear": return { from: startOfYear(now).toISOString(), to: endOfDay(now).toISOString() };
    case "custom": { if (!customFrom || !customTo) return getDateRange("last30"); return { from: startOfDay(new Date(customFrom)).toISOString(), to: endOfDay(new Date(customTo)).toISOString() }; }
    default: return getDateRange("last30");
  }
}
export const PERIOD_LABELS: Record<DatePeriod, string> = { today: "Today", yesterday: "Yesterday", last7: "Last 7 days", last30: "Last 30 days", thisMonth: "This month", prevMonth: "Previous month", thisYear: "This year", custom: "Custom range" };
