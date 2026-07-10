import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { joinTags, parseTags } from "@/lib/format";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Spinner,
  Textarea,
} from "@/components/ui";

type FormState = {
  slug: string;
  name: string;
  label: string;
  price_eur: string;
  image_url: string;
  story: string;
  tags: string;
  is_active: boolean;
};

const empty: FormState = {
  slug: "",
  name: "",
  label: "",
  price_eur: "",
  image_url: "",
  story: "",
  tags: "",
  is_active: false,
};

export function ProductFormPage() {
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
        const { product } = await api.products.get(id);
        setForm({
          slug: product.slug,
          name: product.name,
          label: product.label,
          price_eur: String(product.price_eur),
          image_url: product.image_url,
          story: product.story,
          tags: joinTags(product.tags),
          is_active: product.is_active,
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load product.");
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
      slug: form.slug.trim(),
      name: form.name.trim(),
      label: form.label.trim(),
      price_eur: Number(form.price_eur),
      image_url: form.image_url.trim(),
      story: form.story.trim(),
      tags: parseTags(form.tags),
      is_active: form.is_active,
    };

    try {
      if (isEdit && id) {
        await api.products.update(id, payload);
      } else {
        await api.products.create(payload);
      }
      navigate("/products");
    } catch (err) {
      if (err instanceof ApiError && err.details && typeof err.details === "object") {
        setError("Please check the form fields.");
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to save product.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title={isEdit ? "Edit product" : "New product"}
        description={isEdit ? "Update catalog details." : "Add a new item to the store."}
      />

      {error && <ErrorBanner message={error} />}

      <Card className="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Slug">
              <Input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value.toLowerCase())}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                title="Lowercase kebab-case"
                required
                disabled={isEdit}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label">
              <Input value={form.label} onChange={(e) => set("label", e.target.value)} required />
            </Field>
            <Field label="Price (EUR)">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.price_eur}
                onChange={(e) => set("price_eur", e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="Image URL">
            <Input
              value={form.image_url}
              onChange={(e) => set("image_url", e.target.value)}
              placeholder="/product-no-rules.jpg"
              required
            />
          </Field>

          <Field label="Tags (comma-separated)">
            <Input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="Limited, Drop 001, Fabric Flag"
            />
          </Field>

          <Field label="Story">
            <Textarea value={form.story} onChange={(e) => set("story", e.target.value)} required />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="rounded border-border"
            />
            Active (available for purchase on storefront)
          </label>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
            </Button>
            <Link to="/products">
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
