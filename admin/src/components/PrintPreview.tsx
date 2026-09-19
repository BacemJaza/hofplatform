import { useEffect, useState } from "react";
import { loadPrintImage } from "@/lib/load-print-image";
import {
  getPreviewPrintRenderPlan,
  renderPrintCanvas,
  type PrintSettings,
  type PrintValidation,
} from "@/lib/print-prepare";

type PrintPreviewProps = {
  settings: PrintSettings;
  validation: PrintValidation;
  /** Product image path/URL passed to the same loader used for download. */
  productImageUrl: string | null;
};

export function PrintPreview({ settings, validation, productImageUrl }: PrintPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState("");

  useEffect(() => {
    if (!validation.valid || !productImageUrl) {
      setPreviewUrl(null);
      setRenderError("");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setRenderError("");

        try {
          const image = await loadPrintImage(productImageUrl);
          if (cancelled) return;

          const plan = getPreviewPrintRenderPlan(settings);
          if (!plan.validation.valid) {
            setPreviewUrl(null);
            return;
          }

          const canvas = renderPrintCanvas(image, plan.settings, plan.validation);
          if (cancelled) return;

          setPreviewUrl(canvas.toDataURL("image/png"));
        } catch (err) {
          if (!cancelled) {
            setPreviewUrl(null);
            setRenderError(err instanceof Error ? err.message : "Could not render preview.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [settings, validation.valid, productImageUrl]);

  return (
    <div className="rounded-lg border border-border bg-neutral-100/80 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Print file preview</p>
          <p className="mt-0.5 text-[11px] text-muted">
            Same layout as the downloaded PNG (scaled down to fit).
          </p>
        </div>
        {validation.valid && (
          <p className="text-[11px] tabular-nums text-muted">
            Export: {validation.outputWidthPx.toLocaleString()} ×{" "}
            {validation.outputHeightPx.toLocaleString()} px
          </p>
        )}
      </div>

      <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border bg-[linear-gradient(45deg,#e5e5e5_25%,transparent_25%,transparent_75%,#e5e5e5_75%,#e5e5e5),linear-gradient(45deg,#e5e5e5_25%,transparent_25%,transparent_75%,#e5e5e5_75%,#e5e5e5)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-3">
        {!productImageUrl && (
          <p className="px-4 text-center text-sm text-muted">Add a product image to preview the print file.</p>
        )}
        {productImageUrl && !validation.valid && (
          <p className="px-4 text-center text-sm text-muted">Fix the settings above to preview the print file.</p>
        )}
        {productImageUrl && validation.valid && loading && !previewUrl && (
          <p className="text-sm text-muted">Updating preview…</p>
        )}
        {renderError && <p className="px-4 text-center text-sm text-danger">{renderError}</p>}
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Print file preview"
            className={`max-h-[min(42dvh,480px)] w-full object-contain shadow-md ring-1 ring-black/10 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}
          />
        )}
      </div>
    </div>
  );
}
