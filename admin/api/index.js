// server/app.ts
import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

// server/routes/auth.ts
import { Router } from "express";
import { z } from "zod";

// server/auth.ts
import crypto from "node:crypto";

// server/env.ts
import "dotenv/config";
function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
function assertServiceRoleKey(key) {
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is a publishable key. Use the Supabase secret/service_role key so admin writes can bypass RLS."
    );
  }
  if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8")
      );
      if (payload.role === "anon") {
        throw new Error(
          "SUPABASE_SERVICE_ROLE_KEY is an anon JWT. Use the service_role secret from Supabase \u2192 Project Settings \u2192 API."
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        throw err;
      }
    }
  }
  return key;
}
var env = {
  port: Number(process.env.PORT ?? 3001),
  adminAccessCode: required("ADMIN_ACCESS_CODE"),
  sessionSecret: required("SESSION_SECRET"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: assertServiceRoleKey(required("SUPABASE_SERVICE_ROLE_KEY")),
  /** Storefront origin for resolving relative product image paths (e.g. http://localhost:5173). */
  storefrontUrl: process.env.STOREFRONT_URL?.trim() || "http://localhost:5173",
  isProduction: process.env.NODE_ENV === "production"
};

// server/auth.ts
var COOKIE_NAME = "hof_admin_session";
var SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
function sign(payload) {
  return crypto.createHmac("sha256", env.sessionSecret).update(payload).digest("hex");
}
function createSessionToken() {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `admin:${expires}`;
  return `${payload}.${sign(payload)}`;
}
function verifySessionToken(token) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (sign(payload) !== signature) return false;
  const [, expiresRaw] = payload.split(":");
  const expires = Number(expiresRaw);
  return Number.isFinite(expires) && expires > Date.now();
}
function setSessionCookie(res) {
  const token = createSessionToken();
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: SESSION_TTL_MS,
    path: "/"
  });
}
function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}
function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
function checkAccessCode(code) {
  const a = Buffer.from(code.trim());
  const b = Buffer.from(env.adminAccessCode);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// server/routes/auth.ts
var authRouter = Router();
authRouter.post("/login", (req, res) => {
  const parsed = z.object({ code: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Access code is required." });
    return;
  }
  if (!checkAccessCode(parsed.data.code)) {
    res.status(401).json({ error: "Invalid access code." });
    return;
  }
  setSessionCookie(res);
  res.json({ ok: true });
});
authRouter.post("/logout", requireAuth, (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
authRouter.get("/me", (req, res) => {
  const token = req.cookies.hof_admin_session;
  res.json({ authenticated: verifySessionToken(token) });
});

// server/routes/products.ts
import { Router as Router2 } from "express";
import { z as z2 } from "zod";

// server/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// server/routes/products.ts
var productsRouter = Router2();
productsRouter.use(requireAuth);
var slugSchema = z2.string().trim().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case.");
var imageUrlSchema = z2.string().trim().min(1).max(500);
var productStatusSchema = z2.enum(["active", "inactive", "coming_soon"]);
var productSchema = z2.object({
  slug: slugSchema,
  name: z2.string().trim().min(1).max(120),
  label: z2.string().trim().min(1).max(200),
  width_cm: z2.coerce.number().positive().max(999).default(90),
  height_cm: z2.coerce.number().positive().max(999).default(140),
  price_eur: z2.coerce.number().positive().max(99999),
  discount_percent: z2.coerce.number().min(0).max(100).default(0),
  quantity: z2.coerce.number().nonnegative().max(999999).default(0),
  image_urls: z2.array(imageUrlSchema).min(1).max(20),
  story: z2.string().trim().min(1).max(5e3),
  tags: z2.array(z2.string().trim().min(1).max(60)).default([]),
  is_active: z2.boolean().default(false),
  status: productStatusSchema.optional(),
  support_enabled: z2.boolean().default(false),
  support_name: z2.string().trim().max(120).nullable().optional(),
  support_price_eur: z2.coerce.number().min(0).max(99999).nullable().optional()
}).superRefine((data, ctx) => {
  if (data.support_enabled) {
    if (!data.support_name || data.support_name.trim().length === 0) {
      ctx.addIssue({
        code: z2.ZodIssueCode.custom,
        path: ["support_name"],
        message: "Support name is required when support is enabled."
      });
    }
    if (data.support_price_eur == null || Number.isNaN(data.support_price_eur)) {
      ctx.addIssue({
        code: z2.ZodIssueCode.custom,
        path: ["support_price_eur"],
        message: "Support price is required when support is enabled."
      });
    }
  }
}).transform((data) => {
  const image_urls = data.image_urls.map((u) => u.trim()).filter(Boolean);
  const support_enabled = data.support_enabled;
  return {
    slug: data.slug,
    name: data.name,
    label: data.label,
    width_cm: data.width_cm,
    height_cm: data.height_cm,
    price_eur: data.price_eur,
    discount_percent: data.discount_percent,
    quantity: data.quantity,
    image_urls,
    image_url: image_urls[0],
    story: data.story,
    tags: data.tags,
    is_active: data.status ? data.status !== "inactive" : data.is_active,
    status: data.status ?? (data.is_active ? "active" : "inactive"),
    support_enabled,
    support_name: support_enabled ? data.support_name.trim() : null,
    support_price_eur: support_enabled ? Number(data.support_price_eur) : null
  };
});
var productUpdateSchema = z2.object({
  slug: slugSchema.optional(),
  name: z2.string().trim().min(1).max(120).optional(),
  label: z2.string().trim().min(1).max(200).optional(),
  width_cm: z2.coerce.number().positive().max(999).optional(),
  height_cm: z2.coerce.number().positive().max(999).optional(),
  price_eur: z2.coerce.number().positive().max(99999).optional(),
  discount_percent: z2.coerce.number().min(0).max(100).optional(),
  quantity: z2.coerce.number().nonnegative().max(999999).optional(),
  image_urls: z2.array(imageUrlSchema).min(1).max(20).optional(),
  story: z2.string().trim().min(1).max(5e3).optional(),
  tags: z2.array(z2.string().trim().min(1).max(60)).optional(),
  is_active: z2.boolean().optional(),
  status: productStatusSchema.optional(),
  support_enabled: z2.boolean().optional(),
  support_name: z2.string().trim().max(120).nullable().optional(),
  support_price_eur: z2.coerce.number().min(0).max(99999).nullable().optional()
}).refine((data) => Object.keys(data).length > 0, "At least one field is required.").superRefine((data, ctx) => {
  if (data.support_enabled === true) {
    if (data.support_name != null && data.support_name.trim().length === 0) {
      ctx.addIssue({
        code: z2.ZodIssueCode.custom,
        path: ["support_name"],
        message: "Support name is required when support is enabled."
      });
    }
  }
}).transform((data) => {
  const next = { ...data };
  if (data.image_urls) {
    const image_urls = data.image_urls.map((u) => u.trim()).filter(Boolean);
    next.image_urls = image_urls;
    next.image_url = image_urls[0];
  }
  if (data.support_enabled === false) {
    next.support_name = null;
    next.support_price_eur = null;
  }
  if (data.status) {
    next.is_active = data.status !== "inactive";
  } else if (data.is_active !== void 0) {
    next.status = data.is_active ? "active" : "inactive";
  }
  return next;
});
productsRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ products: data });
});
productsRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase.from("products").select("*").eq("id", req.params.id).maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json({ product: data });
});
productsRouter.post("/", async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { data, error } = await supabase.from("products").insert(parsed.data).select("*").single();
  if (error) {
    const message = error.code === "23505" ? "A product with this slug already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  res.status(201).json({ product: data });
});
productsRouter.put("/:id", async (req, res) => {
  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { data, error } = await supabase.from("products").update(parsed.data).eq("id", req.params.id).select("*").maybeSingle();
  if (error) {
    const message = error.code === "23505" ? "A product with this slug already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json({ product: data });
});
productsRouter.patch("/:id/active", async (req, res) => {
  const parsed = z2.object({ is_active: z2.boolean() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "is_active must be a boolean." });
    return;
  }
  const { data, error } = await supabase.from("products").update({
    is_active: parsed.data.is_active,
    status: parsed.data.is_active ? "active" : "inactive"
  }).eq("id", req.params.id).select("*").maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json({ product: data });
});
productsRouter.patch("/:id/status", async (req, res) => {
  const parsed = z2.object({ status: productStatusSchema }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "status must be active, inactive, or coming_soon." });
    return;
  }
  const { data, error } = await supabase.from("products").update({
    status: parsed.data.status,
    is_active: parsed.data.status !== "inactive"
  }).eq("id", req.params.id).select("*").maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json({ product: data });
});
productsRouter.delete("/:id", async (req, res) => {
  const { error, count } = await supabase.from("products").delete({ count: "exact" }).eq("id", req.params.id);
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

// server/routes/orders.ts
import { Router as Router3 } from "express";
import { z as z3 } from "zod";
var ordersRouter = Router3();
ordersRouter.use(requireAuth);
var ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
var orderItemSchema = z3.object({
  slug: z3.string().trim().min(1).max(60),
  qty: z3.coerce.number().int().min(1).max(99),
  unit_price_tnd: z3.coerce.number().nonnegative(),
  line_total_tnd: z3.coerce.number().nonnegative(),
  with_support: z3.boolean().optional(),
  support_qty: z3.coerce.number().int().min(0).optional(),
  without_support_qty: z3.coerce.number().int().min(0).optional(),
  support_name: z3.string().trim().max(120).nullable().optional(),
  support_unit_price_tnd: z3.coerce.number().nonnegative().optional()
}).refine((item) => (item.support_qty ?? (item.with_support ? item.qty : 0)) <= item.qty, {
  message: "Support quantity cannot exceed total quantity.",
  path: ["support_qty"]
});
var orderSchema = z3.object({
  order_ref: z3.string().trim().min(1).max(40),
  customer_name: z3.string().trim().min(1).max(120),
  email: z3.string().trim().email().max(255),
  phone: z3.string().trim().min(4).max(40),
  city: z3.string().trim().min(1).max(120),
  address: z3.string().trim().min(1).max(500),
  notes: z3.string().trim().max(1e3).nullable().optional(),
  items: z3.array(orderItemSchema).min(1).max(20),
  total: z3.coerce.number().nonnegative(),
  delivery_fee: z3.coerce.number().nonnegative().default(0),
  promo_code: z3.string().trim().max(40).nullable().optional(),
  discount_percent: z3.coerce.number().min(0).max(100).nullable().optional(),
  discount_amount: z3.coerce.number().nonnegative().default(0),
  currency: z3.string().trim().min(1).max(10).default("TND"),
  status: z3.enum(ORDER_STATUSES).default("pending")
});
var orderUpdateSchema = orderSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required."
);
ordersRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ orders: data });
});
ordersRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase.from("orders").select("*").eq("id", req.params.id).maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json({ order: data });
});
ordersRouter.post("/", async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const payload = {
    ...parsed.data,
    notes: parsed.data.notes ?? null
  };
  const { data, error } = await supabase.from("orders").insert(payload).select("*").single();
  if (error) {
    const message = error.code === "23505" ? "An order with this reference already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  res.status(201).json({ order: data });
});
ordersRouter.put("/:id", async (req, res) => {
  const parsed = orderUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const payload = {
    ...parsed.data,
    notes: parsed.data.notes === void 0 ? void 0 : parsed.data.notes ?? null
  };
  const { data, error } = await supabase.from("orders").update(payload).eq("id", req.params.id).select("*").maybeSingle();
  if (error) {
    const message = error.code === "23505" ? "An order with this reference already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Order not found." });
    return;
  }
  res.json({ order: data });
});
ordersRouter.delete("/:id", async (req, res) => {
  const { error, count } = await supabase.from("orders").delete({ count: "exact" }).eq("id", req.params.id);
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

// server/routes/pre-orders.ts
import { Router as Router4 } from "express";
var preOrdersRouter = Router4();
preOrdersRouter.use(requireAuth);
preOrdersRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase.from("pre_orders").select("*").order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ preOrders: data });
});
preOrdersRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase.from("pre_orders").select("*").eq("id", req.params.id).maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Pre-order not found." });
    return;
  }
  res.json({ preOrder: data });
});
preOrdersRouter.delete("/:id", async (req, res) => {
  const { error } = await supabase.from("pre_orders").delete().eq("id", req.params.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});
preOrdersRouter.post("/:id/activate", async (req, res) => {
  const preOrderId = req.params.id;
  try {
    const { data: preOrder, error: preOrderError } = await supabase.from("pre_orders").select("*").eq("id", preOrderId).maybeSingle();
    if (preOrderError) {
      res.status(500).json({ error: preOrderError.message });
      return;
    }
    if (!preOrder) {
      res.status(404).json({ error: "Pre-order not found." });
      return;
    }
    const orderRef = preOrder.pre_order_ref.replace(/^PO-/, "OR-");
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
      status: "confirmed"
    };
    const { data: newOrder, error: orderError } = await supabase.from("orders").insert(orderData).select("*").single();
    if (orderError) {
      const message = orderError.code === "23505" ? "An order with this reference already exists." : orderError.message;
      res.status(orderError.code === "23505" ? 409 : 500).json({ error: message });
      return;
    }
    await supabase.from("pre_orders").delete().eq("id", preOrderId);
    res.json({ ok: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ error: "Failed to activate pre-order." });
  }
});

