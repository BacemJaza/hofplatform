// Server-only notification helpers.
// Resend is temporarily disabled — uncomment the implementation at the bottom
// when transactional email should send again.

import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { getExternalSupabaseAdmin } from "@/integrations/supabase/external-admin.server";

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

export async function sendOrderEmails(_order: OrderNotificationInput): Promise<void> {
  return;
}

export async function sendFeedbackEmail(_input: {
  full_name: string;
  email: string;
  notes: string;
}): Promise<void> {
  return;
}

export async function sendCheckoutSuccessEmail(input: {
  email: string;
  customerName: string;
  discountActivated: boolean;
  promoCode: string | null;
}): Promise<void> {
  const { data, error } = await getExternalSupabaseAdmin().functions.invoke(
    "send-checkout-success-email",
    { body: input },
  );

  if (error) {
    let detail = error.message ?? "send-checkout-success-email invoke failed";

    if (error instanceof FunctionsHttpError && error.context instanceof Response) {
      const response = error.context;
      let body = "";
      try {
        body = await response.clone().text();
      } catch {
        body = "(could not read response body)";
      }
      detail = `send-checkout-success-email failed [${response.status} ${response.statusText}]: ${body || "(empty body)"}`;
    } else if (error instanceof FunctionsRelayError) {
      detail = `send-checkout-success-email relay error: ${error.message}`;
      if (error.context instanceof Response) {
        try {
          const body = await error.context.clone().text();
          if (body) detail += ` — ${body}`;
        } catch {
          // ignore unreadable relay response body
        }
      }
    } else if (error instanceof FunctionsFetchError) {
      detail = `send-checkout-success-email fetch error: ${error.message}`;
    }

    console.error("sendCheckoutSuccessEmail invoke error:", {
      errorName: error instanceof Error ? error.name : typeof error,
      detail,
    });
    throw new Error(detail);
  }

  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
}

/*
// --- Resend implementation (restore when needed) ---

import { customerOrderEmail, ownerOrderEmail } from "./email-templates";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM =
  process.env.RESEND_FROM_EMAIL ||
  "HOUSE OF FLAGS <orders@updates.houseofflags.com>";
const DEFAULT_OWNER_NOTIFICATION_EMAIL = "houseofflagstn@gmail.com";

function getOwnerNotificationEmail(): string {
  return process.env.OWNER_NOTIFICATION_EMAIL || DEFAULT_OWNER_NOTIFICATION_EMAIL;
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const RESEND_API_KEY = process.env.HOF_API_KEY;
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": RESEND_API_KEY,
      Authorization: `Bearer ${RESEND_API_KEY}`,
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

export async function sendOrderEmails(order: OrderNotificationInput): Promise<void> {
  const ownerTo = getOwnerNotificationEmail();
  const tasks: Array<Promise<void>> = [];
  const customer = customerOrderEmail(order);
  tasks.push(
    sendEmail({ to: order.email, subject: customer.subject, html: customer.html }),
  );
  const owner = ownerOrderEmail(order);
  tasks.push(sendEmail({ to: ownerTo, subject: owner.subject, html: owner.html }));
  await Promise.all(
    tasks.map((task) =>
      task.catch((error) => {
        console.error("Order email failed:", error);
      }),
    ),
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendFeedbackEmail(input: {
  full_name: string;
  email: string;
  notes: string;
}): Promise<void> {
  const ownerTo = getOwnerNotificationEmail();
  if (!ownerTo) return;
  const html = `...`;
  await sendEmail({
    to: ownerTo,
    subject: `HOUSE OF FLAGS — Contact form: ${input.full_name}`,
    html,
  });
}
*/
