export type ProductSupport = {
  enabled: boolean;
  name: string;
  /** Additional price in TND (stored as support_price_eur in the database). */
  price: string;
};

export type Product = {
  id?: string;
  slug: string;
  name: string;
  label: string;
  /** Price in TND (stored as price_eur in the database). */
  price: string;
  /** Primary/cover image (first gallery entry). */
  image: string;
  /** Ordered gallery; first entry is always the primary image. */
  images: string[];
  story: string;
  tags: string[];
  is_active: boolean;
  support: ProductSupport;
};

/** Resolve a stable gallery list, falling back to the primary image. */
export function productImages(product: Pick<Product, "image" | "images">): string[] {
  if (product.images?.length) return product.images;
  return product.image ? [product.image] : [];
}

/** Pick a random gallery image for hover, preferring non-primary when available. */
export function pickHoverImage(images: string[]): string | null {
  if (images.length < 2) return null;
  const alt = images.slice(1);
  return alt[Math.floor(Math.random() * alt.length)] ?? null;
}
