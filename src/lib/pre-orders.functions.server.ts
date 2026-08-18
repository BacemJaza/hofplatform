import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getExternalSupabaseAdmin } from "@/integrations/supabase/external-admin.server";
import { generatePreOrderRef } from "../server/orders.server";
import { fetchDeliveryFeeTND } from "@/lib/settings.server";
import { getCanonicalProductPricing } from "../server/orders.server";

const preOrderEmailDeduplicationWindowMs = 15_000;
const recentPreOrderEmailRequests = new Map<
  string,
  { preOrderRef: string; total: number; createdAt: number }
>();

function getPreOrderEmailDeduplicationKey(
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

const preOrderSchema = z.object({
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

export const placePreOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => preOrderSchema.parse(input))
  .handler(async ({ data }) => {
    // Recompute items + total server-side from the canonical catalog + settings.
    // Unlike orders, pre-orders do NOT reduce stock.
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
        return { ok: false as const, error: "Unknown product in pre-order." };
      }

      // Pre-orders allow even if out of stock
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

    const emailDeduplicationKey = getPreOrderEmailDeduplicationKey(
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
    const existingPreOrderRequest = recentPreOrderEmailRequests.get(emailDeduplicationKey);

    if (
      existingPreOrderRequest &&
      now - existingPreOrderRequest.createdAt < preOrderEmailDeduplicationWindowMs
    ) {
      return {
        ok: true as const,
        preOrderRef: existingPreOrderRequest.preOrderRef,
        total: existingPreOrderRequest.total,
      };
    }

    const preOrderRef = generatePreOrderRef();
    recentPreOrderEmailRequests.set(emailDeduplicationKey, {
      preOrderRef,
      total,
      createdAt: now,
    });
    setTimeout(() => {
      recentPreOrderEmailRequests.delete(emailDeduplicationKey);
    }, preOrderEmailDeduplicationWindowMs);

    let insertErrorMessage: string | null = null;
    let tableMissing = false;

    try {
      const { error } = await getExternalSupabaseAdmin().from("pre_orders").insert({
        pre_order_ref: preOrderRef,
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
        insertErrorMessage.includes('relation "public.pre_orders"') ||
        insertErrorMessage.includes("does not exist");

      if (!tableMissing) {
        console.error("placePreOrder insert failed:", insertErrorMessage);
        const misconfigured =
          insertErrorMessage.includes("not configured") ||
          insertErrorMessage.includes("Missing Supabase");
        return {
          ok: false as const,
          error: misconfigured
            ? "Pre-order system is temporarily unavailable. Try again later."
            : "Could not save pre-order.",
        };
      }

      console.error("pre_orders table is unavailable.");
      return {
        ok: false as const,
        error: "Could not save pre-order.",
      };
    }

    return {
      ok: true as const,
      preOrderRef,
      total,
    };
  });
