import { parseMoney, roundMoney } from "./money";

export type ExpenseAmountInput = {
  amount_ht: unknown;
  vat_enabled: boolean;
  vat_rate: unknown;
  vat_amount?: unknown;
  amount_ttc?: unknown;
};

export type ExpenseAmounts = {
  amount_ht: number;
  vat_rate: number | null;
  vat_amount: number;
  amount_ttc: number;
};

export function computeExpenseAmounts(input: ExpenseAmountInput): ExpenseAmounts {
  const amount_ht = parseMoney(input.amount_ht);
  if (!input.vat_enabled) {
    return {
      amount_ht,
      vat_rate: null,
      vat_amount: 0,
      amount_ttc: amount_ht,
    };
  }

  const rate = input.vat_rate == null || input.vat_rate === "" ? null : parseMoney(input.vat_rate);
  if (rate == null || rate <= 0) {
    return {
      amount_ht,
      vat_rate: null,
      vat_amount: 0,
      amount_ttc: amount_ht,
    };
  }

  const vat_amount = roundMoney((amount_ht * rate) / 100);
  const amount_ttc = roundMoney(amount_ht + vat_amount);
  return { amount_ht, vat_rate: rate, vat_amount, amount_ttc };
}
