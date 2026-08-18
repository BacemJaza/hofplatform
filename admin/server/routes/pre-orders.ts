import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { supabase, type PreOrderRow } from "../supabase";

export const preOrdersRouter = Router();
preOrdersRouter.use(requireAuth);

const PRE_ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

const preOrderItemSchema = z.object({
  slug: z.string().trim().min(1).max(60),
  qty: z.coerce.number().int().min(1).max(99),
  unit_price_tnd: z.coerce.number().nonnegative(),
  line_total_tnd: z.coerce.number().nonnegative(),
  with_support: z.boolean().optional(),
  support_name: z.string().trim().max(120).nullable().optional(),
  support_unit_price_tnd: z.coerce.number().nonnegative().optional(),
});

const preOrderSchema = z.object({
  pre_order_ref: z.string().trim().min(1).max(40),
  customer_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(4).max(40),
  city: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(1000).nullable().optional(),
  items: z.array(preOrderItemSchema).min(1).max(20),
  total: z.coerce.number().nonnegative(),
  delivery_fee: z.coerce.number().nonnegative().default(0),
  currency: z.string().trim().min(1).max(10).default("TND"),
  status: z.enum(PRE_ORDER_STATUSES).default("pending"),
});

const preOrderUpdateSchema = preOrderSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required.",
);

preOrdersRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("pre_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ preOrders: data as PreOrderRow[] });
});

preOrdersRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("pre_orders")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Pre-order not found." });
    return;
  }
  res.json({ preOrder: data as PreOrderRow });
});

preOrdersRouter.delete("/:id", async (req, res) => {
  const { error } = await supabase.from("pre_orders").delete().eq("id", req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

// Convert pre-order to order
preOrdersRouter.post("/:id/activate", async (req, res) => {
  const preOrderId = req.params.id;

  try {
    // Get the pre-order
    const { data: preOrder, error: preOrderError } = await supabase
      .from("pre_orders")
      .select("*")
      .eq("id", preOrderId)
      .maybeSingle();

    if (preOrderError) {
      res.status(500).json({ error: preOrderError.message });
      return;
    }

    if (!preOrder) {
      res.status(404).json({ error: "Pre-order not found." });
      return;
    }

    // Generate order reference from pre-order reference (PO-XXXX -> OR-XXXX)
    const orderRef = preOrder.pre_order_ref.replace(/^PO-/, "OR-");

    // Create order with same data
    const orderData = {
      order_ref: orderRef,
      customer_name: preOrder.customer_name,
      email: preOrder.email,
      phone: preOrder.phone,
      city: preOrder.city,
      address: preOrder.address,
      notes: preOrder.notes,
      items: preOrder.items,
      total: preOrder.total,
      delivery_fee: preOrder.delivery_fee,
      currency: preOrder.currency,
      status: "confirmed",
    };

    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select("*")
      .single();

    if (orderError) {
      const message =
        orderError.code === "23505" ? "An order with this reference already exists." : orderError.message;
      res.status(orderError.code === "23505" ? 409 : 500).json({ error: message });
      return;
    }

    // Delete the pre-order
    await supabase.from("pre_orders").delete().eq("id", preOrderId);

    res.json({ ok: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ error: "Failed to activate pre-order." });
  }
});

export default preOrdersRouter;
