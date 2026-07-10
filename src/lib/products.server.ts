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
  "id,slug,name,label,price_eur,image_url,story,tags,is_active" as const;

function normalizeProduct(row: {
  id: string;
  slug: string;
  name: string;
  label: string;
  price_eur: number;
  image_url: string;
  story: string;
  tags: string[] | null;
  is_active: boolean;
}): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    label: row.label,
    price_eur: row.price_eur,
    price: String(row.price_eur),
    image: row.image_url,
    story: row.story,
    tags: row.tags ?? [],
    is_active: row.is_active,
  };
}

async function fetchProducts(activeOnly = false): Promise<Product[]> {
  try {
    let query = supabaseAdmin
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("created_at", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load products from Supabase", error);
      return [];
    }

    return (data ?? []).map(normalizeProduct);
  } catch (error) {
    console.error("Failed to load products from Supabase", error);
    return [];
  }
}

export async function getProducts(): Promise<Product[]> {
  return fetchProducts(false);
}

export async function getActiveProducts(): Promise<Product[]> {
  return fetchProducts(true);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error(`Failed to load product ${slug} from Supabase`, error);
      return null;
    }

    return data ? normalizeProduct(data) : null;
  } catch (error) {
    console.error(`Failed to load product ${slug} from Supabase`, error);
    return null;
  }
}

export async function getProductPriceEur(slug: string): Promise<number | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("price_eur")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error(`Failed to resolve price for product ${slug}`, error);
      return null;
    }

    return data?.price_eur ?? null;
  } catch (error) {
    console.error(`Failed to resolve price for product ${slug}`, error);
    return null;
  }
}
