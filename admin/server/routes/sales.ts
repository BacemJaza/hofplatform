import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { computeSalesStats, type SalesGranularity } from "../lib/sales-stats";
import { supabase, type OrderRow } from "../supabase";

export const salesRouter = Router();
salesRouter.use(requireAuth);
const querySchema = z.object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }), granularity: z.enum(["daily", "monthly", "yearly"]).default("daily") });
salesRouter.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return; }
  const from = new Date(parsed.data.from); const to = new Date(parsed.data.to);
  if (from >= to) { res.status(400).json({ error: "Invalid date range: 'from' must be before 'to'." }); return; }
  const { data: orders, error: ordersError } = await supabase.from("orders").select("id, order_ref, customer_name, total, delivery_fee, currency, status, created_at, items").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).order("created_at", { ascending: false });
  if (ordersError) { res.status(500).json({ error: ordersError.message }); return; }
  const { data: products, error: productsError } = await supabase.from("products").select("slug, name");
  if (productsError) { res.status(500).json({ error: productsError.message }); return; }
  const productNames = new Map((products ?? []).map((product) => [product.slug, product.name]));
  const stats = computeSalesStats((orders ?? []) as OrderRow[], productNames, from, to, parsed.data.granularity as SalesGranularity);
  res.json({ stats });
});
