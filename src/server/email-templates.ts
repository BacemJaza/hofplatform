// Pure HTML email templates themed to match HOUSE OF FLAGS's editorial look:
// dark bg, hairline borders, uppercase tracking, ember accent.

type OrderItem = {
  slug: string;
  qty: number;
  unit_price_tnd: number;
  line_total_tnd: number;
};

type OrderEmailData = {
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

const BG = "#0c0b0a";
const FG = "#ece7df";
const MUTED = "#7d7669";
const HAIRLINE = "#2a2724";
const EMBER = "#d96a3a";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTND(n: number): string {
  return `${n.toLocaleString("en-US")} TND`;
}

function itemsRows(items: OrderItem[]): string {
  return items
    .map(
      (it) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid ${HAIRLINE};font-size:13px;color:${FG};text-transform:uppercase;letter-spacing:0.15em;">
            ${escape(it.slug)}
          </td>
          <td style="padding:14px 0;border-bottom:1px solid ${HAIRLINE};font-size:11px;color:${MUTED};text-align:center;letter-spacing:0.2em;">
            × ${it.qty}
          </td>
          <td style="padding:14px 0;border-bottom:1px solid ${HAIRLINE};font-size:13px;color:${FG};text-align:right;">
            ${formatTND(it.line_total_tnd)}
          </td>
        </tr>`,
    )
    .join("");
}

function shell(inner: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:${BG};font-family:Georgia,'Times New Roman',serif;color:${FG};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border:1px solid ${HAIRLINE};">
            <tr>
              <td style="padding:32px 32px 24px 32px;border-bottom:1px solid ${HAIRLINE};">
                <div style="font-size:10px;letter-spacing:0.5em;text-transform:uppercase;color:${EMBER};font-family:Helvetica,Arial,sans-serif;">HOUSE OF FLAGS</div>
              </td>
            </tr>
            ${inner}
            <tr>
              <td style="padding:24px 32px;border-top:1px solid ${HAIRLINE};font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:${MUTED};font-family:Helvetica,Arial,sans-serif;">
                Shipped from Tunis · No restocks
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function customerOrderEmail(data: OrderEmailData): { subject: string; html: string } {
  const inner = `
    <tr>
      <td style="padding:32px;">
        <div style="font-size:10px;letter-spacing:0.5em;text-transform:uppercase;color:${MUTED};font-family:Helvetica,Arial,sans-serif;margin-bottom:16px;">Order received</div>
        <h1 style="margin:0 0 24px 0;font-size:36px;line-height:1;font-weight:normal;color:${FG};">
          In a heartbeat,<br/>it's yours.
        </h1>
        <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:${FG};">
          ${escape(data.customerName)}, we got it. Your flag is being prepared. We'll reach out shortly with shipping details.
        </p>
        <div style="border:1px solid ${HAIRLINE};padding:16px 20px;margin:0 0 32px 0;">
          <div style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:${MUTED};font-family:Helvetica,Arial,sans-serif;margin-bottom:6px;">Reference</div>
          <div style="font-size:20px;color:${FG};">${escape(data.orderRef)}</div>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${itemsRows(data.items)}
          <tr>
            <td style="padding:20px 0 0 0;font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:${MUTED};font-family:Helvetica,Arial,sans-serif;">Total</td>
            <td></td>
            <td style="padding:20px 0 0 0;text-align:right;font-size:24px;color:${FG};">${formatTND(data.total)}</td>
          </tr>
        </table>
      </td>
    </tr>`;
  return {
    subject: `HOUSE OF FLAGS — Order ${data.orderRef} received`,
    html: shell(inner),
  };
}

export function ownerOrderEmail(data: OrderEmailData): { subject: string; html: string } {
  const inner = `
    <tr>
      <td style="padding:32px;">
        <div style="font-size:10px;letter-spacing:0.5em;text-transform:uppercase;color:${EMBER};font-family:Helvetica,Arial,sans-serif;margin-bottom:16px;">New order</div>
        <h1 style="margin:0 0 24px 0;font-size:32px;line-height:1.1;font-weight:normal;color:${FG};">
          ${escape(data.orderRef)}
        </h1>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
          ${itemsRows(data.items)}
          <tr>
            <td style="padding:20px 0 0 0;font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:${MUTED};font-family:Helvetica,Arial,sans-serif;">Total</td>
            <td></td>
            <td style="padding:20px 0 0 0;text-align:right;font-size:22px;color:${FG};">${formatTND(data.total)}</td>
          </tr>
        </table>

        <div style="border-top:1px solid ${HAIRLINE};padding-top:24px;">
          <div style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:${MUTED};font-family:Helvetica,Arial,sans-serif;margin-bottom:12px;">Customer</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:${FG};line-height:1.7;">
            <tr><td style="width:90px;color:${MUTED};font-family:Helvetica,Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;">Name</td><td>${escape(data.customerName)}</td></tr>
            <tr><td style="color:${MUTED};font-family:Helvetica,Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;">Email</td><td>${escape(data.email)}</td></tr>
            <tr><td style="color:${MUTED};font-family:Helvetica,Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;">Phone</td><td>${escape(data.phone)}</td></tr>
            <tr><td style="color:${MUTED};font-family:Helvetica,Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;">City</td><td>${escape(data.city)}</td></tr>
            <tr><td style="color:${MUTED};font-family:Helvetica,Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;vertical-align:top;">Address</td><td>${escape(data.address)}</td></tr>
            ${
              data.notes
                ? `<tr><td style="color:${MUTED};font-family:Helvetica,Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;vertical-align:top;">Notes</td><td>${escape(data.notes)}</td></tr>`
                : ""
            }
          </table>
        </div>
      </td>
    </tr>`;
  return {
    subject: `HOUSE OF FLAGS — New order ${data.orderRef} (${formatTND(data.total)})`,
    html: shell(inner),
  };
}
