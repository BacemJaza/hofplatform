/**
 * Resolve a product image URL to an absolute URL.
 * Relative paths (e.g. /product-images/foo.webp) are prefixed with the storefront origin.
 */
export function resolveProductImageUrl(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    const base = import.meta.env.VITE_STOREFRONT_URL?.trim() || window.location.origin;
    return `${base.replace(/\/$/, "")}${trimmed}`;
  }

  return trimmed;
}

/**
 * Load a product image for canvas use via the authenticated admin proxy (avoids CORS taint).
 */
export function loadPrintImage(imageUrl: string): Promise<HTMLImageElement> {
  const absolute = resolveProductImageUrl(imageUrl);
  const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(absolute)}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          "Could not load the product image. Check that the image URL is valid and accessible.",
        ),
      );

    img.src = proxyUrl;
  });
}
