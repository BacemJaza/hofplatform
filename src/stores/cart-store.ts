import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/products";
import { canPreOrder, maxPurchasableQty } from "@/lib/products";
import { parsePrice } from "@/lib/price";

export type CartItem = {
  slug: string;
  name: string;
  price: string;
  image: string;
  qty: number;
  isPreOrder: boolean;
  withSupport: boolean;
  supportQty: number;
  supportEnabled: boolean;
  supportName: string;
  supportPrice: string;
};

type CartState = {
  items: CartItem[];
  open: boolean;
  add: (p: Product, opts?: { withSupport?: boolean; supportQty?: number }) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  setWithSupport: (slug: string, withSupport: boolean) => void;
  setSupportQty: (slug: string, supportQty: number) => void;
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

function toCartItem(p: Product, qty: number, withSupport = false, supportQty = 0): CartItem {
  const nextSupportQty = p.support.enabled && withSupport ? Math.min(qty, Math.max(0, supportQty || 1)) : 0;
  return {
    slug: p.slug,
    name: p.name,
    price: p.price,
    image: p.image,
    qty,
    isPreOrder: canPreOrder(p),
    withSupport: nextSupportQty > 0,
    supportQty: nextSupportQty,
    supportEnabled: p.support.enabled,
    supportName: p.support.name,
    supportPrice: p.support.price,
  };
}

function lineUnitPrice(item: CartItem): number {
  const base = parsePrice(item.price);
  return base * item.qty +
    (item.withSupport && item.supportEnabled ? parsePrice(item.supportPrice) * item.supportQty : 0);
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      open: false,
      add: (p, opts) =>
        set((state) => {
          const withSupport = opts?.withSupport ?? false;
          const supportQty = opts?.supportQty ?? (withSupport ? 1 : 0);
          const existing = state.items.find((i) => i.slug === p.slug);
          if (existing) {
            const nextQty = Math.min(maxPurchasableQty(p), existing.qty + 1);
            return {
              items: state.items.map((i) =>
                i.slug === p.slug
                  ? {
                      ...i,
                      qty: nextQty,
                      isPreOrder: canPreOrder(p),
                      // Refresh support metadata from catalog; keep choice unless newly enabled
                      supportEnabled: p.support.enabled,
                      supportName: p.support.name,
                      supportPrice: p.support.price,
                      withSupport: p.support.enabled
                        ? opts?.withSupport !== undefined
                          ? withSupport && Math.min(nextQty, supportQty || 1) > 0
                          : i.withSupport
                        : false,
                      supportQty: p.support.enabled
                        ? opts?.withSupport !== undefined
                          ? withSupport ? Math.min(nextQty, supportQty || 1) : 0
                          : Math.min(nextQty, i.supportQty)
                        : 0,
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
            items: [...state.items, toCartItem(p, 1, withSupport, supportQty)],
            open: true,
          };
        }),
      remove: (slug) =>
        set((state) => ({ items: state.items.filter((i) => i.slug !== slug) })),
      setQty: (slug, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => {
              if (i.slug !== slug) return i;
              const cap = i.isPreOrder ? 20 : Math.min(20, qty);
              const nextQty = Math.max(1, Math.min(cap, qty));
              const nextSupportQty = Math.min(i.supportQty, nextQty);
              return { ...i, qty: nextQty, supportQty: nextSupportQty };
            })
            .filter((i) => i.qty > 0),
        })),
      setWithSupport: (slug, withSupport) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.slug === slug
              ? {
                  ...i,
                  withSupport: i.supportEnabled ? withSupport : false,
                  supportQty: i.supportEnabled && withSupport ? Math.min(i.qty, i.supportQty || 1) : 0,
                }
              : i,
          ),
        })),
      setSupportQty: (slug, supportQty) =>
        set((state) => ({
          items: state.items.map((i) => {
            if (i.slug !== slug || !i.supportEnabled) return i;
            const nextSupportQty = Math.max(0, Math.min(i.qty, Math.floor(supportQty)));
            return { ...i, supportQty: nextSupportQty };
          }),
        })),
      syncCatalog: (products) =>
        set((state) => ({
          items: state.items.flatMap((item) => {
            const product = products.find((p) => p.slug === item.slug);
            if (!product) return [item];
            const isPreOrder = canPreOrder(product);
            if (!isPreOrder && product.quantity === 0) return [];
            const qty = isPreOrder ? item.qty : Math.min(item.qty, maxPurchasableQty(product));
            if (qty <= 0) return [];
            return [
              {
                ...item,
                qty,
                isPreOrder,
                name: product.name,
                price: product.price,
                image: product.image,
                supportEnabled: product.support.enabled,
                supportName: product.support.name,
                supportPrice: product.support.price,
                withSupport: product.support.enabled ? item.withSupport : false,
                supportQty: product.support.enabled ? Math.min(qty, item.supportQty) : 0,
              },
            ];
          }),
        })),
      clear: () => set({ items: [] }),
      setOpen: (v) => set({ open: v }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () =>
          get().items.reduce((n, i) => n + lineUnitPrice(i), 0),
      total: () => get().subtotal(),
      lineUnitPrice,
    }),
    {
      name: "house-of-flags-cart",
      version: 4,
      migrate: (persisted, version) => {
        const state = persisted as { items?: Array<Partial<CartItem>> };
        const items = (state.items ?? []).map((i) => ({
          slug: i.slug ?? "",
          name: i.name ?? "",
          price: i.price ?? "0",
          image: i.image ?? "",
          qty: i.qty ?? 1,
          isPreOrder: Boolean(i.isPreOrder),
          withSupport: Boolean(i.withSupport),
          supportQty: Math.max(0, Math.min(Number(i.qty ?? 1), Number(i.supportQty ?? (i.withSupport ? 1 : 0)))),
          supportEnabled: Boolean(i.supportEnabled),
          supportName: i.supportName ?? "",
          supportPrice: i.supportPrice ?? "0",
        }));
        if (version < 3) {
          return { items };
        }
        return { items };
      },
    },
  ),
);
