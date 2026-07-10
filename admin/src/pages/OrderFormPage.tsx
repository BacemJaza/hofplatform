import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import type { OrderItem } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";
import { generateOrderRef } from "@/lib/format";
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

type FormState = {
  order_ref: string;
  customer_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
  currency: string;
  status: string;
  items: OrderItem[];
};

const emptyItem = (): OrderItem => ({
  slug: "",
  qty: 1,
  unit_price_tnd: 0,
  line_total_tnd: 0,
});

const empty: FormState = {
  order_ref: generateOrderRef(),
  customer_name: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  notes: "",
  currency: "TND",
  status: "pending",
  items: [emptyItem()],
};

function recalcItem(item: OrderItem): OrderItem {
  return { ...item, line_total_tnd: item.qty * item.unit_price_tnd };
}

export function OrderFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { order } = await api.orders.get(id);
        setForm({
          order_ref: order.order_ref,
          customer_name: order.customer_name,
          email: order.email,
          phone: order.phone,
          city: order.city,
          address: order.address,
          notes: order.notes ?? "",
          currency: order.currency,
          status: order.status,
          items: order.items.length ? order.items : [emptyItem()],
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load order.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateItem = (index: number, patch: Partial<OrderItem>) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = recalcItem({ ...items[index], ...patch });
      return { ...prev, items };
    });
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (index: number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));

  const total = form.items.reduce((sum, i) => sum + i.line_total_tnd, 0);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      order_ref: form.order_ref.trim(),
      customer_name: form.customer_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || null,
      items: form.items,
      total,
      currency: form.currency.trim(),
      status: form.status,
    };

    try {
      if (isEdit && id) {
        await api.orders.update(id, payload);
      } else {
        await api.orders.create(payload);
      }
      navigate("/orders");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save order.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title={isEdit ? "Edit order" : "New order"}
        description={isEdit ? "Update order details and status." : "Create a manual order entry."}
      />

      {error && <ErrorBanner message={error} />}

      <Card className="max-w-3xl">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Order reference">
              <div className="flex gap-2">
                <Input
                  value={form.order_ref}
                  onChange={(e) => set("order_ref", e.target.value)}
                  required
                />
                {!isEdit && (
                  <Button type="button" variant="secondary" onClick={() => set("order_ref", generateOrderRef())}>
                    Generate
                  </Button>
                )}
              </div>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name">
              <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
            </Field>
          </div>

          <Field label="Address">
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} required />
          </Field>

          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Line items</p>
              <Button type="button" variant="secondary" onClick={addItem}>
                Add item
              </Button>
            </div>
            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-5">
                  <Input
                    placeholder="Slug"
                    value={item.slug}
                    onChange={(e) => updateItem(index, { slug: e.target.value })}
                    required
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => updateItem(index, { qty: Number(e.target.value) })}
                    required
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit TND"
                    value={item.unit_price_tnd}
                    onChange={(e) => updateItem(index, { unit_price_tnd: Number(e.target.value) })}
                    required
                  />
                  <Input value={item.line_total_tnd.toFixed(2)} readOnly className="bg-background" />
                  <Button type="button" variant="ghost" onClick={() => removeItem(index)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm font-medium">Total: {total.toFixed(2)} {form.currency}</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create order"}
            </Button>
            <Link to="/orders">
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
