import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getExternalSupabaseAdmin } from "@/integrations/supabase/external-admin.server";
import { getCanonicalProductPricing, generateOrderRef } from "../server/orders.server";
import { fetchDeliveryFeeTND } from "@/lib/settings.server";
// Resend order emails disabled for now.
// import { sendOrderEmails } from "../server/notifications.server";

const orderEmailDeduplicationWindowMs = 15_000;
const recentOrderEmailRequests = new Map<
  string,
  { orderRef: string; total: number; createdAt: number }
>();

function getOrderEmailDeduplicationKey(
  data: {
    email: string;
    phone: string;
    items: Array<{ slug: string; qty: number; withSupport: boolean }>;
  },
  total: number,
): string {
  const itemKey = data.items
    .map((item) => `${item.slug}:${item.qty}:${item.withSupport ? "s" : "b"}`)
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
      }),
    )
    .min(1)
    .max(20),
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

      const wantsSupport = Boolean(item.withSupport);
      if (wantsSupport && !pricing.supportEnabled) {
        return { ok: false as const, error: "Support is not available for one of the products." };
      }

      const withSupport = wantsSupport && pricing.supportEnabled;
      const supportUnit = withSupport ? pricing.supportPrice : 0;
      const unitWithSupport = pricing.unitPrice + supportUnit;
      const lineTotal = unitWithSupport * item.qty;
      subtotal += lineTotal;

      validatedItems.push({
        slug: item.slug,
        qty: item.qty,
        unit_price_tnd: pricing.unitPrice,
        with_support: withSupport,
        support_name: withSupport ? pricing.supportName : null,
        support_unit_price_tnd: supportUnit,
        line_total_tnd: lineTotal,
      });
    }

    const deliveryFee = await fetchDeliveryFeeTND();
    const total = subtotal + deliveryFee;

    const emailDeduplicationKey = getOrderEmailDeduplicationKey(
      {
        email: data.email,
        phone: data.phone,
        items: data.items.map((i) => ({
          slug: i.slug,
          qty: i.qty,
          withSupport: Boolean(i.withSupport),
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

    return { ok: true as const, orderRef, total, deliveryFee, subtotal };
  });
