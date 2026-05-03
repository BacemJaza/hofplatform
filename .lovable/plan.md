## What's going on

You deleted the old Resend key and re-added one with the same name, but two things are now in the way of emails actually sending:

1. **Two Resend keys exist side-by-side.** The Resend connector ("Flags Resen") was just linked to the project, which exposes the key as `RESEND_API_KEY_1` (suffix `_1` because a manual secret named `RESEND_API_KEY` already occupies the primary slot). The notification code only reads `RESEND_API_KEY`, so right now it's still using the old/manual secret — not the freshly connected one.
2. **No `OWNER_NOTIFICATION_EMAIL` is set.** Customer confirmation emails will go out, but the owner copy is silently skipped (you'll see "OWNER_NOTIFICATION_EMAIL not set — skipping owner notification" in logs). That's likely why you feel like "nothing arrived" on past tries.

## Plan

### 1. Consolidate to a single Resend key (the connector one)

- Delete the manual `RESEND_API_KEY` secret in Cloud → Secrets (it's the leftover from before the connector existed).
- Re-link the Resend connector so its key takes the primary `RESEND_API_KEY` slot (no `_1` suffix). No code change needed if we do this.

Alternative if you'd rather keep both: update `src/server/notifications.server.ts` to prefer `RESEND_API_KEY_1` and fall back to `RESEND_API_KEY`. Cleaner to just delete the manual one — recommended.

### 2. Set the owner notification address

- Add a runtime secret `OWNER_NOTIFICATION_EMAIL` = `houseofflagstn@gmail.com` (or whichever inbox you want order/contact alerts in).
- Confirm `RESEND_FROM_EMAIL` is set to `HOUSE OF FLAGS <orders@updates.houseofflags.com>` (it's listed in secrets — we'll verify the value is correct).

### 3. Verify the domain is actually verified in Resend

Quick sanity check that `updates.houseofflags.com` shows as **Verified** in your Resend dashboard. If DNS isn't fully propagated, every send will 403 and the logs will say so. (Workspace email-domains tool reports nothing configured here, so verification lives entirely on the Resend side — that's expected for connector-based setups.)

### 4. Send a real test and read the logs

- Submit the contact form on `/contact` with your own email — fastest end-to-end check (hits `submitFeedback` → `sendFeedbackEmail` → Resend).
- Pull `server-function-logs` filtered on `Resend` / `email` / `feedback` to confirm a 200 from the gateway. If we see a non-200, the body returned by Resend tells us exactly what's wrong (unverified sender, bad key, domain not allowed, etc.) and we fix from there.

### 5. (Optional) Tiny resilience tweak

Add a one-line log of the chosen `from` address and target `to` (no body) at the top of `sendEmail` so future "did it send?" debugging takes seconds instead of guesses.

## Technical details

- Files touched: `src/server/notifications.server.ts` only if we go with the alternative key-fallback path or add the debug log.
- Secrets touched: delete `RESEND_API_KEY` (manual), add `OWNER_NOTIFICATION_EMAIL`, leave connector-managed `RESEND_API_KEY_1` alone (it'll auto-rename to `RESEND_API_KEY` once the manual one is gone and the connector relinks).
- No DB migration, no route changes, no UI changes.

## Open question

Want owner alerts going to `houseofflagstn@gmail.com`, or a different inbox?
