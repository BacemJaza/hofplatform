export const EXPENSE_CATEGORIES = [
  "Materials",
  "Fabric",
  "Printing",
  "Supports",
  "Packaging",
  "Delivery",
  "Advertising",
  "Equipment",
  "Software",
  "Maintenance",
  "Office",
  "Services",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
