# Order Notifications Plan

When a customer places an order through `placeOrder`, you want to notify someone (you, the customer, or both). Here are the realistic options for KHALTA, ranked by effort/value.

## Recommended: Email notifications (Resend connector)

Best fit for your use case. Free tier covers small drops, no phone number setup, works worldwide, two emails per order:

1. **Owner notification** → sent to your inbox with order ref, customer info, items, total. So you know to ship.
2. **Customer confirmation** → sent to the buyer's email (already collected in checkout) with the order ref and "we'll be in touch" copy. Reinforces the brand voice.

**How it works:** After the successful insert in `src/server/orders.functions.ts`, call a new helper `sendOrderEmails()` that POSTs to the Resend connector gateway. Templated HTML in KHALTA's voice (uppercase, hairline borders, ember accent).

**What you need to do:** Approve the Resend connector setup (one-click OAuth/API key via the connector picker — no manual key handling) and tell me which email address should receive owner notifications.

## Option B: SMS notifications (Twilio connector)

Useful if you want instant phone alerts for new orders, or want to text the customer their order ref. Tradeoffs:
- Requires a Twilio account + paid phone number (≈$1/mo + per-SMS cost).
- Tunisia SMS delivery needs Geo Permissions enabled in Twilio.
- Customer phone is already collected at checkout, so customer SMS is doable.

Recommend only if you specifically want phone alerts. Can be added on top of email later.

## Option C: In-app admin dashboard

Build a `/admin/orders` route that lists orders from the external Supabase, with auth gating. Good for browsing history but **not a notification** — you have to open the page to see new orders. Realtime + browser push could turn it into one, but that's significantly more work (service worker, VAPID keys, push subscription storage).

Recommend deferring this until you have steady order volume.

## My recommendation

Start with **email only** (Option A). It covers both you and the customer, costs nothing at your volume, and ships in one edit. Add SMS later if you want phone alerts. Build the admin dashboard once orders justify it.

## Technical sketch (Option A)

- New file `src/server/notifications.server.ts` — `sendOrderEmail({ to, subject, html })` calling `https://connector-gateway.lovable.dev/resend/emails` with `LOVABLE_API_KEY` + `RESEND_API_KEY`.
- New file `src/server/email-templates.ts` — pure functions returning HTML strings for owner + customer emails, themed to match the site (dark bg, hairline borders, uppercase tracking).
- Edit `src/server/orders.functions.ts` — after the successful insert, fire both emails in parallel with `Promise.allSettled` so a mail failure doesn't break the order. Log failures but still return `ok: true`.
- Add `OWNER_NOTIFICATION_EMAIL` as a runtime secret so the recipient isn't hardcoded.

## Decision needed

1. Confirm **email only** to start (or tell me to add SMS / admin page too).
2. Provide the email address that should receive owner notifications.
