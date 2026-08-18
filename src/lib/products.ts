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
  /** Available units; 0 means out of stock (pre-order when active). */
  quantity: number;
  support: ProductSupport;
};

export function isInStock(product: Pick<Product, "quantity">): boolean {
  return product.quantity > 0;
}

export function isOutOfStock(product: Pick<Product, "quantity" | "is_active">): boolean {
  return product.is_active && product.quantity === 0;
}

export function canPreOrder(product: Pick<Product, "quantity" | "is_active">): boolean {
  return product.is_active && product.quantity === 0;
}

export function maxPurchasableQty(product: Pick<Product, "quantity">): number {
  return isInStock(product) ? Math.min(20, product.quantity) : 20;
}

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
