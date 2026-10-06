export type DatePeriod =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "last7"
  | "last30"
  | "thisMonth"
  | "prevMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "custom";

export type FacturationDatePeriod = Exclude<DatePeriod, "last7" | "last30">;

export type DateRange = { from: string; to: string };

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function startOfWeekMonday(date: Date): Date {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function endOfWeekSunday(date: Date): Date {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

export function getDateRange(period: DatePeriod, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "yesterday": {
      const value = new Date(now);
      value.setDate(value.getDate() - 1);
      return { from: startOfDay(value).toISOString(), to: endOfDay(value).toISOString() };
    }
    case "thisWeek":
      return { from: startOfWeekMonday(now).toISOString(), to: endOfDay(now).toISOString() };
    case "lastWeek": {
      const lastWeekEnd = new Date(startOfWeekMonday(now));
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      const lastWeekStart = startOfWeekMonday(lastWeekEnd);
      return { from: startOfDay(lastWeekStart).toISOString(), to: endOfWeekSunday(lastWeekEnd).toISOString() };
    }
    case "last7": {
      const value = new Date(now);
      value.setDate(value.getDate() - 6);
      return { from: startOfDay(value).toISOString(), to: endOfDay(now).toISOString() };
    }
    case "last30": {
      const value = new Date(now);
      value.setDate(value.getDate() - 29);
      return { from: startOfDay(value).toISOString(), to: endOfDay(now).toISOString() };
    }
    case "thisMonth":
      return { from: startOfMonth(now).toISOString(), to: endOfDay(now).toISOString() };
    case "prevMonth":
    case "lastMonth": {
      const value = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(value).toISOString(), to: endOfMonth(value).toISOString() };
    }
    case "thisYear":
      return { from: startOfYear(now).toISOString(), to: endOfDay(now).toISOString() };
    case "lastYear": {
      const value = new Date(now.getFullYear() - 1, 0, 1);
      return { from: startOfYear(value).toISOString(), to: endOfYear(value).toISOString() };
    }
    case "custom": {
      if (!customFrom || !customTo) return getDateRange("last30");
      return {
        from: startOfDay(new Date(customFrom)).toISOString(),
        to: endOfDay(new Date(customTo)).toISOString(),
      };
    }
    default:
      return getDateRange("last30");
  }
}

export const PERIOD_LABELS: Record<DatePeriod, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This week",
  lastWeek: "Last week",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisMonth: "This month",
  prevMonth: "Previous month",
  lastMonth: "Last month",
  thisYear: "This year",
  lastYear: "Last year",
  custom: "Custom range",
};

export const FACTURATION_PERIODS: FacturationDatePeriod[] = [
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "lastYear",
  "custom",
];
