import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getExternalSupabaseAdmin } from "@/integrations/supabase/external-admin.server";
import { getCanonicalProductPricing, generateOrderRef } from "../server/orders.server";
import { fetchDeliveryFeeTND } from "@/lib/settings.server";
// Resend order emails disabled for now.
// import { sendOrderEmails } from "../server/notifications.server";
import { sendCheckoutSuccessEmail } from "../server/notifications.server";
import {
  calculateDiscountAmount,
  findActiveDiscountByCode,
  incrementDiscountUsage,
  normalizePromoCode,
} from "@/lib/discounts.server";

const orderEmailDeduplicationWindowMs = 15_000;
const recentOrderEmailRequests = new Map<
  string,
  { orderRef: string; total: number; createdAt: number }
>();

function getOrderEmailDeduplicationKey(
  data: {
    email: string;
    phone: string;
    items: Array<{ slug: string; qty: number; supportQty?: number }>;
  },
  total: number,
): string {
  const itemKey = data.items
    .map((item) => `${item.slug}:${item.qty}:${item.supportQty}`)
    .join("|");
  return `${data.email.toLowerCase()}:${data.phone}:${itemKey}:${total}`;
}

const orderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(4).max(40),
  city: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(60),
        qty: z.number().int().min(1).max(20),
        withSupport: z.boolean().default(false),
        supportQty: z.number().int().min(0).max(20).optional(),
      }),
    )
    .min(1)
    .max(20),
  promoCode: z.string().trim().max(40).optional().or(z.literal("")),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    // Recompute items + total server-side from the canonical catalog + settings.
    // Anything from the client (price, total, delivery fee, status) is discarded.
    const validatedItems: Array<{
      slug: string;
      qty: number;
      unit_price_tnd: number;
      with_support: boolean;
      support_qty: number;
      without_support_qty: number;
      support_name: string | null;
      support_unit_price_tnd: number;
      line_total_tnd: number;
    }> = [];
    let subtotal = 0;

    for (const item of data.items) {
      const pricing = await getCanonicalProductPricing(item.slug);
      if (pricing == null) {
        return { ok: false as const, error: "Unknown product in cart." };
      }

      if (pricing.quantity < item.qty) {
        return {
          ok: false as const,
          error:
            pricing.quantity === 0
              ? `${item.slug} is out of stock. Use pre-order instead.`
              : `Not enough stock for ${item.slug}. Only ${pricing.quantity} left.`,
        };
      }

      const supportQty = item.supportQty ?? (item.withSupport ? item.qty : 0);
      if (supportQty < 0 || supportQty > item.qty) {
        return { ok: false as const, error: "Support quantity must be between 0 and total quantity." };
      }
      if (supportQty > 0 && !pricing.supportEnabled) {
        return { ok: false as const, error: "Support is not available for one of the products." };
      }

      const withSupport = supportQty > 0 && pricing.supportEnabled;
      const supportUnit = withSupport ? pricing.supportPrice : 0;
      const lineTotal = pricing.unitPrice * item.qty + supportUnit * supportQty;
      subtotal += lineTotal;

      validatedItems.push({
        slug: item.slug,
        qty: item.qty,
        unit_price_tnd: pricing.unitPrice,
        with_support: withSupport,
        support_qty: supportQty,
        without_support_qty: item.qty - supportQty,
        support_name: withSupport ? pricing.supportName : null,
        support_unit_price_tnd: supportUnit,
        line_total_tnd: lineTotal,
      });
    }

    const deliveryFee = await fetchDeliveryFeeTND();

    let promoCode: string | null = null;
    let discountPercent: number | null = null;
    let discountAmount = 0;
    let appliedDiscountId: string | null = null;

    if (data.promoCode?.trim()) {
      const discount = await findActiveDiscountByCode(data.promoCode);
      if (!discount) {
        return { ok: false as const, error: "Invalid or inactive discount code." };
      }

      promoCode = normalizePromoCode(discount.code);
      discountPercent = discount.discountPercent;
      discountAmount = calculateDiscountAmount(subtotal, discountPercent);
      appliedDiscountId = discount.id;
    }

    const total = subtotal - discountAmount + deliveryFee;

    const emailDeduplicationKey = getOrderEmailDeduplicationKey(
      {
        email: data.email,
        phone: data.phone,
        items: data.items.map((i) => ({
          slug: i.slug,
          qty: i.qty,
          supportQty: i.supportQty,
        })),
      },
      total,
    );
    const now = Date.now();
    const existingOrderRequest = recentOrderEmailRequests.get(emailDeduplicationKey);

    if (
      existingOrderRequest &&
      now - existingOrderRequest.createdAt < orderEmailDeduplicationWindowMs
    ) {
      return {
        ok: true as const,
        orderRef: existingOrderRequest.orderRef,
        total: existingOrderRequest.total,
      };
    }

    const orderRef = generateOrderRef();
    recentOrderEmailRequests.set(emailDeduplicationKey, {
      orderRef,
      total,
      createdAt: now,
    });
    setTimeout(() => {
      recentOrderEmailRequests.delete(emailDeduplicationKey);
    }, orderEmailDeduplicationWindowMs);

    let insertErrorMessage: string | null = null;
    let tableMissing = false;

    try {
      const { error } = await getExternalSupabaseAdmin().from("orders").insert({
        order_ref: orderRef,
        customer_name: data.name,
        email: data.email,
        phone: data.phone,
        city: data.city,
        address: data.address,
        notes: data.notes ? data.notes : null,
        items: validatedItems,
        total,
        delivery_fee: deliveryFee,
        promo_code: promoCode,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        currency: "TND",
        status: "pending",
      });
      if (error) insertErrorMessage = error.message;
    } catch (err) {
      insertErrorMessage = err instanceof Error ? err.message : "Unknown error";
    }

    if (insertErrorMessage) {
      tableMissing =
        insertErrorMessage.includes("Could not find the table") ||
        insertErrorMessage.includes("schema cache") ||
        insertErrorMessage.includes('relation "public.orders"') ||
        insertErrorMessage.includes("does not exist");

      if (!tableMissing) {
        console.error("placeOrder insert failed:", insertErrorMessage);
        const misconfigured =
          insertErrorMessage.includes("not configured") ||
          insertErrorMessage.includes("Missing Supabase");
        return {
          ok: false as const,
          error: misconfigured
            ? "Checkout is temporarily unavailable. Try again later."
            : "Could not save order.",
        };
      }

      console.error("orders table is unavailable.");
      return {
        ok: false as const,
        error: "Could not save order.",
      };
    }

    // Resend order emails disabled for now.
    // try {
    //   await sendOrderEmails({
    //     orderRef,
    //     customerName: data.name,
    //     email: data.email,
    //     phone: data.phone,
    //     city: data.city,
    //     address: data.address,
    //     notes: data.notes ? data.notes : null,
    //     items: validatedItems,
    //     total,
    //   });
    // } catch (mailErr) {
    //   console.error("sendOrderEmails threw unexpectedly:", mailErr);
    // }

    if (appliedDiscountId) {
      await incrementDiscountUsage(appliedDiscountId);
    }

    try {
      await sendCheckoutSuccessEmail({
        email: data.email,
        customerName: data.name,
        discountActivated: Boolean(promoCode),
        promoCode,
      });
    } catch (mailErr) {
      console.error("sendCheckoutSuccessEmail failed:", mailErr);
    }

    return {
      ok: true as const,
      orderRef,
      total,
      deliveryFee,
      subtotal,
      promoCode,
      discountPercent,
      discountAmount,
    };
  });
