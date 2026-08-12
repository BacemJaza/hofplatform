import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/products";
import { parsePrice } from "@/lib/price";

export type CartItem = {
  slug: string;
  name: string;
  price: string;
  image: string;
  qty: number;
  withSupport: boolean;
  supportEnabled: boolean;
  supportName: string;
  supportPrice: string;
};

type CartState = {
  items: CartItem[];
  open: boolean;
  add: (p: Product, opts?: { withSupport?: boolean }) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  setWithSupport: (slug: string, withSupport: boolean) => void;
  syncCatalog: (products: Product[]) => void;
  clear: () => void;
  setOpen: (v: boolean) => void;
  count: () => number;
  /** Product subtotal only (no delivery fee). */
  subtotal: () => number;
  /** @deprecated Use subtotal(); kept for callers that expect total of items. */
  total: () => number;
  lineUnitPrice: (item: CartItem) => number;
};

function toCartItem(p: Product, qty: number, withSupport = false): CartItem {
  return {
    slug: p.slug,
    name: p.name,
    price: p.price,
    image: p.image,
    qty,
    withSupport: p.support.enabled ? withSupport : false,
    supportEnabled: p.support.enabled,
    supportName: p.support.name,
    supportPrice: p.support.price,
  };
}

function lineUnitPrice(item: CartItem): number {
  const base = parsePrice(item.price);
  if (item.withSupport && item.supportEnabled) {
    return base + parsePrice(item.supportPrice);
  }
  return base;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      open: false,
      add: (p, opts) =>
        set((state) => {
          const withSupport = opts?.withSupport ?? false;
          const existing = state.items.find((i) => i.slug === p.slug);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.slug === p.slug
                  ? {
                      ...i,
                      qty: i.qty + 1,
                      // Refresh support metadata from catalog; keep choice unless newly enabled
                      supportEnabled: p.support.enabled,
                      supportName: p.support.name,
                      supportPrice: p.support.price,
                      withSupport: p.support.enabled
                        ? opts?.withSupport !== undefined
                          ? withSupport
                          : i.withSupport
                        : false,
                      image: p.image,
                      price: p.price,
                      name: p.name,
                    }
                  : i,
              ),
              open: true,
            };
          }
          return {
            items: [...state.items, toCartItem(p, 1, withSupport)],
            open: true,
          };
        }),
      remove: (slug) =>
        set((state) => ({ items: state.items.filter((i) => i.slug !== slug) })),
      setQty: (slug, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.slug === slug ? { ...i, qty } : i))
            .filter((i) => i.qty > 0),
        })),
      setWithSupport: (slug, withSupport) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.slug === slug
              ? { ...i, withSupport: i.supportEnabled ? withSupport : false }
              : i,
          ),
        })),
      syncCatalog: (products) =>
        set((state) => ({
          items: state.items.map((item) => {
            const product = products.find((p) => p.slug === item.slug);
            if (!product) return item;
            return {
              ...item,
              name: product.name,
              price: product.price,
              image: product.image,
              supportEnabled: product.support.enabled,
              supportName: product.support.name,
              supportPrice: product.support.price,
              withSupport: product.support.enabled ? item.withSupport : false,
            };
          }),
        })),
      clear: () => set({ items: [] }),
      setOpen: (v) => set({ open: v }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () =>
        get().items.reduce((n, i) => n + lineUnitPrice(i) * i.qty, 0),
      total: () => get().subtotal(),
      lineUnitPrice,
    }),
    {
      name: "house-of-flags-cart",
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { items?: Array<Partial<CartItem>> };
        return {
          items: (state.items ?? []).map((i) => ({
            slug: i.slug ?? "",
            name: i.name ?? "",
            price: i.price ?? "0",
            image: i.image ?? "",
            qty: i.qty ?? 1,
            withSupport: Boolean(i.withSupport),
            supportEnabled: Boolean(i.supportEnabled),
            supportName: i.supportName ?? "",
            supportPrice: i.supportPrice ?? "0",
          })),
        };
      },
    },
  ),
);
