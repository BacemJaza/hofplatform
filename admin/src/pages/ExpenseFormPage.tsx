import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";

const CATEGORIES = [
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
  "Other",
] as const;

type FormState = {
  supplier_name: string;
  invoice_number: string;
  title: string;
  description: string;
  category: string;
  payment_date: string;
  payment_status: "paid" | "pending";
  amount_ht: string;
  vat_enabled: boolean;
  vat_rate: string;
  notes: string;
};

const empty: FormState = {
  supplier_name: "",
  invoice_number: "",
  title: "",
  description: "",
  category: "Materials",
  payment_date: new Date().toISOString().slice(0, 10),
  payment_status: "pending",
  amount_ht: "",
  vat_enabled: false,
  vat_rate: "19",
  notes: "",
};

function computePreview(form: FormState) {
  const ht = Number(form.amount_ht);
  if (!Number.isFinite(ht) || ht < 0) return { vat: 0, ttc: 0 };
  if (!form.vat_enabled) return { vat: 0, ttc: ht };
  const rate = Number(form.vat_rate);
  if (!Number.isFinite(rate) || rate <= 0) return { vat: 0, ttc: ht };
  const vat = Math.round(((ht * rate) / 100) * 1000) / 1000;
  return { vat, ttc: Math.round((ht + vat) * 1000) / 1000 };
}

export function ExpenseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [recordStatus, setRecordStatus] = useState<"active" | "voided">("active");

  const preview = useMemo(() => computePreview(form), [form]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { expense } = await api.expenses.get(id);
        if (expense.status === "voided") {
          setError("This expense is voided and cannot be edited.");
        }
        setRecordStatus(expense.status);
        setForm({
          supplier_name: expense.supplier_name ?? "",
          invoice_number: expense.invoice_number ?? "",
          title: expense.title,
          description: expense.description ?? "",
          category: expense.category,
          payment_date: expense.payment_date,
          payment_status: expense.payment_status,
          amount_ht: String(expense.amount_ht),
          vat_enabled: expense.vat_rate != null && Number(expense.vat_rate) > 0,
          vat_rate: expense.vat_rate != null ? String(expense.vat_rate) : "19",
          notes: expense.notes ?? "",
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load expense.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (recordStatus === "voided") return;
    setError("");
    setSaving(true);

    const payload = {
      supplier_name: form.supplier_name.trim() || null,
      invoice_number: form.invoice_number.trim() || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      payment_date: form.payment_date,
      payment_status: form.payment_status,
      amount_ht: Number(form.amount_ht),
      vat_enabled: form.vat_enabled,
      vat_rate: form.vat_enabled ? Number(form.vat_rate) : null,
      notes: form.notes.trim() || null,
    };

    try {
      let expenseId = id;
      if (isEdit && id) {
        await api.expenses.update(id, payload);
      } else {
        const { expense } = await api.expenses.create(payload);
        expenseId = expense.id;
      }
      if (attachment && expenseId) {
        await api.expenses.uploadAttachment(expenseId, attachment);
      }
      navigate("/facturation");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title={isEdit ? "Edit expense" : "New expense"}
        description="Record a supplier or business expense for Facturation."
      />

      {error && <ErrorBanner message={error} />}

      {recordStatus === "voided" && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Annulée / Voided — this record is read-only.
        </div>
      )}

      <Card className="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Supplier">
              <Input
                value={form.supplier_name}
                onChange={(e) => set("supplier_name", e.target.value)}
                disabled={recordStatus === "voided"}
              />
            </Field>
            <Field label="Invoice / reference">
              <Input
                value={form.invoice_number}
                onChange={(e) => set("invoice_number", e.target.value)}
                disabled={recordStatus === "voided"}
              />
            </Field>
          </div>

          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
              disabled={recordStatus === "voided"}
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              disabled={recordStatus === "voided"}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Category">
              <Select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                disabled={recordStatus === "voided"}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Payment date">
              <Input
                type="date"
                value={form.payment_date}
                onChange={(e) => set("payment_date", e.target.value)}
                required
                disabled={recordStatus === "voided"}
              />
            </Field>
            <Field label="Payment status">
              <Select
                value={form.payment_status}
                onChange={(e) => set("payment_status", e.target.value as FormState["payment_status"])}
                disabled={recordStatus === "voided"}
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Amount HT (TND)">
              <Input
                type="number"
                min={0}
                step="0.001"
                value={form.amount_ht}
                onChange={(e) => set("amount_ht", e.target.value)}
                required
                disabled={recordStatus === "voided"}
              />
            </Field>
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.vat_enabled}
                  onChange={(e) => set("vat_enabled", e.target.checked)}
                  disabled={recordStatus === "voided"}
                />
                Apply TVA
              </label>
              {form.vat_enabled && (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.vat_rate}
                  onChange={(e) => set("vat_rate", e.target.value)}
                  className="w-24"
                  disabled={recordStatus === "voided"}
                  aria-label="TVA rate percent"
                />
              )}
            </div>
          </div>

          <div className="rounded-md bg-background px-4 py-3 text-sm">
            <p>TVA: {preview.vat.toFixed(3)} TND</p>
            <p className="font-medium">TTC: {preview.ttc.toFixed(3)} TND</p>
          </div>

          <Field label="Attachment (PDF or image)">
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              disabled={recordStatus === "voided"}
            />
          </Field>

          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              disabled={recordStatus === "voided"}
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving || recordStatus === "voided"}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create expense"}
            </Button>
            <Link to="/facturation">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </>
  );
}
