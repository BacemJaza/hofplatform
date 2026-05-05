## Problem

On mobile, the main navigation links (Drop / Drops / Contact) are hidden — the header only shows them at `md:` and above. That means **the Contact page is unreachable from mobile** unless a user knows the URL or scrolls all the way to the footer. The site also has a few small mobile polish issues (hero CTA crowded next to language switcher + theme + cart icons, contact page padding).

## Goals

- Keep every existing feature: language switcher, theme toggle, cart count, all routes.
- Make Contact (and Drops) reachable on mobile.
- Tighten the mobile header so controls don't crowd.
- Improve contact page legibility on small screens.

## Changes

### 1. `src/components/site-header.tsx` — add mobile menu

- Add a hamburger button visible only `< md` (next to the cart icon).
- Tapping opens a full-width slide-down panel (or a `Sheet` from existing UI) listing:
  - Drop (`/`)
  - Drops (`/drops`)
  - Contact (`/contact`)
- Panel auto-closes on link tap and on route change.
- Keep the desktop `md:flex` nav exactly as-is.
- On mobile, slightly reduce gaps and hide the "CART" word (icon + count only, already partially done) so language + theme + cart + menu all fit on a 360px screen without wrapping.

### 2. `src/routes/contact.tsx` — mobile polish

- Reduce top padding (`pt-32` → `pt-24 md:pt-32`) so the title isn't pushed below the fold.
- Scale down the hero heading on mobile (`text-6xl` is fine; ensure no horizontal overflow with long translations — add `break-words`).
- Make channel rows stack label-above-value on very small screens (`flex-col items-start sm:flex-row sm:items-baseline sm:justify-between`) so long emails/handles don't get cramped.
- Ensure form inputs have `text-base` (≥16px) to prevent iOS auto-zoom on focus while keeping the visual label small.
- Submit button: keep full-width, already good.

### 3. `src/routes/index.tsx` — hero mobile fix

- `text-[18vw]` for "NO RULES" can overflow on narrow screens with safe-area; clamp to `text-[16vw]` and add `px-2` on the heading container so it never touches edges.
- Marquee row already responsive — leave alone.

### 4. `src/components/product-buy-card.tsx` — minor

- Already stacks qty + buy on mobile (`flex-col sm:flex-row`). Verify the buy button label "BUY — {price} TND" doesn't wrap awkwardly; add `whitespace-nowrap text-[11px] sm:text-xs`.

## Out of scope

- No backend / database / auth changes.
- No copy or translation changes.
- No removal of any existing feature, page, or link.

## Acceptance

- On a 375px viewport: header shows logo, lang switcher, theme, cart, and a hamburger; tapping hamburger reveals Drop / Drops / Contact and Contact navigates correctly.
- Contact page renders without horizontal scroll; form is usable, inputs don't trigger iOS zoom.
- Home hero "NO RULES" fits on screen on 320px width.
- Desktop layout is unchanged.
