import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/data/products";
import { ACTIVE_SLUGS } from "@/data/products";

export type CartItem = {
  slug: string;
  name: string;
  price: string;
  image: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  open: boolean;
  add: (p: Product) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  setOpen: (v: boolean) => void;
  count: () => number;
  total: () => number;
};

const parsePrice = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      open: false,
      add: (p) =>
        set((state) => {
          const existing = state.items.find((i) => i.slug === p.slug);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.slug === p.slug ? { ...i, qty: i.qty + 1 } : i,
              ),
              open: true,
            };
          }
          return {
            items: [
              ...state.items,
              { slug: p.slug, name: p.name, price: p.price, image: p.image, qty: 1 },
            ],
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
      clear: () => set({ items: [] }),
      setOpen: (v) => set({ open: v }),
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      total: () =>
        get().items.reduce((n, i) => n + parsePrice(i.price) * i.qty, 0),
    }),
    {
      name: "house-of-flags-cart",
      // Drop any stale items (e.g. older drops that are no longer for sale)
      // when the persisted cart is restored on app load.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.items = state.items.filter((i) => ACTIVE_SLUGS.has(i.slug));
      },
    },
  ),
);
