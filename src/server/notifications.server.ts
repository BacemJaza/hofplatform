// Server-only Resend gateway helper. Sends transactional emails via the
// Lovable connector gateway. Never import from client/component code.

import { customerOrderEmail, ownerOrderEmail } from "./email-templates";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
// Sender comes from a secret so the owner can rotate the alias / domain
// without a code change. Falls back to the verified updates.houseofflags.com
// alias if the secret hasn't been set yet.
const FROM =
  process.env.RESEND_FROM_EMAIL ||
  "HOUSE OF FLAGS <orders@updates.houseofflags.com>";

type OrderItem = {
  slug: string;
  qty: number;
  unit_price_tnd: number;
  line_total_tnd: number;
};

type OrderNotificationInput = {
  orderRef: string;
  customerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes: string | null;
  items: OrderItem[];
  total: number;
};

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  // Prefer the connector-managed key (RESEND_API_KEY_1) when present, fall
  // back to a manually-set RESEND_API_KEY. This way rotating the key via the
  // Resend connector "just works" without a code change.
  const RESEND_API_KEY = process.env.RESEND_API_KEY_1 || process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  console.log(
    `[email] sending from=${FROM} to=${opts.to} subject="${opts.subject}" via key=${process.env.RESEND_API_KEY_1 ? "connector" : "manual"}`,
  );

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed [${res.status}]: ${body}`);
  }
}

/**
 * Sends both customer confirmation + owner notification emails.
 * Failures are logged but never thrown — the order itself must not fail
 * because email delivery hiccuped.
 */
export async function sendOrderEmails(order: OrderNotificationInput): Promise<void> {
  const ownerTo = process.env.OWNER_NOTIFICATION_EMAIL;
  const tasks: Array<Promise<void>> = [];

  // Customer confirmation
  const customer = customerOrderEmail(order);
  tasks.push(
    sendEmail({ to: order.email, subject: customer.subject, html: customer.html }),
  );

  // Owner notification (only if address is configured)
  if (ownerTo) {
    const owner = ownerOrderEmail(order);
    tasks.push(sendEmail({ to: ownerTo, subject: owner.subject, html: owner.html }));
  } else {
    console.warn("OWNER_NOTIFICATION_EMAIL not set — skipping owner notification.");
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(
        `Order email ${i === 0 ? "(customer)" : "(owner)"} failed:`,
        r.reason,
      );
    }
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sends an owner-only notification when a visitor submits the contact form.
 * Best-effort: caller should swallow errors so a mail hiccup doesn't fail
 * the user's submission.
 */
export async function sendFeedbackEmail(input: {
  full_name: string;
  email: string;
  notes: string;
}): Promise<void> {
  const ownerTo = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!ownerTo) {
    console.warn("OWNER_NOTIFICATION_EMAIL not set — skipping feedback notification.");
    return;
  }

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#0c0b0a;font-family:Georgia,'Times New Roman',serif;color:#ece7df;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border:1px solid #2a2724;">
        <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #2a2724;">
          <div style="font-size:10px;letter-spacing:0.5em;text-transform:uppercase;color:#d96a3a;font-family:Helvetica,Arial,sans-serif;">HOUSE OF FLAGS — Contact</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 24px;font-size:28px;line-height:1.1;font-weight:normal;">New message</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.7;">
            <tr><td style="width:90px;color:#7d7669;font-family:Helvetica,Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;">Name</td><td>${escapeHtml(input.full_name)}</td></tr>
            <tr><td style="color:#7d7669;font-family:Helvetica,Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;">Email</td><td><a href="mailto:${escapeHtml(input.email)}" style="color:#ece7df;">${escapeHtml(input.email)}</a></td></tr>
          </table>
          <div style="margin-top:24px;padding-top:24px;border-top:1px solid #2a2724;">
            <div style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#7d7669;font-family:Helvetica,Arial,sans-serif;margin-bottom:12px;">Notes</div>
            <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;">${escapeHtml(input.notes)}</div>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  await sendEmail({
    to: ownerTo,
    subject: `HOUSE OF FLAGS — Contact form: ${input.full_name}`,
    html,
  });
}