// server/routes/messages.ts
import { Router as Router5 } from "express";
var messagesRouter = Router5();
messagesRouter.use(requireAuth);
messagesRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ messages: data });
});
messagesRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase.from("contact_messages").select("*").eq("id", req.params.id).maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Message not found." });
    return;
  }
  res.json({ message: data });
});
messagesRouter.delete("/:id", async (req, res) => {
  const { error, count } = await supabase.from("contact_messages").delete({ count: "exact" }).eq("id", req.params.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!count) {
    res.status(404).json({ error: "Message not found." });
    return;
  }
  res.json({ ok: true });
});

// server/routes/settings.ts
import { Router as Router6 } from "express";
import { z as z4 } from "zod";
var settingsRouter = Router6();
settingsRouter.use(requireAuth);
var settingsSchema = z4.object({
  delivery_fee_tnd: z4.coerce.number().min(0).max(99999)
});
settingsRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    const { data: created, error: insertError } = await supabase.from("site_settings").insert({ id: 1, delivery_fee_tnd: 8 }).select("*").single();
    if (insertError) {
      res.status(500).json({ error: insertError.message });
      return;
    }
    res.json({ settings: created });
    return;
  }
  res.json({ settings: data });
});
settingsRouter.put("/", async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { data, error } = await supabase.from("site_settings").upsert({ id: 1, delivery_fee_tnd: parsed.data.delivery_fee_tnd }).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ settings: data });
});

