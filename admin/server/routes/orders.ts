import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { supabase, type OrderRow } from "../supabase";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

const orderItemSchema = z.object({
  slug: z.string().trim().min(1).max(60),
  qty: z.coerce.number().int().min(1).max(99),
  unit_price_tnd: z.coerce.number().nonnegative(),
  line_total_tnd: z.coerce.number().nonnegative(),
});

const orderSchema = z.object({
  order_ref: z.string().trim().min(1).max(40),
  customer_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(4).max(40),
  city: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(1000).nullable().optional(),
  items: z.array(orderItemSchema).min(1).max(20),
  total: z.coerce.number().nonnegative(),
  currency: z.string().trim().min(1).max(10).default("TND"),
  status: z.enum(ORDER_STATUSES).default("pending"),
});

const orderUpdateSchema = orderSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required.",
);

ordersRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ orders: data as OrderRow[] });
});

ordersRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json({ order: data as OrderRow });
});

ordersRouter.post("/", async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const payload = {
    ...parsed.data,
    notes: parsed.data.notes ?? null,
  };

  const { data, error } = await supabase.from("orders").insert(payload).select("*").single();

  if (error) {
    const message =
      error.code === "23505" ? "An order with this reference already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  res.status(201).json({ order: data as OrderRow });
});

ordersRouter.put("/:id", async (req, res) => {
  const parsed = orderUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const payload = {
    ...parsed.data,
    notes: parsed.data.notes === undefined ? undefined : (parsed.data.notes ?? null),
  };

  const { data, error } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    const message =
      error.code === "23505" ? "An order with this reference already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json({ order: data as OrderRow });
});

ordersRouter.delete("/:id", async (req, res) => {
  const { error, count } = await supabase
    .from("orders")
    .delete({ count: "exact" })
    .eq("id", req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!count) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json({ ok: true });
});

export { ORDER_STATUSES };
