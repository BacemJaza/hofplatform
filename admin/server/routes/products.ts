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

const imageUrlSchema = z.string().trim().min(1).max(500);

const productSchema = z
  .object({
    slug: slugSchema,
    name: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(200),
    price_eur: z.coerce.number().positive().max(99999),
    quantity: z.coerce.number().nonnegative().max(999999).default(0),
    image_urls: z.array(imageUrlSchema).min(1).max(20),
    story: z.string().trim().min(1).max(5000),
    tags: z.array(z.string().trim().min(1).max(60)).default([]),
    is_active: z.boolean().default(false),
    support_enabled: z.boolean().default(false),
    support_name: z.string().trim().max(120).nullable().optional(),
    support_price_eur: z.coerce.number().min(0).max(99999).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.support_enabled) {
      if (!data.support_name || data.support_name.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["support_name"],
          message: "Support name is required when support is enabled.",
        });
      }
      if (data.support_price_eur == null || Number.isNaN(data.support_price_eur)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["support_price_eur"],
          message: "Support price is required when support is enabled.",
        });
      }
    }
  })
  .transform((data) => {
    const image_urls = data.image_urls.map((u) => u.trim()).filter(Boolean);
    const support_enabled = data.support_enabled;
    return {
      slug: data.slug,
      name: data.name,
      label: data.label,
      price_eur: data.price_eur,
      quantity: data.quantity,
      image_urls,
      image_url: image_urls[0],
      story: data.story,
      tags: data.tags,
      is_active: data.is_active,
      support_enabled,
      support_name: support_enabled ? data.support_name!.trim() : null,
      support_price_eur: support_enabled ? Number(data.support_price_eur) : null,
    };
  });

const productUpdateSchema = z
  .object({
    slug: slugSchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    label: z.string().trim().min(1).max(200).optional(),
    price_eur: z.coerce.number().positive().max(99999).optional(),
    quantity: z.coerce.number().nonnegative().max(999999).optional(),
    image_urls: z.array(imageUrlSchema).min(1).max(20).optional(),
    story: z.string().trim().min(1).max(5000).optional(),
    tags: z.array(z.string().trim().min(1).max(60)).optional(),
    is_active: z.boolean().optional(),
    support_enabled: z.boolean().optional(),
    support_name: z.string().trim().max(120).nullable().optional(),
    support_price_eur: z.coerce.number().min(0).max(99999).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field is required.")
  .superRefine((data, ctx) => {
    if (data.support_enabled === true) {
      if (data.support_name != null && data.support_name.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["support_name"],
          message: "Support name is required when support is enabled.",
        });
      }
    }
  })
  .transform((data) => {
    const next: Record<string, unknown> = { ...data };
    if (data.image_urls) {
      const image_urls = data.image_urls.map((u) => u.trim()).filter(Boolean);
      next.image_urls = image_urls;
      next.image_url = image_urls[0];
    }
    if (data.support_enabled === false) {
      next.support_name = null;
      next.support_price_eur = null;
    }
    return next;
  });

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
