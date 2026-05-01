## Plan

### 1. Update owner notification email
Update the `OWNER_NOTIFICATION_EMAIL` secret to `houseofflagstn@gmail.com` so order notification emails go to the new address.

### 2. Add a "Customer Service" column to the footer
In `src/components/site-footer.tsx`, add a fourth column (or replace the placeholder Follow links) showing a contact email: `houseofflagstn@gmail.com` as a `mailto:` link. I'll keep the existing 3-column layout aesthetic and adjust to a 4-column grid on md+.

### 3. Add translations
Add new keys in `src/hooks/use-language.tsx` for EN/FR/AR:
- `footer.contact` → "Contact" / "Contact" / "اتصل بنا"
- `footer.contactNote` → small tagline like "For orders, returns, and questions." (translated)

The email itself stays as plain text (not translated).

### Files to change
- `src/components/site-footer.tsx` — add Contact column with mailto link
- `src/hooks/use-language.tsx` — add 2 keys per language
- Update the `OWNER_NOTIFICATION_EMAIL` secret value

No DB or server function changes needed — `notifications.server.ts` already reads `OWNER_NOTIFICATION_EMAIL` from env at call time.