// server/routes/sales.ts
import { Router as Router7 } from "express";
import { z as z5 } from "zod";

// server/lib/order-revenue.ts
function safeNumber(value) {
  const number = Number(value);
  return !Number.isFinite(number) || number < 0 ? 0 : number;
}
function countsAsRevenue(status) {
  return status !== "cancelled";
}
function lineRevenue(item) {
  const lineTotal = safeNumber(item.line_total_tnd);
  if (lineTotal > 0) return lineTotal;
  const quantity = safeNumber(item.qty);
  const unit = safeNumber(item.unit_price_tnd);
  const support = item.with_support ? safeNumber(item.support_unit_price_tnd) : 0;
  return (unit + support) * quantity;
}
function orderRevenue(order) {
  const total = safeNumber(order.total);
  if (total > 0) return total;
  return (order.items ?? []).reduce((sum, item) => sum + lineRevenue(item), 0) + safeNumber(order.delivery_fee);
}

// server/lib/sales-stats.ts
var COMPLETED_STATUSES = /* @__PURE__ */ new Set(["confirmed", "shipped", "delivered", "completed"]);
var PENDING_STATUSES = /* @__PURE__ */ new Set(["pending", "processing"]);
function safeNumber2(value) {
  const number = Number(value);
  return !Number.isFinite(number) || number < 0 ? 0 : number;
}
function getStatusBucket(status) {
  if (status === "cancelled") return "cancelled";
  if (PENDING_STATUSES.has(status)) return "pending";
  if (COMPLETED_STATUSES.has(status)) return "completed";
  return "pending";
}
function lineRevenue2(item) {
  const lineTotal = safeNumber2(item.line_total_tnd);
  if (lineTotal > 0) return lineTotal;
  const quantity = safeNumber2(item.qty);
  const unit = safeNumber2(item.unit_price_tnd);
  const support = item.with_support ? safeNumber2(item.support_unit_price_tnd) : 0;
  return (unit + support) * quantity;
}
function lineQuantity(item) {
  return Math.max(0, Math.floor(safeNumber2(item.qty)));
}
function periodKey(iso, granularity) {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return granularity === "yearly" ? String(year) : granularity === "monthly" ? `${year}-${month}` : `${year}-${month}-${day}`;
}
function periodLabel(key, granularity) {
  if (granularity === "yearly") return key;
  const parts = key.split("-");
  const date = granularity === "monthly" ? new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, 1)) : new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
  return date.toLocaleDateString("en-GB", granularity === "monthly" ? { month: "short", year: "numeric", timeZone: "UTC" } : { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
function fillSeries(points, from, to, granularity) {
  const result = [];
  const cursor = new Date(from);
  const end = new Date(to);
  if (granularity === "daily") {
    cursor.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);
  } else if (granularity === "monthly") {
    cursor.setUTCDate(1);
    cursor.setUTCHours(0, 0, 0, 0);
    end.setUTCDate(1);
    end.setUTCHours(0, 0, 0, 0);
  } else {
    cursor.setUTCMonth(0, 1);
    cursor.setUTCHours(0, 0, 0, 0);
    end.setUTCMonth(0, 1);
    end.setUTCHours(0, 0, 0, 0);
  }
  while (cursor <= end) {
    const period = periodKey(cursor.toISOString(), granularity);
    result.push({ period, label: periodLabel(period, granularity), ...points.get(period) ?? { revenue: 0, orders: 0 } });
    if (granularity === "daily") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (granularity === "monthly") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
  }
  return result;
}
function computeSalesStats(orders, productNames, from, to, granularity) {
  const revenueOrders = orders.filter((order) => countsAsRevenue(order.status));
  const currency = revenueOrders.find((order) => order.currency)?.currency ?? orders.find((order) => order.currency)?.currency ?? "TND";
  let totalRevenue = 0;
  let productsSold = 0;
  const ordersByStatus = { completed: 0, pending: 0, cancelled: 0 };
  const seriesMap = /* @__PURE__ */ new Map();
  const productMap = /* @__PURE__ */ new Map();
  for (const order of orders) ordersByStatus[getStatusBucket(order.status)] += 1;
  for (const order of revenueOrders) {
    const revenue = orderRevenue(order);
    totalRevenue += revenue;
    const period = periodKey(order.created_at, granularity);
    const bucket = seriesMap.get(period) ?? { revenue: 0, orders: 0 };
    bucket.revenue += revenue;
    bucket.orders += 1;
    seriesMap.set(period, bucket);
    for (const item of order.items ?? []) {
      const quantity = lineQuantity(item);
      productsSold += quantity;
      const slug = item.slug?.trim();
      if (!slug) continue;
      const existing = productMap.get(slug) ?? { quantity: 0, revenue: 0 };
      existing.quantity += quantity;
      existing.revenue += lineRevenue2(item);
      productMap.set(slug, existing);
    }
  }
  const orderCount = revenueOrders.length;
  const topProducts = [...productMap.entries()].map(([slug, stats]) => ({ slug, name: productNames.get(slug) ?? slug, quantity: stats.quantity, revenue: stats.revenue })).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 10);
  return { summary: { totalRevenue, orderCount, averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0, productsSold, currency }, ordersByStatus, revenueSeries: fillSeries(seriesMap, from, to, granularity), topProducts, recentOrders: orders.slice(0, 10).map((order) => ({ id: order.id, order_ref: order.order_ref, customer_name: order.customer_name, total: orderRevenue(order), currency: order.currency || currency, status: order.status, created_at: order.created_at })) };
}

