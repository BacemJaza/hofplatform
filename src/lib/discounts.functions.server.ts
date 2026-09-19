import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findActiveDiscountByCode, normalizePromoCode } from "@/lib/discounts.server";

const validatePromoSchema = z.object({
  code: z.string().trim().min(1).max(40),
});

export const validatePromoCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => validatePromoSchema.parse(input))
  .handler(async ({ data }) => {
    const discount = await findActiveDiscountByCode(data.code);

    if (!discount) {
      return {
        ok: false as const,
        error: "Invalid or inactive discount code.",
      };
    }

    return {
      ok: true as const,
      code: normalizePromoCode(discount.code),
      discountPercent: discount.discountPercent,
    };
  });
