import "jsr:@supabase/functions-js/edge-runtime.d.ts";



const FROM_EMAIL = "houseofflagstn@gmail.com";

const SUBJECT = "HOUSE OF FLAGS — Order confirmed";



const BG = "#0c0b0a";

const FG = "#ece7df";

const MUTED = "#7d7669";

const HAIRLINE = "#2a2724";

const EMBER = "#d96a3a";



const corsHeaders = {

  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Headers":

    "authorization, x-client-info, apikey, content-type",

};



function jsonResponse(body: Record<string, unknown>, status = 200): Response {

  return new Response(JSON.stringify(body), {

    status,

    headers: { ...corsHeaders, "Content-Type": "application/json" },

  });

}



function getRequiredSecret(name: string): string {

  const value = Deno.env.get(name);

  if (!value) {

    throw new Error(`Missing secret: ${name}`);

  }

  return value;

}



function escape(s: string): string {

  return s

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#39;");

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



function buildPlainTextBody(
  customerName: string,
  discountActivated: boolean,
  promoCode: string,
): string {

  return [

    "HOUSE OF FLAGS",
    "Order confirmed",
    "",
    "# Thank you for your order!",
    "",
    `Hello ${customerName},`,

    "",

    "Your order has been received successfully. 🎉",

    "",

    ...(discountActivated
      ? [`Discount code ${promoCode} was activated on your order.`, ""]
      : []),

    "",

    "We'll contact you shortly to confirm the details and next steps.",

    "",

    "Thank you for choosing Us.",

    "House of Flags",

  ].join("\n");

}



function buildHtmlBody(
  customerName: string,
  discountActivated: boolean,
  promoCode: string,
): string {

  const inner = `

    <tr>

      <td style="padding:32px;">

        <div style="font-size:10px;letter-spacing:0.5em;text-transform:uppercase;color:${EMBER};font-family:Helvetica,Arial,sans-serif;margin-bottom:16px;">Checkout complete</div>

        <h1 style="margin:0 0 24px 0;font-size:34px;line-height:1.05;font-weight:normal;color:${FG};">

          Thank you for your order!

        </h1>

        <p style="margin:0 0 20px 0;font-size:15px;line-height:1.65;color:${FG};">

          Hello ${escape(customerName)},

        </p>

        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.65;color:${FG};">

          Your order has been received successfully. 🎉

        </p>

        <div style="border-left:3px solid ${EMBER};padding:16px 0 16px 20px;margin:0 0 24px 0;">

          <p style="margin:0;font-size:14px;line-height:1.65;color:${FG};">

            We'll contact you shortly to confirm the details and next steps.

          </p>

        </div>

        ${
          discountActivated
            ? `<p style="margin:0 0 24px 0;font-size:14px;line-height:1.65;color:${EMBER};">
          Discount code <strong>${escape(promoCode)}</strong> was activated on your order.
        </p>`
            : ""
        }

        <p style="margin:0 0 28px 0;font-size:14px;line-height:1.65;color:${MUTED};">

          Thank you for choosing Us.

        </p>

        <p style="margin:0;font-size:14px;line-height:1.65;color:${FG};">

          Thank you,<br/>

          <span style="color:${EMBER};letter-spacing:0.12em;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif;font-size:11px;">House of Flags</span>

        </p>

      </td>

    </tr>`;

  return shell(inner);

}



async function getGoogleAccessToken(): Promise<string> {

  const clientId = getRequiredSecret("GOOGLE_CLIENT_ID");

  const clientSecret = getRequiredSecret("GOOGLE_CLIENT_SECRET");

  const refreshToken = getRequiredSecret("GOOGLE_REFRESH_TOKEN");



  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {

    method: "POST",

    headers: { "Content-Type": "application/x-www-form-urlencoded" },

    body: new URLSearchParams({

      client_id: clientId,

      client_secret: clientSecret,

      refresh_token: refreshToken,

      grant_type: "refresh_token",

    }),

  });



  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {

    throw new Error(

      `Google token exchange failed: ${JSON.stringify(tokenData)}`,

    );

  }



  return tokenData.access_token as string;

}



function encodeRawEmail(

  to: string,

  subject: string,

  plainBody: string,

  htmlBody: string,

): string {

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

    "Content-Transfer-Encoding: 7bit",

    "",

    plainBody,

    "",

    `--${boundary}`,

    "Content-Type: text/html; charset=utf-8",

    "Content-Transfer-Encoding: 7bit",

    "",

    htmlBody,

    "",

    `--${boundary}--`,

  ].join("\r\n");



  const bytes = new TextEncoder().encode(message);

  let binary = "";

  for (const byte of bytes) {

    binary += String.fromCharCode(byte);

  }



  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

}



async function sendViaGmail(

  accessToken: string,

  to: string,

  subject: string,

  plainBody: string,

  htmlBody: string,

): Promise<void> {

  const raw = encodeRawEmail(to, subject, plainBody, htmlBody);

  const sendRes = await fetch(

    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",

    {

      method: "POST",

      headers: {

        Authorization: `Bearer ${accessToken}`,

        "Content-Type": "application/json",

      },

      body: JSON.stringify({ raw }),

    },

  );



  if (!sendRes.ok) {

    const errorBody = await sendRes.text();

    throw new Error(`Gmail send failed [${sendRes.status}]: ${errorBody}`);

  }

}



Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {

    return new Response("ok", { headers: corsHeaders });

  }



  if (req.method !== "POST") {

    return jsonResponse({ error: "Method not allowed" }, 405);

  }



  try {

    const payload = await req.json();

    const email = typeof payload.email === "string" ? payload.email.trim() : "";

    const customerName =

      typeof payload.customerName === "string" ? payload.customerName.trim() : "";



    const discountActivated = payload.discountActivated === true;
    const promoCode =
      typeof payload.promoCode === "string" ? payload.promoCode.trim() : "";

    if (!email || !customerName) {

      return jsonResponse(

        { error: "email and customerName are required" },

        400,

      );

    }



    const accessToken = await getGoogleAccessToken();

    const plainBody = buildPlainTextBody(
      customerName,
      discountActivated,
      promoCode,
    );

    const htmlBody = buildHtmlBody(customerName, discountActivated, promoCode);

    await sendViaGmail(accessToken, email, SUBJECT, plainBody, htmlBody);



    return jsonResponse({ ok: true });

  } catch (error) {

    console.error("send-checkout-success-email failed:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    return jsonResponse({ error: message }, 500);

  }

});


