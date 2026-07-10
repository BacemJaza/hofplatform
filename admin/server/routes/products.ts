import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { supabase, type ProductRow } from "../supabase";

export const productsRouter = Router();
productsRouter.use(requireAuth);

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case.");

const productSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(200),
  price_eur: z.coerce.number().positive().max(99999),
  image_url: z.string().trim().min(1).max(500),
  story: z.string().trim().min(1).max(5000),
  tags: z.array(z.string().trim().min(1).max(60)).default([]),
  is_active: z.boolean().default(false),
});

const productUpdateSchema = productSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required.",
);

productsRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ products: data as ProductRow[] });
});

productsRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json({ product: data as ProductRow });
});

productsRouter.post("/", async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { data, error } = await supabase
    .from("products")
    .insert(parsed.data)
    .select("*")
    .single();

  if (error) {
    const message =
      error.code === "23505" ? "A product with this slug already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  res.status(201).json({ product: data as ProductRow });
});

productsRouter.put("/:id", async (req, res) => {
  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { data, error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    const message =
      error.code === "23505" ? "A product with this slug already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json({ product: data as ProductRow });
});

productsRouter.patch("/:id/active", async (req, res) => {
  const parsed = z.object({ is_active: z.boolean() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "is_active must be a boolean." });
    return;
  }

  const { data, error } = await supabase
    .from("products")
    .update({ is_active: parsed.data.is_active })
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json({ product: data as ProductRow });
});

productsRouter.delete("/:id", async (req, res) => {
  const { error, count } = await supabase
    .from("products")
    .delete({ count: "exact" })
    .eq("id", req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!count) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json({ ok: true });
});
