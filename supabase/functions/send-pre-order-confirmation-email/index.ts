import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FROM_EMAIL = "houseofflagstn@gmail.com";
const SUBJECT_PREFIX = "HOUSE OF FLAGS — Pre-order received";
const BG = "#0c0b0a";
const FG = "#ece7df";
const MUTED = "#7d7669";
const HAIRLINE = "#2a2724";
const EMBER = "#d96a3a";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-preorder-email-secret",
};

type PreOrderItem = {
  slug: string;
  qty: number;
  line_total_tnd: number;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTnd(value: number): string {
  return `${value.toFixed(2)} TND`;
}

function shell(inner: string): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
  <body style="margin:0;padding:0;background:${BG};font-family:Georgia,'Times New Roman',serif;color:${FG};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border:1px solid ${HAIRLINE};">
          <tr><td style="padding:32px 32px 24px;border-bottom:1px solid ${HAIRLINE};">
            <div style="font-size:10px;letter-spacing:0.5em;text-transform:uppercase;color:${EMBER};font-family:Helvetica,Arial,sans-serif;">HOUSE OF FLAGS</div>
          </td></tr>
          ${inner}
          <tr><td style="padding:24px 32px;border-top:1px solid ${HAIRLINE};font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:${MUTED};font-family:Helvetica,Arial,sans-serif;">Shipped from Tunis · No restocks</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function buildBodies(customerName: string, preOrderRef: string, items: PreOrderItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.line_total_tnd, 0);
  const textItems = items.map((item) =>
    `${item.slug.replace(/[-_]/g, " ")} × ${item.qty} — ${formatTnd(item.line_total_tnd)}`
  );
  const htmlItems = items.map((item) => {
    const productName = escape(item.slug.replace(/[-_]/g, " "));
    return `<tr>
      <td style="padding:12px 0;border-bottom:1px solid ${HAIRLINE};font-size:14px;color:${FG};">${productName} × ${item.qty}</td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid ${HAIRLINE};font-size:14px;color:${FG};white-space:nowrap;">${formatTnd(item.line_total_tnd)}</td>
    </tr>`;
  }).join("");

  const plain = [
    "HOUSE OF FLAGS",
    "Pre-order received",
    "",
    `Hello ${customerName},`,
    "",
    "We have received your pre-order request.",
    `Reference: ${preOrderRef}`,
    "",
    "Items:",
    ...textItems,
    "",
    `Product subtotal: ${formatTnd(subtotal)}`,
    "",
    "No payment is due with this request. We will contact you to confirm availability, delivery, and payment details when the piece is ready.",
    "",
    "Thank you,",
    "House of Flags",
  ].join("\n");

  const html = shell(`
    <tr><td style="padding:32px;">
      <div style="font-size:10px;letter-spacing:0.5em;text-transform:uppercase;color:${EMBER};font-family:Helvetica,Arial,sans-serif;margin-bottom:16px;">Pre-order received</div>
      <h1 style="margin:0 0 24px;font-size:34px;line-height:1.05;font-weight:normal;color:${FG};">Your request is with us.</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:${FG};">Hello ${escape(customerName)},</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:${FG};">We have received your pre-order request. Keep this reference for your records:</p>
      <div style="border-left:3px solid ${EMBER};padding:12px 0 12px 20px;margin:0 0 28px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.2em;color:${EMBER};">${escape(preOrderRef)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${htmlItems}
        <tr><td style="padding:18px 0 0;font-size:13px;color:${MUTED};">Product subtotal</td><td align="right" style="padding:18px 0 0;font-size:14px;color:${FG};white-space:nowrap;">${formatTnd(subtotal)}</td></tr>
      </table>
      <p style="margin:28px 0 0;border-left:3px solid ${EMBER};padding:4px 0 4px 20px;font-size:14px;line-height:1.65;color:${FG};">No payment is due with this request. We will contact you to confirm availability, delivery, and payment details when the piece is ready.</p>
      <p style="margin:28px 0 0;font-size:14px;line-height:1.65;color:${FG};">Thank you,<br/><span style="color:${EMBER};letter-spacing:0.12em;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif;font-size:11px;">House of Flags</span></p>
    </td></tr>`);

  return { plain, html, subtotal };
}

async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google email secrets");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== "string") {
    throw new Error(`Google token exchange failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

function encodeRawEmail(to: string, subject: string, plain: string, html: string): string {
  const boundary = `alt_${crypto.randomUUID().replace(/-/g, "")}`;
  const message = [
    `From: House of Flags <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    plain,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");
  const bytes = new TextEncoder().encode(message);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("PREORDER_EMAIL_SECRET");
  if (!expectedSecret || req.headers.get("x-preorder-email-secret") !== expectedSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = await req.json();
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    const customerName = typeof payload.customerName === "string" ? payload.customerName.trim() : "";
    const preOrderRef = typeof payload.preOrderRef === "string" ? payload.preOrderRef.trim() : "";
    const items = Array.isArray(payload.items) ? payload.items as PreOrderItem[] : [];
    if (!email || !customerName || !preOrderRef || items.length === 0) {
      return jsonResponse({ error: "email, customerName, preOrderRef, and items are required" }, 400);
    }
    if (items.some((item) =>
      typeof item.slug !== "string" ||
      !Number.isInteger(item.qty) || item.qty < 1 ||
      typeof item.line_total_tnd !== "number" || !Number.isFinite(item.line_total_tnd)
    )) {
      return jsonResponse({ error: "Invalid pre-order items" }, 400);
    }

    const { plain, html } = buildBodies(customerName, preOrderRef, items);
    const accessToken = await getGoogleAccessToken();
    const raw = encodeRawEmail(email, `${SUBJECT_PREFIX} — ${preOrderRef}`, plain, html);
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!response.ok) {
      throw new Error(`Gmail send failed [${response.status}]: ${await response.text()}`);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("send-pre-order-confirmation-email failed:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});