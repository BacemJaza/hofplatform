import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Product } from "@/lib/products";

export class ProductFetchError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ProductFetchError";
    if (cause !== undefined) this.cause = cause;
  }
}

const PRODUCT_COLUMNS =
  "id,slug,name,label,price_eur,image_url,image_urls,story,tags,is_active,status,quantity,support_enabled,support_name,support_price_eur" as const;

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  label: string;
  price_eur: number;
  image_url: string;
  image_urls: string[] | null;
  story: string;
  tags: string[] | null;
  is_active: boolean;
  status?: "active" | "inactive" | "coming_soon";
  quantity: number;
  support_enabled: boolean | null;
  support_name: string | null;
  support_price_eur: number | null;
};

const LOCAL_PRODUCT_IMAGES: Record<string, string> = {
  "https://i.postimg.cc/ZKLFPYKW/Messenger-creation-C8CF47C9-82E2-492F-9C90-336BF1048C7C.jpg":
    "/product-images/featured.webp",
  "https://i.postimg.cc/zBfws4v6/chat-bonnet-design.png":
    "/product-images/chat-bonnet.webp",
  "https://i.postimg.cc/PxFzSQWf/tunisian-vase-design.png":
    "/product-images/tunisian-vase.webp",
  "https://i.postimg.cc/4N8PyZ7P/desenio-1.png": "/product-images/desenio-1.webp",
  "https://i.postimg.cc/7PzbbNCx/desenio-8.png": "/product-images/desenio-8.webp",
  "https://i.postimg.cc/hjSMhGsW/better-call-saul-characters.png":
    "/product-images/better-call-saul.webp",
  "https://i.postimg.cc/s2tm9c3V/adriano-banner-a-la-maradona.jpg":
    "/product-images/adriano-banner.webp",
  "https://i.postimg.cc/mkFGpVHD/desenio-7.png": "/product-images/desenio-7.webp",
};

function resolveProductImageUrl(url: string): string {
  return LOCAL_PRODUCT_IMAGES[url] ?? url;
}

function normalizeImages(row: Pick<ProductRow, "image_url" | "image_urls">): string[] {
  const fromGallery = (row.image_urls ?? []).map((u) => u.trim()).filter(Boolean);
  if (fromGallery.length > 0) return fromGallery.map(resolveProductImageUrl);
  const primary = row.image_url?.trim();
  return primary ? [resolveProductImageUrl(primary)] : [];
}

function normalizeProduct(row: ProductRow): Product {
  const images = normalizeImages(row);
  const supportEnabled = Boolean(row.support_enabled);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    label: row.label,
    price: String(row.price_eur),
    image: images[0] ?? row.image_url,
    images,
    story: row.story,
    tags: row.tags ?? [],
    is_active: row.is_active,
    status: row.status ?? (row.is_active ? "active" : "inactive"),
    quantity: row.quantity ?? 0,
    support: {
      enabled: supportEnabled,
      name: supportEnabled ? (row.support_name?.trim() || "Support") : "",
      price: supportEnabled ? String(row.support_price_eur ?? 0) : "0",
    },
  };
}

async function fetchProducts(activeOnly = false): Promise<Product[]> {
  let query = supabaseAdmin
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true).eq("status", "active");
  } else {
    query = query.neq("status", "inactive");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load products from Supabase", error);
    throw new ProductFetchError("Failed to load products from Supabase", error);
  }

  return (data ?? []).map(normalizeProduct);
}

async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(`Failed to load product ${slug} from Supabase`, error);
    throw new ProductFetchError(`Failed to load product ${slug} from Supabase`, error);
  }

  return data ? normalizeProduct(data) : null;
}

export const getProducts = createServerFn({ method: "GET" }).handler(async () =>
  fetchProducts(false),
);

export const getActiveProducts = createServerFn({ method: "GET" }).handler(async () =>
  fetchProducts(true),
);

const slugSchema = z.string().trim().min(1).max(60);

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data: slug }) => fetchProductBySlug(slug));

export type ProductPricing = {
  unitPrice: number;
  quantity: number;
  supportEnabled: boolean;
  supportName: string | null;
  supportPrice: number;
};

export async function getProductPricing(slug: string): Promise<ProductPricing | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("price_eur,quantity,support_enabled,support_name,support_price_eur,status")
      .eq("slug", slug)
      .eq("is_active", true)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error(`Failed to resolve pricing for product ${slug}`, error);
      return null;
    }
    if (!data) return null;

    return {
      unitPrice: Number(data.price_eur),
      quantity: Number(data.quantity ?? 0),
      supportEnabled: Boolean(data.support_enabled),
      supportName: data.support_name,
      supportPrice: data.support_enabled ? Number(data.support_price_eur ?? 0) : 0,
    };
  } catch (error) {
    console.error(`Failed to resolve pricing for product ${slug}`, error);
    return null;
  }
}

export async function getProductPrice(slug: string): Promise<number | null> {
  const pricing = await getProductPricing(slug);
  return pricing?.unitPrice ?? null;
}
