import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const feedbackSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  notes: z.string().trim().min(1).max(2000),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const { error } = await supabaseAdmin.from("contact_messages").insert({
        full_name: data.full_name,
        email: data.email,
        notes: data.notes,
      });

      if (error) {
        console.error("submitFeedback insert failed:", error.message);
        const misconfigured =
          error.message.includes("not configured") ||
          error.message.includes("Missing Supabase");
        return {
          ok: false as const,
          error: misconfigured
            ? "Contact form is temporarily unavailable. Try again later."
            : "Could not save your message.",
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("submitFeedback insert threw:", message);
      const misconfigured =
        message.includes("not configured") || message.includes("Missing Supabase");
      return {
        ok: false as const,
        error: misconfigured
          ? "Contact form is temporarily unavailable. Try again later."
          : "Could not save your message.",
      };
    }

    // Resend owner notification disabled for now.
    // try {
    //   const { sendFeedbackEmail } = await import("../server/notifications.server");
    //   await sendFeedbackEmail(data);
    // } catch (mailErr) {
    //   console.error("sendFeedbackEmail threw:", mailErr);
    // }

    return { ok: true as const };
  });
