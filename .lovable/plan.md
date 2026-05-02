## Overview

Six related changes: switch the email sender to the verified `updates.houseofflags.com` domain (with a configurable `FROM` secret), restructure the landing page to absorb a punchy multilingual philosophy banner, add a Contact page (with feedback form writing to a new `clients_feedback` table), restrict the entire shop to the single `NO RULES` piece, and replace the product-card click-through on the home page with an inline quantity + Buy flow that goes straight to checkout.

---

## 1. Resend — verified domain + dynamic FROM

**`src/server/notifications.server.ts`**
- Replace the hardcoded `FROM = "HOUSE OF FLAGS <onboarding@resend.dev>"` with:
  - `const FROM = process.env.RESEND_FROM_EMAIL ?? "HOUSE OF FLAGS <orders@updates.houseofflags.com>"`
- The owner address already comes from `OWNER_NOTIFICATION_EMAIL` (dynamic — good).
- Add an `ownerTo` fallback log message: keep existing behavior; no change.

**Secrets to add (will prompt user via `add_secret`)**
- `RESEND_FROM_EMAIL` → `HOUSE OF FLAGS <orders@updates.houseofflags.com>` (changeable later in Cloud → Secrets without a code edit)
- Confirm `OWNER_NOTIFICATION_EMAIL` is set to `bacemjaza7@gmail.com` (or whichever address the owner wants notifications at). User can already update this any time.

Why a secret instead of hardcoding the new domain: if the user later rotates to a different sender alias (e.g. `noreply@updates.houseofflags.com`), they edit the secret with no redeploy.

**Verify before sending**: call `email_domain--check_email_domain_status` for `updates.houseofflags.com` to confirm it's `verified` in Resend; if not, surface that and stop before changing FROM.

---

## 2. Restrict catalog to NO RULES only

**`src/data/products.ts`** — keep all product definitions in the source (so future drops are easy), but export a separate `activeProducts` array containing only the `no-rules` entry. Update consumers below to import `activeProducts`.

**Consumers to update** to use `activeProducts` (so the locked grid, related-products row, and any catalog listing only show NO RULES):
- `src/routes/index.tsx` — DROP grid maps over `activeProducts` only (single card, no "coming soon" placeholders).
- `src/routes/product.$slug.tsx` — `others` derived from `activeProducts` → empty list, so hide the "More from Drop 001" section when empty.

**Server-side guard** — `src/server/orders.server.ts`:
- Reduce `CATALOG_EUR` to only `"no-rules": 89`. Server-side validation already rejects unknown slugs, so this enforces "only NO RULES is purchasable" even if a stale cart contains other items.
- `src/stores/cart-store.ts` — on app load, run a one-time effect that filters `items` down to active slugs, so users with old carts don't see stale entries on the checkout summary.

Drops/system stat numbers in `src/routes/index.tsx` (`7 pieces`, `265 flags`) — update to reflect the single-piece reality (`1 piece`, `50 flags`, `0 restocks`) and update the matching translation copy in `drop.intro` for all three languages to remove "Seven pieces."

---

## 3. Landing page — merge Philosophy + add multilingual banner

**`src/routes/index.tsx`** — restructure sections in this order:
1. HERO (unchanged)
2. MARQUEE (unchanged)
3. **NEW philosophy banner** (full-width, between marquee and DROP) — short punchy intro to the business + product, in the active language. New translation keys:
   - `banner.line1` — one-line business intro (e.g. EN: "From a studio in Tunis." / FR: "D'un studio à Tunis." / AR: "من استوديو في تونس.")
   - `banner.line2` — product punchline (e.g. EN: "Heavyweight cotton flags. Statements you hang on your wall." / FR/AR equivalents)
   - `banner.line3` — closing line (EN: "No restocks. No regrets." / FR: "Pas de réappro. Pas de regrets." / AR: "لا إعادة تزويد. لا ندم.")
4. DROP 001 (single NO RULES card with new inline buy controls — see §5)
5. PHILOSOPHY (keep the existing quieter philosophy section but remove the "Read more" link since the dedicated page is gone)
6. DROP SYSTEM (kept, numbers updated)

**Delete `src/routes/philosophy.tsx`** and remove the Philosophy nav entry from the header; the banner + existing philosophy section cover it.

---

## 4. Navbar restructure + new Contact route

**`src/components/site-header.tsx`** — replace the nav links with:
1. `Drop 001` → `/`
2. `Drops` → `/drops` (now second, as requested)
3. `Contact` → `/contact`

(Remove the Philosophy link — merged into landing.)

