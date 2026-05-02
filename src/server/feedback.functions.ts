import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getExternalSupabaseAdmin } from "@/integrations/supabase/external-admin.server";

const feedbackSchema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  notes: z.string().trim().min(1).max(2000),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await getExternalSupabaseAdmin()
      .from("clients_feedback")
      .insert({
        full_name: data.full_name,
        email: data.email,
        notes: data.notes,
      });

    if (error) {
      console.error("submitFeedback insert failed:", error.message);
      return { ok: false as const, error: "Could not save your message." };
    }

    // Best-effort owner notification — never fail the submission on email error.
    try {
      const { sendFeedbackEmail } = await import("./notifications.server");
      await sendFeedbackEmail(data);
    } catch (mailErr) {
      console.error("sendFeedbackEmail threw:", mailErr);
    }

    return { ok: true as const };
  });
