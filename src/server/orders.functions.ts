import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getCanonicalPriceTND, generateOrderRef } from "./orders.server";

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
      }),
    )
    .min(1)
    .max(20),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    // Recompute items + total server-side from the canonical catalog.
    // Anything from the client (price, total, status) is discarded.
    const validatedItems: Array<{
      slug: string;
      qty: number;
      unit_price_tnd: number;
      line_total_tnd: number;
    }> = [];
    let total = 0;

    for (const item of data.items) {
      const unitPrice = getCanonicalPriceTND(item.slug);
      if (unitPrice == null) {
        return { ok: false as const, error: "Unknown product in cart." };
      }
      const lineTotal = unitPrice * item.qty;
      total += lineTotal;
      validatedItems.push({
        slug: item.slug,
        qty: item.qty,
        unit_price_tnd: unitPrice,
        line_total_tnd: lineTotal,
      });
    }

    const orderRef = generateOrderRef();

    const { error } = await supabaseAdmin.from("orders").insert({
      order_ref: orderRef,
      customer_name: data.name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      address: data.address,
      notes: data.notes ? data.notes : null,
      items: validatedItems,
      total,
      currency: "TND",
      status: "pending",
    });

    if (error) {
      console.error("placeOrder insert failed:", error.message);
      return { ok: false as const, error: "Could not save order." };
    }

    return { ok: true as const, orderRef, total };
  });