// server/routes/sales.ts
var salesRouter = Router7();
salesRouter.use(requireAuth);
var querySchema = z5.object({ from: z5.string().datetime({ offset: true }), to: z5.string().datetime({ offset: true }), granularity: z5.enum(["daily", "monthly", "yearly"]).default("daily") });
salesRouter.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  if (from >= to) {
    res.status(400).json({ error: "Invalid date range: 'from' must be before 'to'." });
    return;
  }
  const { data: orders, error: ordersError } = await supabase.from("orders").select("id, order_ref, customer_name, total, delivery_fee, currency, status, created_at, items").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).order("created_at", { ascending: false });
  if (ordersError) {
    res.status(500).json({ error: ordersError.message });
    return;
  }
  const { data: products, error: productsError } = await supabase.from("products").select("slug, name");
  if (productsError) {
    res.status(500).json({ error: productsError.message });
    return;
  }
  const productNames = new Map((products ?? []).map((product) => [product.slug, product.name]));
  const stats = computeSalesStats(orders ?? [], productNames, from, to, parsed.data.granularity);
  res.json({ stats });
});

// server/routes/expenses.ts
import { Router as Router8 } from "express";
import multer from "multer";
import { z as z6 } from "zod";

// server/lib/company-info.ts
async function loadCompanyInfo() {
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const row = data;
  return {
    name: row?.company_name?.trim() || "HOUSE OF FLAGS",
    address: row?.company_address?.trim() || null,
    email: row?.company_email?.trim() || "houseofflagstn@gmail.com",
    phone: row?.company_phone?.trim() || "+216 53 069 199",
    logoUrl: resolveLogoUrl(row?.company_logo_url)
  };
}
function resolveLogoUrl(path2) {
  const value = path2?.trim();
  if (!value) return `${env.storefrontUrl.replace(/\/$/, "")}/favicon.ico`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${env.storefrontUrl.replace(/\/$/, "")}${value}`;
  return value;
}

// server/lib/money.ts
function roundMoney(value, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
function parseMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return roundMoney(number);
}

// server/lib/expense-amounts.ts
function computeExpenseAmounts(input) {
  const amount_ht = parseMoney(input.amount_ht);
  if (!input.vat_enabled) {
    return {
      amount_ht,
      vat_rate: null,
      vat_amount: 0,
      amount_ttc: amount_ht
    };
  }
  const rate = input.vat_rate == null || input.vat_rate === "" ? null : parseMoney(input.vat_rate);
  if (rate == null || rate <= 0) {
    return {
      amount_ht,
      vat_rate: null,
      vat_amount: 0,
      amount_ttc: amount_ht
    };
  }
  const vat_amount = roundMoney(amount_ht * rate / 100);
  const amount_ttc = roundMoney(amount_ht + vat_amount);
  return { amount_ht, vat_rate: rate, vat_amount, amount_ttc };
}

// server/lib/expense-categories.ts
var EXPENSE_CATEGORIES = [
  "Materials",
  "Fabric",
  "Printing",
  "Supports",
  "Packaging",
  "Delivery",
  "Advertising",
  "Equipment",
  "Software",
  "Maintenance",
  "Office",
  "Services",
  "Other"
];

// server/lib/expense-pdf.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
function formatAmount(value, currency) {
  return `${value.toFixed(3)} ${currency}`;
}
function paymentStatusLabel(status) {
  return status === "paid" ? "Pay\xE9e" : "En attente";
}
async function fetchLogoBytes(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}
async function buildExpensePdf(expense, company) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  let y = 780;
  if (company.logoUrl) {
    const logoBytes = await fetchLogoBytes(company.logoUrl);
    if (logoBytes) {
      try {
        const image = company.logoUrl.toLowerCase().includes(".png") || logoBytes[0] === 137 ? await doc.embedPng(logoBytes) : await doc.embedJpg(logoBytes);
        const dims = image.scale(0.35);
        page.drawImage(image, { x: margin, y: y - dims.height, width: dims.width, height: dims.height });
        y -= dims.height + 16;
      } catch {
      }
    }
  }
  page.drawText(company.name, { x: margin, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 22;
  const contactLines = [company.address, company.email, company.phone].filter(Boolean);
  for (const line of contactLines) {
    page.drawText(line, { x: margin, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
    y -= 14;
  }
  y -= 10;
  page.drawText("PI\xC8CE DE D\xC9PENSE / FACTURE FOURNISSEUR", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15)
  });
  y -= 28;
  const rows = [
    ["R\xE9f\xE9rence", expense.invoice_number?.trim() || "\u2014"],
    ["Fournisseur", expense.supplier_name?.trim() || "\u2014"],
    ["Date de paiement", expense.payment_date],
    ["Titre", expense.title],
    ["Cat\xE9gorie", expense.category],
    ["Statut paiement", paymentStatusLabel(expense.payment_status)]
  ];
  if (expense.description?.trim()) {
    rows.push(["Description", expense.description.trim()]);
  }
  for (const [label, value] of rows) {
    page.drawText(`${label}:`, { x: margin, y, size: 10, font: fontBold });
    page.drawText(value.length > 70 ? `${value.slice(0, 67)}\u2026` : value, {
      x: margin + 130,
      y,
      size: 10,
      font,
      maxWidth: 380
    });
    y -= 18;
  }
  y -= 12;
  page.drawLine({ start: { x: margin, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 24;
  const amounts = [
    ["Montant HT", formatAmount(Number(expense.amount_ht), expense.currency)],
    [
      "TVA",
      expense.vat_rate != null && Number(expense.vat_rate) > 0 ? `${formatAmount(Number(expense.vat_amount), expense.currency)} (${expense.vat_rate} %)` : formatAmount(0, expense.currency)
    ],
    ["Montant TTC", formatAmount(Number(expense.amount_ttc), expense.currency)]
  ];
  for (const [label, value] of amounts) {
    page.drawText(label, { x: margin, y, size: 11, font: fontBold });
    page.drawText(value, { x: 400, y, size: 11, font });
    y -= 20;
  }
  if (expense.notes?.trim()) {
    y -= 10;
    page.drawText("Notes", { x: margin, y, size: 10, font: fontBold });
    y -= 16;
    page.drawText(expense.notes.trim(), { x: margin, y, size: 10, font, maxWidth: 495, lineHeight: 14 });
  }
  if (expense.status === "voided") {
    page.drawText("ANNUL\xC9E / VOIDED", {
      x: margin,
      y: 60,
      size: 14,
      font: fontBold,
      color: rgb(0.75, 0.1, 0.1)
    });
  }
  page.drawText(`Document g\xE9n\xE9r\xE9 le ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}`, {
    x: margin,
    y: 40,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5)
  });
  return doc.save();
}

// server/routes/expenses.ts
var expensesRouter = Router8();
expensesRouter.use(requireAuth);
var ATTACHMENT_BUCKET = "expense-attachments";
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
var categorySchema = z6.enum(EXPENSE_CATEGORIES);
var paymentStatusSchema = z6.enum(["paid", "pending"]);
var expenseBodySchema = z6.object({
  invoice_number: z6.string().trim().max(80).nullable().optional(),
  supplier_name: z6.string().trim().max(200).nullable().optional(),
  title: z6.string().trim().min(1).max(200),
  description: z6.string().trim().max(5e3).nullable().optional(),
  category: categorySchema,
  payment_date: z6.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be YYYY-MM-DD."),
  payment_status: paymentStatusSchema.default("pending"),
  amount_ht: z6.coerce.number().nonnegative(),
  vat_enabled: z6.boolean().default(false),
  vat_rate: z6.coerce.number().min(0).max(100).nullable().optional(),
  currency: z6.string().trim().min(1).max(10).default("TND"),
  notes: z6.string().trim().max(2e3).nullable().optional()
});
var expenseUpdateSchema = expenseBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required."
});
var listQuerySchema = z6.object({
  from: z6.string().datetime({ offset: true }),
  to: z6.string().datetime({ offset: true }),
  page: z6.coerce.number().int().min(1).default(1),
  pageSize: z6.coerce.number().int().min(1).max(100).default(25),
  q: z6.string().trim().max(200).optional()
});
var dashboardQuerySchema = z6.object({
  from: z6.string().datetime({ offset: true }),
  to: z6.string().datetime({ offset: true })
});
function isoRangeToDates(fromIso, toIso) {
  return {
    fromDate: fromIso.slice(0, 10),
    toDate: toIso.slice(0, 10)
  };
}
function escapeIlike(value) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
function toExpensePayload(parsed) {
  const amounts = computeExpenseAmounts({
    amount_ht: parsed.amount_ht,
    vat_enabled: parsed.vat_enabled,
    vat_rate: parsed.vat_rate
  });
  return {
    invoice_number: parsed.invoice_number?.trim() || null,
    supplier_name: parsed.supplier_name?.trim() || null,
    title: parsed.title.trim(),
    description: parsed.description?.trim() || null,
    category: parsed.category,
    payment_date: parsed.payment_date,
    payment_status: parsed.payment_status,
    amount_ht: amounts.amount_ht,
    vat_rate: amounts.vat_rate,
    vat_amount: amounts.vat_amount,
    amount_ttc: amounts.amount_ttc,
    currency: parsed.currency.trim() || "TND",
    notes: parsed.notes?.trim() || null
  };
}
expensesRouter.get("/categories", (_req, res) => {
  res.json({ categories: EXPENSE_CATEGORIES });
});
expensesRouter.get("/dashboard", async (req, res) => {
  const parsed = dashboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  if (from >= to) {
    res.status(400).json({ error: "Invalid date range: 'from' must be before 'to'." });
    return;
  }
  const { data, error } = await supabase.rpc("get_billing_dashboard", {
    p_from: from.toISOString(),
    p_to: to.toISOString()
  });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ dashboard: data });
});
expensesRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { fromDate, toDate } = isoRangeToDates(parsed.data.from, parsed.data.to);
  const offset = (parsed.data.page - 1) * parsed.data.pageSize;
  const end = offset + parsed.data.pageSize - 1;
  let query = supabase.from("expenses").select(
    "id, invoice_number, supplier_name, title, description, category, payment_date, amount_ht, vat_rate, vat_amount, amount_ttc, currency, payment_status, attachment_path, notes, status, created_at, updated_at",
    { count: "exact" }
  ).gte("payment_date", fromDate).lte("payment_date", toDate).order("payment_date", { ascending: false }).order("created_at", { ascending: false }).range(offset, end);
  const q = parsed.data.q?.trim();
  if (q) {
    const term = `%${escapeIlike(q)}%`;
    query = query.or(
      `supplier_name.ilike.${term},invoice_number.ilike.${term},title.ilike.${term},description.ilike.${term}`
    );
  }
  const { data, error, count } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({
    expenses: data ?? [],
    pagination: {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / parsed.data.pageSize) : 0
    }
  });
});
expensesRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase.from("expenses").select("*").eq("id", req.params.id).maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Expense not found." });
    return;
  }
  res.json({ expense: data });
});
expensesRouter.get("/:id/pdf", async (req, res) => {
  const { data, error } = await supabase.from("expenses").select("*").eq("id", req.params.id).maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Expense not found." });
    return;
  }
  const company = await loadCompanyInfo();
  const pdf = await buildExpensePdf(data, company);
  const filename = `depense-${data.invoice_number?.trim() || data.id.slice(0, 8)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(pdf));
});
expensesRouter.get("/:id/attachment-url", async (req, res) => {
  const { data, error } = await supabase.from("expenses").select("attachment_path").eq("id", req.params.id).maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data?.attachment_path) {
    res.status(404).json({ error: "No attachment for this expense." });
    return;
  }
  const { data: signed, error: signError } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(data.attachment_path, 3600);
  if (signError) {
    res.status(500).json({ error: signError.message });
    return;
  }
  res.json({ url: signed.signedUrl });
});
expensesRouter.post("/", async (req, res) => {
  const parsed = expenseBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const payload = toExpensePayload(parsed.data);
  const { data, error } = await supabase.from("expenses").insert(payload).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json({ expense: data });
});
expensesRouter.put("/:id", async (req, res) => {
  const { data: existing, error: loadError } = await supabase.from("expenses").select("status").eq("id", req.params.id).maybeSingle();
  if (loadError) {
    res.status(500).json({ error: loadError.message });
    return;
  }
  if (!existing) {
    res.status(404).json({ error: "Expense not found." });
    return;
  }
  if (existing.status === "voided") {
    res.status(409).json({ error: "Voided expenses cannot be edited." });
    return;
  }
  const parsed = expenseUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { data: current, error: currentError } = await supabase.from("expenses").select("*").eq("id", req.params.id).single();
  if (currentError) {
    res.status(500).json({ error: currentError.message });
    return;
  }
  const base = current;
  const vatEnabled = parsed.data.vat_enabled !== void 0 ? parsed.data.vat_enabled : base.vat_rate != null && Number(base.vat_rate) > 0;
  const amountHt = parsed.data.amount_ht !== void 0 ? parsed.data.amount_ht : Number(base.amount_ht);
  const vatRate = parsed.data.vat_rate !== void 0 ? parsed.data.vat_rate : base.vat_rate;
  const amounts = computeExpenseAmounts({
    amount_ht: amountHt,
    vat_enabled: vatEnabled,
    vat_rate: vatRate
  });
  const payload = {};
  if (parsed.data.invoice_number !== void 0) payload.invoice_number = parsed.data.invoice_number?.trim() || null;
  if (parsed.data.supplier_name !== void 0) payload.supplier_name = parsed.data.supplier_name?.trim() || null;
  if (parsed.data.title !== void 0) payload.title = parsed.data.title.trim();
  if (parsed.data.description !== void 0) payload.description = parsed.data.description?.trim() || null;
  if (parsed.data.category !== void 0) payload.category = parsed.data.category;
  if (parsed.data.payment_date !== void 0) payload.payment_date = parsed.data.payment_date;
  if (parsed.data.payment_status !== void 0) payload.payment_status = parsed.data.payment_status;
  if (parsed.data.currency !== void 0) payload.currency = parsed.data.currency.trim() || "TND";
  if (parsed.data.notes !== void 0) payload.notes = parsed.data.notes?.trim() || null;
  if (parsed.data.amount_ht !== void 0 || parsed.data.vat_enabled !== void 0 || parsed.data.vat_rate !== void 0) {
    payload.amount_ht = amounts.amount_ht;
    payload.vat_rate = amounts.vat_rate;
    payload.vat_amount = amounts.vat_amount;
    payload.amount_ttc = amounts.amount_ttc;
  }
  const { data, error } = await supabase.from("expenses").update(payload).eq("id", req.params.id).select("*").maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Expense not found." });
    return;
  }
  res.json({ expense: data });
});
expensesRouter.patch("/:id/void", async (req, res) => {
  const { data, error } = await supabase.from("expenses").update({ status: "voided" }).eq("id", req.params.id).eq("status", "active").select("*").maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Expense not found or already voided." });
    return;
  }
  res.json({ expense: data });
});
expensesRouter.post("/:id/attachment", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "File is required." });
    return;
  }
  const { data: existing, error: loadError } = await supabase.from("expenses").select("id, status").eq("id", req.params.id).maybeSingle();
  if (loadError) {
    res.status(500).json({ error: loadError.message });
    return;
  }
  if (!existing) {
    res.status(404).json({ error: "Expense not found." });
    return;
  }
  if (existing.status === "voided") {
    res.status(409).json({ error: "Voided expenses cannot be updated." });
    return;
  }
  const safeName = file.originalname.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const path2 = `${req.params.id}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path2, file.buffer, {
    contentType: file.mimetype || "application/octet-stream",
    upsert: false
  });
  if (uploadError) {
    res.status(500).json({ error: uploadError.message });
    return;
  }
  const { data, error } = await supabase.from("expenses").update({ attachment_path: path2 }).eq("id", req.params.id).select("*").single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ expense: data });
});

// server/routes/discounts.ts
import { Router as Router9 } from "express";
import { z as z7 } from "zod";
var discountsRouter = Router9();
discountsRouter.use(requireAuth);
var promoCodeSchema = z7.string().trim().min(1).max(40).regex(/^[A-Za-z0-9-]+$/, "Code must contain only letters, numbers, and hyphens.").transform((value) => value.toUpperCase());
var discountSchema = z7.object({
  code: promoCodeSchema,
  discount_percent: z7.coerce.number().positive().max(100),
  is_active: z7.boolean().default(true)
});
var discountUpdateSchema = z7.object({
  code: promoCodeSchema.optional(),
  discount_percent: z7.coerce.number().positive().max(100).optional(),
  is_active: z7.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, "At least one field is required.");
discountsRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase.from("discounts").select("*").order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ discounts: data });
});
discountsRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase.from("discounts").select("*").eq("id", req.params.id).maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Discount not found." });
    return;
  }
  res.json({ discount: data });
});
discountsRouter.post("/", async (req, res) => {
  const parsed = discountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { data, error } = await supabase.from("discounts").insert(parsed.data).select("*").single();
  if (error) {
    const message = error.code === "23505" ? "A discount with this code already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  res.status(201).json({ discount: data });
});
discountsRouter.put("/:id", async (req, res) => {
  const parsed = discountUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { data, error } = await supabase.from("discounts").update(parsed.data).eq("id", req.params.id).select("*").maybeSingle();
  if (error) {
    const message = error.code === "23505" ? "A discount with this code already exists." : error.message;
    res.status(error.code === "23505" ? 409 : 500).json({ error: message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Discount not found." });
    return;
  }
  res.json({ discount: data });
});
discountsRouter.patch("/:id/status", async (req, res) => {
  const parsed = z7.object({ is_active: z7.boolean() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { data, error } = await supabase.from("discounts").update({ is_active: parsed.data.is_active }).eq("id", req.params.id).select("*").maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Discount not found." });
    return;
  }
  res.json({ discount: data });
});
discountsRouter.delete("/:id", async (req, res) => {
  const { error, count } = await supabase.from("discounts").delete({ count: "exact" }).eq("id", req.params.id);
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

// server/routes/image-proxy.ts
import { Router as Router10 } from "express";
var imageProxyRouter = Router10();
imageProxyRouter.use(requireAuth);
var ALLOWED_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
var BLOCKED_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);
function resolveImageUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
      if (env.isProduction && BLOCKED_HOSTS.has(parsed.hostname)) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("/")) {
    const base = env.storefrontUrl;
    if (!base) return null;
    try {
      return new URL(trimmed, base.endsWith("/") ? base : `${base}/`).toString();
    } catch {
      return null;
    }
  }
  return null;
}
imageProxyRouter.get("/", async (req, res) => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
  const resolved = resolveImageUrl(rawUrl);
  if (!resolved) {
    res.status(400).json({ error: "Invalid or unsupported image URL." });
    return;
  }
  try {
    const response = await fetch(resolved, {
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(3e4)
    });
    if (!response.ok) {
      res.status(502).json({ error: `Upstream image request failed (${response.status}).` });
      return;
    }
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "URL did not return an image." });
      return;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 25 * 1024 * 1024) {
      res.status(413).json({ error: "Image is too large to process (max 25 MB)." });
      return;
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buffer);
  } catch {
    res.status(502).json({ error: "Failed to fetch image." });
  }
});

// server/app.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var root = path.resolve(__dirname, "..");
function createApp(options = {}) {
  const app2 = express();
  app2.use(express.json());
  app2.use(cookieParser());
  app2.get("/api/health", async (_req, res) => {
    const { data, error } = await supabase.from("products").select("id, image_urls, support_enabled").limit(1);
    if (error) {
      res.status(503).json({
        ok: false,
        db: "error",
        error: error.message,
        code: error.code,
        hint: error.message.includes("image_urls") || error.message.includes("support_enabled") ? "Apply migration supabase/migrations/20260723190000_product_gallery_delivery_support.sql in the Supabase SQL editor." : error.message.toLowerCase().includes("row-level security") ? "SUPABASE_SERVICE_ROLE_KEY looks like an anon/publishable key. Set the secret/service_role key in admin env." : void 0
      });
      return;
    }
    res.json({
      ok: true,
      db: "ok",
      schema: {
        image_urls: data !== null,
        support_enabled: data !== null
      }
    });
  });
  app2.use("/api/auth", authRouter);
  app2.use("/api/products", productsRouter);
  app2.use("/api/orders", ordersRouter);
  app2.use("/api/pre-orders", preOrdersRouter);
  app2.use("/api/messages", messagesRouter);
  app2.use("/api/settings", settingsRouter);
  app2.use("/api/sales", salesRouter);
  app2.use("/api/expenses", expensesRouter);
  app2.use("/api/discounts", discountsRouter);
  app2.use("/api/image-proxy", imageProxyRouter);
  if (options.serveStatic !== false) {
    const dist = path.join(root, "dist");
    app2.use(express.static(dist));
    app2.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  }
  return app2;
}

// server/vercel.ts
var app = createApp();
var vercel_default = app;
export {
  vercel_default as default
};
