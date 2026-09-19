import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { supabase, type DiscountRow } from "../supabase";

export const discountsRouter = Router();
discountsRouter.use(requireAuth);

const promoCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z0-9-]+$/, "Code must contain only letters, numbers, and hyphens.")
  .transform((value) => value.toUpperCase());

const discountSchema = z.object({
  code: promoCodeSchema,
  discount_percent: z.coerce.number().positive().max(100),
  is_active: z.boolean().default(true),
});

const discountUpdateSchema = z
  .object({
    code: promoCodeSchema.optional(),
    discount_percent: z.coerce.number().positive().max(100).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field is required.");

discountsRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("discounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ discounts: data as DiscountRow[] });
});

discountsRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("discounts")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Discount not found." });
    return;
  }
  res.json({ discount: data as DiscountRow });
});

discountsRouter.post("/", async (req, res) => {
  const parsed = discountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { data, error } = await supabase
    .from("discounts")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) {
    const message =
      error.code === "23505" ? "A discount with this code already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  res.status(201).json({ discount: data as DiscountRow });
});

discountsRouter.put("/:id", async (req, res) => {
  const parsed = discountUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { data, error } = await supabase
    .from("discounts")
    .update(parsed.data)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    const message =
      error.code === "23505" ? "A discount with this code already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Discount not found." });
    return;
  }
  res.json({ discount: data as DiscountRow });
});

discountsRouter.patch("/:id/status", async (req, res) => {
  const parsed = z.object({ is_active: z.boolean() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { data, error } = await supabase
    .from("discounts")
    .update({ is_active: parsed.data.is_active })
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Discount not found." });
    return;
  }
  res.json({ discount: data as DiscountRow });
});

discountsRouter.delete("/:id", async (req, res) => {
  const { error, count } = await supabase
    .from("discounts")
    .delete({ count: "exact" })
    .eq("id", req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!count) {
    res.status(404).json({ error: "Discount not found." });
    return;
  }
  res.json({ ok: true });
});
