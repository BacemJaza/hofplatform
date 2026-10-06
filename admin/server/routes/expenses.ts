import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../auth";
import { loadCompanyInfo } from "../lib/company-info";
import { computeExpenseAmounts } from "../lib/expense-amounts";
import { EXPENSE_CATEGORIES } from "../lib/expense-categories";
import { buildExpensePdf } from "../lib/expense-pdf";
import { supabase, type ExpenseRow } from "../supabase";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

const ATTACHMENT_BUCKET = "expense-attachments";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const categorySchema = z.enum(EXPENSE_CATEGORIES);
const paymentStatusSchema = z.enum(["paid", "pending"]);

const expenseBodySchema = z.object({
  invoice_number: z.string().trim().max(80).nullable().optional(),
  supplier_name: z.string().trim().max(200).nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  category: categorySchema,
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be YYYY-MM-DD."),
  payment_status: paymentStatusSchema.default("pending"),
  amount_ht: z.coerce.number().nonnegative(),
  vat_enabled: z.boolean().default(false),
  vat_rate: z.coerce.number().min(0).max(100).nullable().optional(),
  currency: z.string().trim().min(1).max(10).default("TND"),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const expenseUpdateSchema = expenseBodySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required.",
});

const listQuerySchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(200).optional(),
});

const dashboardQuerySchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

function isoRangeToDates(fromIso: string, toIso: string): { fromDate: string; toDate: string } {
  return {
    fromDate: fromIso.slice(0, 10),
    toDate: toIso.slice(0, 10),
  };
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function toExpensePayload(parsed: z.infer<typeof expenseBodySchema>) {
  const amounts = computeExpenseAmounts({
    amount_ht: parsed.amount_ht,
    vat_enabled: parsed.vat_enabled,
    vat_rate: parsed.vat_rate,
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
    notes: parsed.notes?.trim() || null,
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
    p_to: to.toISOString(),
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

  let query = supabase
    .from("expenses")
    .select(
      "id, invoice_number, supplier_name, title, description, category, payment_date, amount_ht, vat_rate, vat_amount, amount_ttc, currency, payment_status, attachment_path, notes, status, created_at, updated_at",
      { count: "exact" },
    )
    .gte("payment_date", fromDate)
    .lte("payment_date", toDate)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, end);

  const q = parsed.data.q?.trim();
  if (q) {
    const term = `%${escapeIlike(q)}%`;
    query = query.or(
      `supplier_name.ilike.${term},invoice_number.ilike.${term},title.ilike.${term},description.ilike.${term}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({
    expenses: (data ?? []) as ExpenseRow[],
    pagination: {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / parsed.data.pageSize) : 0,
    },
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
  res.json({ expense: data as ExpenseRow });
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
  const pdf = await buildExpensePdf(data as ExpenseRow, company);
  const filename = `depense-${data.invoice_number?.trim() || data.id.slice(0, 8)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(pdf));
});

expensesRouter.get("/:id/attachment-url", async (req, res) => {
  const { data, error } = await supabase
    .from("expenses")
    .select("attachment_path")
    .eq("id", req.params.id)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data?.attachment_path) {
    res.status(404).json({ error: "No attachment for this expense." });
    return;
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(data.attachment_path, 3600);
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
  res.status(201).json({ expense: data as ExpenseRow });
});

expensesRouter.put("/:id", async (req, res) => {
  const { data: existing, error: loadError } = await supabase
    .from("expenses")
    .select("status")
    .eq("id", req.params.id)
    .maybeSingle();
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

  const { data: current, error: currentError } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (currentError) {
    res.status(500).json({ error: currentError.message });
    return;
  }
  const base = current as ExpenseRow;

  const vatEnabled =
    parsed.data.vat_enabled !== undefined
      ? parsed.data.vat_enabled
      : base.vat_rate != null && Number(base.vat_rate) > 0;
  const amountHt = parsed.data.amount_ht !== undefined ? parsed.data.amount_ht : Number(base.amount_ht);
  const vatRate = parsed.data.vat_rate !== undefined ? parsed.data.vat_rate : base.vat_rate;

  const amounts = computeExpenseAmounts({
    amount_ht: amountHt,
    vat_enabled: vatEnabled,
    vat_rate: vatRate,
  });

  const payload: Record<string, unknown> = {};
  if (parsed.data.invoice_number !== undefined) payload.invoice_number = parsed.data.invoice_number?.trim() || null;
  if (parsed.data.supplier_name !== undefined) payload.supplier_name = parsed.data.supplier_name?.trim() || null;
  if (parsed.data.title !== undefined) payload.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined) payload.description = parsed.data.description?.trim() || null;
  if (parsed.data.category !== undefined) payload.category = parsed.data.category;
  if (parsed.data.payment_date !== undefined) payload.payment_date = parsed.data.payment_date;
  if (parsed.data.payment_status !== undefined) payload.payment_status = parsed.data.payment_status;
  if (parsed.data.currency !== undefined) payload.currency = parsed.data.currency.trim() || "TND";
  if (parsed.data.notes !== undefined) payload.notes = parsed.data.notes?.trim() || null;

  if (
    parsed.data.amount_ht !== undefined ||
    parsed.data.vat_enabled !== undefined ||
    parsed.data.vat_rate !== undefined
  ) {
    payload.amount_ht = amounts.amount_ht;
    payload.vat_rate = amounts.vat_rate;
    payload.vat_amount = amounts.vat_amount;
    payload.amount_ttc = amounts.amount_ttc;
  }

  const { data, error } = await supabase
    .from("expenses")
    .update(payload)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Expense not found." });
    return;
  }
  res.json({ expense: data as ExpenseRow });
});

expensesRouter.patch("/:id/void", async (req, res) => {
  const { data, error } = await supabase
    .from("expenses")
    .update({ status: "voided" })
    .eq("id", req.params.id)
    .eq("status", "active")
    .select("*")
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Expense not found or already voided." });
    return;
  }
  res.json({ expense: data as ExpenseRow });
});

expensesRouter.post("/:id/attachment", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "File is required." });
    return;
  }

  const { data: existing, error: loadError } = await supabase
    .from("expenses")
    .select("id, status")
    .eq("id", req.params.id)
    .maybeSingle();
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
  const path = `${req.params.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) {
    res.status(500).json({ error: uploadError.message });
    return;
  }

  const { data, error } = await supabase
    .from("expenses")
    .update({ attachment_path: path })
    .eq("id", req.params.id)
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ expense: data as ExpenseRow });
});
