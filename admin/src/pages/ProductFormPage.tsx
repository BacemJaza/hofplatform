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
  quantity: string;
  image_urls: string[];
  story: string;
  tags: string;
  is_active: boolean;
  support_enabled: boolean;
  support_name: string;
  support_price_eur: string;
};

const empty: FormState = {
  slug: "",
  name: "",
  label: "",
  price_eur: "",
  quantity: "0",
  image_urls: [""],
  story: "",
  tags: "",
  is_active: false,
  support_enabled: false,
  support_name: "",
  support_price_eur: "0",
};

function normalizeLoadedUrls(product: {
  image_urls?: string[] | null;
  image_url: string;
}): string[] {
  const fromGallery = (product.image_urls ?? []).map((u) => u.trim()).filter(Boolean);
  if (fromGallery.length > 0) return fromGallery;
  return product.image_url ? [product.image_url] : [""];
}

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
          quantity: String(product.quantity),
          image_urls: normalizeLoadedUrls(product),
          story: product.story,
          tags: joinTags(product.tags),
          is_active: product.is_active,
          support_enabled: Boolean(product.support_enabled),
          support_name: product.support_name ?? "",
          support_price_eur:
            product.support_price_eur != null ? String(product.support_price_eur) : "0",
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

  const setImageUrl = (index: number, value: string) => {
    setForm((prev) => {
      const image_urls = [...prev.image_urls];
      image_urls[index] = value;
      return { ...prev, image_urls };
    });
  };

  const addImage = () => setForm((prev) => ({ ...prev, image_urls: [...prev.image_urls, ""] }));

  const removeImage = (index: number) =>
    setForm((prev) => ({
      ...prev,
      image_urls:
        prev.image_urls.length <= 1
          ? prev.image_urls
          : prev.image_urls.filter((_, i) => i !== index),
    }));

  const moveImage = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const next = index + direction;
      if (next < 0 || next >= prev.image_urls.length) return prev;
      const image_urls = [...prev.image_urls];
      const tmp = image_urls[index];
      image_urls[index] = image_urls[next];
      image_urls[next] = tmp;
      return { ...prev, image_urls };
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const image_urls = form.image_urls.map((u) => u.trim()).filter(Boolean);
    if (image_urls.length === 0) {
      setError("Add at least one image URL.");
      return;
    }

    setSaving(true);

    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      label: form.label.trim(),
      price_eur: Number(form.price_eur),
      quantity: Number(form.quantity),
      image_urls,
      story: form.story.trim(),
      tags: parseTags(form.tags),
      is_active: form.is_active,
      support_enabled: form.support_enabled,
      support_name: form.support_enabled ? form.support_name.trim() : null,
      support_price_eur: form.support_enabled ? Number(form.support_price_eur) : null,
    };

    try {
      if (isEdit && id) {
        await api.products.update(id, payload);
      } else {
        await api.products.create(payload);
      }
      navigate("/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save product.");
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
            <Field label="Price (TND)">
              <Input
                type="number"
                min="1"
                step="1"
                value={form.price_eur}
                onChange={(e) => set("price_eur", e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="Stock quantity">
            <Input
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              required
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Image gallery
              </p>
              <Button type="button" variant="secondary" onClick={addImage}>
                Add image
              </Button>
            </div>
            <p className="mb-3 text-xs text-muted">
              First image is the cover. Reorder with arrows. Paste image URLs only.
            </p>
            <div className="space-y-3">
              {form.image_urls.map((url, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-start"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-background">
                    {url.trim() ? (
                      <img
                        src={url.trim()}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={url}
                      onChange={(e) => setImageUrl(index, e.target.value)}
                      placeholder="/product-example.jpg or https://…"
                      required
                    />
                    <div className="flex flex-wrap gap-2">
                      <span className="self-center text-[10px] uppercase tracking-wide text-muted">
                        {index === 0 ? "Cover" : `#${index + 1}`}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === form.image_urls.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeImage(index)}
                        disabled={form.image_urls.length <= 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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

          <div className="space-y-3 rounded-md border border-border p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.support_enabled}
                onChange={(e) => set("support_enabled", e.target.checked)}
                className="rounded border-border"
              />
              Optional support / stand available
            </label>
            {form.support_enabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Support name">
                  <Input
                    value={form.support_name}
                    onChange={(e) => set("support_name", e.target.value)}
                    placeholder="Wood stand"
                    required
                  />
                </Field>
                <Field label="Support price (TND)">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.support_price_eur}
                    onChange={(e) => set("support_price_eur", e.target.value)}
                    required
                  />
                </Field>
              </div>
            )}
          </div>

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
