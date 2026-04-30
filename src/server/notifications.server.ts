// Server-only Resend gateway helper. Sends transactional emails via the
// Lovable connector gateway. Never import from client/component code.

import { customerOrderEmail, ownerOrderEmail } from "./email-templates";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
// Resend's onboarding sender works without domain verification.
const FROM = "KHALTA <onboarding@resend.dev>";

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

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

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
