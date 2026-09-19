import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Spinner,
} from "@/components/ui";

type FormState = {
  code: string;
  discount_percent: string;
  is_active: boolean;
};

const empty: FormState = {
  code: "",
  discount_percent: "",
  is_active: true,
};

export function DiscountFormPage() {
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
        const { discount } = await api.discounts.get(id);
        setForm({
          code: discount.code,
          discount_percent: String(discount.discount_percent),
          is_active: discount.is_active,
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load discount.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_percent: Number(form.discount_percent),
      is_active: form.is_active,
    };

    try {
      if (isEdit && id) {
        await api.discounts.update(id, payload);
      } else {
        await api.discounts.create(payload);
      }
      navigate("/discounts");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save discount.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title={isEdit ? "Edit discount" : "New discount"}
        description={isEdit ? "Update promo code details." : "Create a new promo code."}
      />

      {error && <ErrorBanner message={error} />}

      <Card className="max-w-lg">
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Promo code">
            <Input
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="SUMMER20"
              required
            />
          </Field>

          <Field label="Discount percentage">
            <Input
              type="number"
              min="1"
              max="100"
              step="0.01"
              value={form.discount_percent}
              onChange={(e) => set("discount_percent", e.target.value)}
              placeholder="10"
              required
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="rounded border-border"
            />
            Active
          </label>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create discount"}
            </Button>
            <Link to="/discounts">
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