**`src/routes/contact.tsx`** (new file) — page with:
- Header block with multilingual title.
- Channels list (linked):
  - TikTok — `https://tiktok.com/@houseofflags` (placeholder handle; user can update)
  - Instagram — `https://instagram.com/houseofflags` (placeholder)
  - Email — `mailto:houseofflagstn@gmail.com`
  - Phone — `tel:+21653069199` shown as `+216 53 069 199`
- Feedback form: Full Name, Email, Notes/Feedback (textarea). Zod-validated client + server. On submit calls a new server function (below) and shows a success state.

**Footer (`src/components/site-footer.tsx`)** — add real TikTok/Instagram links, add phone number, and replace the Philosophy index entry with Contact.

**Translations (`src/hooks/use-language.tsx`)** — add `nav.contact`, banner.* keys, and `contact.*` keys (title, intro, form labels, success message) in EN/FR/AR.

---

## 5. Contact form backend — `clients_feedback` table

**Migration (will be run via the database migration tool)**

```sql
create table public.clients_feedback (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  notes text not null,
  created_at timestamptz not null default now()
);

alter table public.clients_feedback enable row level security;

-- Lock down: no public access. Inserts happen via server function with service-role.
create policy "Deny all access to anon"
  on public.clients_feedback for all to anon
  using (false) with check (false);

create policy "Deny all access to authenticated"
  on public.clients_feedback for all to authenticated
  using (false) with check (false);

-- Length validation trigger (CHECK constraints can't reference functions like length safely on text columns we want to keep flexible, but we use a trigger for clarity)
create or replace function public.validate_clients_feedback()
returns trigger language plpgsql as $$
begin
  if length(new.full_name) < 1 or length(new.full_name) > 120 then
    raise exception 'full_name length out of range';
  end if;
  if length(new.email) < 3 or length(new.email) > 255 then
    raise exception 'email length out of range';
  end if;
  if length(new.notes) < 1 or length(new.notes) > 2000 then
    raise exception 'notes length out of range';
  end if;
  return new;
end$$;

create trigger trg_validate_clients_feedback
  before insert or update on public.clients_feedback
  for each row execute function public.validate_clients_feedback();
```

**`src/server/feedback.functions.ts`** (new) — `submitFeedback` server function:
- Zod-validates `{ full_name, email, notes }` (trimmed; same length bounds as the trigger).
- Inserts via `getExternalSupabaseAdmin()` (matches the pattern already used for orders).
- Best-effort sends an owner notification email through the existing `sendEmail`-style helper, reusing the verified Resend domain.
- Returns `{ ok: true }` or `{ ok: false, error }`.

---

## 6. Inline Buy on home page (replace product-card click-through)

**`src/components/product-buy-card.tsx`** (new) — replaces `<ProductCard>` usage on the home grid. Renders:
- Product image (linked optionally to `/product/no-rules` for full details, or just static — see below).
- Name + label + price.
- Quantity counter (`−` / `qty` / `+`, min 1, max 20 — same bounds as cart).
- "Buy — {qty × price} TND" button. On click:
  1. Calls `useCart.add(product)` once, then `setQty(product.slug, qty)` to land on the chosen quantity.
  2. Closes the cart drawer if open (`setOpen(false)`).
  3. Navigates to `/checkout` via `useNavigate()`.

The existing cart drawer, product detail page, and `placeOrder` server function continue to work unchanged — this is purely a faster path from the landing page.

**`src/routes/index.tsx`** — render a single `<ProductBuyCard product={activeProducts[0]} />` in the DROP section (centered, larger, since it's the only piece), instead of the 3-column locked grid.

---

## Technical notes

- `src/integrations/supabase/types.ts` regenerates automatically after the migration; do not edit it.
- `src/routeTree.gen.ts` regenerates from the new `/contact` route file; do not edit it.
- Removing `philosophy.tsx` is safe because the only inbound `<Link to="/philosophy">` lives in the header (being removed) and in the index page's "Read more" CTA (being removed).
- The owner email for the order notification stays driven by `OWNER_NOTIFICATION_EMAIL`; switching it later requires no code change.
- The new `RESEND_FROM_EMAIL` secret defaults to `orders@updates.houseofflags.com` if unset, so the build never breaks even before the secret is added.

---

## What you'll be asked to confirm during build

1. Approve the migration creating `clients_feedback`.
2. Provide / confirm two secrets: `RESEND_FROM_EMAIL` (suggested value: `HOUSE OF FLAGS <orders@updates.houseofflags.com>`) and `OWNER_NOTIFICATION_EMAIL` (currently set — only update if needed).
3. Confirm placeholder TikTok and Instagram handles on the Contact page (or share the real URLs so I wire them in directly).
