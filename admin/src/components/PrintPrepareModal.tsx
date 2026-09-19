import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { Modal } from "@/components/Modal";
import { PrintPreview } from "@/components/PrintPreview";
import { Button, ErrorBanner, Field, InfoTooltip, Input, Select } from "@/components/ui";
import { loadPrintImage, resolveProductImageUrl } from "@/lib/load-print-image";
import {
  DEFAULT_PRINT_SETTINGS,
  DPI_TOOLTIP_TEXT,
  buildPrintFilenames,
  downloadBlob,
  generatePrintImage,
  getDefaultPrintSettingsForImage,
  validatePrintSettings,
  type PrintOrientation,
  type PrintMargins,
  type PrintSettings,
} from "@/lib/print-prepare";

type PrintPrepareModalProps = {
  product: Product | null;
  onClose: () => void;
};

function parseCm(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function productImageUrls(product: Product): string[] {
  const fromGallery = (product.image_urls ?? []).map((url) => url.trim()).filter(Boolean);
  if (fromGallery.length > 0) return fromGallery;
  return product.image_url ? [product.image_url] : [];
}

export function PrintPrepareModal({ product, onClose }: PrintPrepareModalProps) {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [sameMargin, setSameMargin] = useState(true);
  const [uniformMargin, setUniformMargin] = useState(String(DEFAULT_PRINT_SETTINGS.margins.top));
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [sourceImagePx, setSourceImagePx] = useState<{ width: number; height: number } | null>(null);

  const imageUrls = useMemo(() => (product ? productImageUrls(product) : []), [product]);
  const selectedImageUrl = imageUrls[selectedImageIndex] ?? null;
  const previewImageUrl = selectedImageUrl
    ? `/api/image-proxy?url=${encodeURIComponent(resolveProductImageUrl(selectedImageUrl))}`
    : null;

  useEffect(() => {
    if (!product) return;
    setSettings(DEFAULT_PRINT_SETTINGS);
    setSameMargin(true);
    setUniformMargin(String(DEFAULT_PRINT_SETTINGS.margins.top));
    setSelectedImageIndex(0);
    setGenerateError("");
    setSourceImagePx(null);
  }, [product]);

  useEffect(() => {
    if (!selectedImageUrl) {
      setSourceImagePx(null);
      return;
    }

    let cancelled = false;
    void loadPrintImage(selectedImageUrl)
      .then((image) => {
        if (cancelled) return;
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        setSourceImagePx({ width, height });
        setSettings(getDefaultPrintSettingsForImage(width, height));
        setUniformMargin(String(DEFAULT_PRINT_SETTINGS.margins.top));
      })
      .catch(() => {
        if (!cancelled) setSourceImagePx(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedImageUrl]);

  const validation = useMemo(() => validatePrintSettings(settings), [settings]);

  const updateOrientation = (orientation: PrintOrientation) => {
    setSettings((prev) => ({
      ...prev,
      orientation,
      bannerWidthCm:
        orientation === prev.orientation ? prev.bannerWidthCm : prev.bannerHeightCm,
      bannerHeightCm:
        orientation === prev.orientation ? prev.bannerHeightCm : prev.bannerWidthCm,
    }));
  };

  const updateMargin = (side: keyof PrintMargins, value: string) => {
    const cm = parseCm(value);
    setSettings((prev) => ({ ...prev, margins: { ...prev.margins, [side]: cm } }));
  };

  const handleUniformMarginChange = (value: string) => {
    setUniformMargin(value);
    const cm = parseCm(value);
    setSettings((prev) => ({
      ...prev,
      margins: { top: cm, right: cm, bottom: cm, left: cm },
    }));
  };

  const handleSameMarginToggle = (checked: boolean) => {
    setSameMargin(checked);
    if (checked) handleUniformMarginChange(uniformMargin);
  };

  const handleDownload = async () => {
    if (!product || !selectedImageUrl || !validation.valid) return;

    setGenerating(true);
    setGenerateError("");

    try {
      const image = await loadPrintImage(selectedImageUrl);
      const blob = await generatePrintImage(image, settings, validation);
      const filenames = buildPrintFilenames(product.slug, settings);

      downloadBlob(blob, filenames.image);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate print file.");
    } finally {
      setGenerating(false);
    }
  };

  if (!product) return null;

  const bleed = settings.bleedEnabled ? settings.bleedCm : 0;

  return (
    <Modal
      open
      extraWide
      title="Prepare for Print"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={generating || !validation.valid || !selectedImageUrl}
          >
            {generating ? "Generating…" : "Download print file"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-md border border-border bg-background/60 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-background">
              {previewImageUrl ? (
              <img src={previewImageUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{product.name}</p>
              <p className="truncate text-xs text-muted">{product.label}</p>
            </div>
          </div>

          {imageUrls.length > 1 && (
            <Field label="Image to print">
              <Select
                value={String(selectedImageIndex)}
                onChange={(event) => setSelectedImageIndex(Number(event.target.value))}
              >
                {imageUrls.map((url, index) => (
                  <option key={url} value={index}>
                    {index === 0 ? "Cover" : `Image ${index + 1}`} — {url.slice(0, 60)}
                    {url.length > 60 ? "…" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {!selectedImageUrl && (
            <ErrorBanner message="This product has no image. Add an image URL before preparing for print." />
          )}

          <Field label="Orientation">
            <Select
              value={settings.orientation}
              onChange={(event) => updateOrientation(event.target.value as PrintOrientation)}
            >
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
            </Select>
          </Field>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Safe margin (cm)</p>
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={sameMargin}
                  onChange={(event) => handleSameMarginToggle(event.target.checked)}
                  className="rounded border-border"
                />
                Same on all sides
              </label>
            </div>
            {sameMargin ? (
              <Field label="Margin (cm)">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={uniformMargin}
                  onChange={(event) => handleUniformMarginChange(event.target.value)}
                />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <Field key={side} label={side}>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={settings.margins[side] || ""}
                      onChange={(event) => updateMargin(side, event.target.value)}
                    />
                  </Field>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
              <input
                type="checkbox"
                checked={settings.bleedEnabled}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, bleedEnabled: event.target.checked }))
                }
                className="rounded border-border"
              />
              Include bleed
            </label>
            {settings.bleedEnabled && (
              <Field label="Bleed (cm)">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={settings.bleedCm || ""}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, bleedCm: parseCm(event.target.value) }))
                  }
                />
              </Field>
            )}
          </div>

          <Field
            label={
              <span className="flex items-center text-xs font-medium uppercase tracking-wide text-muted">
                Resolution (DPI)
                <InfoTooltip text={DPI_TOOLTIP_TEXT} />
              </span>
            }
          >
            <p className="text-sm font-medium">{settings.dpi} DPI (optimized for this design)</p>
            <p className="mt-1.5 text-xs text-muted">
              Output: {validation.outputWidthPx.toLocaleString()} ×{" "}
              {validation.outputHeightPx.toLocaleString()} px at {settings.dpi} DPI for the total print
              area{settings.bleedEnabled && bleed > 0 ? " (including bleed)" : ""}.
            </p>

            {selectedImageUrl && validation.valid && !sourceImagePx && (
              <p className="mt-2 text-xs text-muted">Analyzing image resolution…</p>
            )}
          </Field>

          {!validation.valid && validation.errors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
              <ul className="list-inside list-disc space-y-1">
                {validation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {generateError && <ErrorBanner message={generateError} />}
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted">
              Artwork area: {validation.artWidthCm.toFixed(1)} × {validation.artHeightCm.toFixed(1)}{" "}
              cm inside safe margins.
              {settings.bleedEnabled && bleed > 0
                ? ` Total file includes ${bleed} cm bleed beyond the ${settings.bannerWidthCm} × ${settings.bannerHeightCm} cm trim size.`
                : " No bleed extension applied."}
            </div>
          </div>
        </div>

        <PrintPreview
          settings={settings}
          validation={validation}
          productImageUrl={selectedImageUrl}
        />
      </div>
    </Modal>
  );
}
