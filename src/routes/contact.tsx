import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useT } from "@/hooks/use-language";
import { submitFeedback } from "@/lib/feedback.server";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — HOUSE OF FLAGS" },
      {
        name: "description",
        content:
          "Reach HOUSE OF FLAGS — Tunis. Email, phone, Instagram, TikTok, or send a note from the studio.",
      },
      { property: "og:title", content: "Contact — HOUSE OF FLAGS" },
      {
        property: "og:description",
        content: "Get in touch with the studio in Tunis.",
      },
    ],
  }),
  component: Contact,
});

const TIKTOK_URL = "https://www.tiktok.com/@houseofflagstn";
const INSTAGRAM_URL = "https://www.instagram.com/houseofflagstn";
const EMAIL = "houseofflagstn@gmail.com";
const PHONE_DISPLAY = "+216 53 069 199";
const PHONE_HREF = "+21653069199";

function Contact() {
  const t = useT();
  const [form, setForm] = useState({ full_name: "", email: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await submitFeedback({
        data: {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          notes: form.notes.trim(),
        },
      });
      if (!res.ok) {
        toast.error(res.error || "Could not send your message.");
        return;
      }
      setSubmitted(true);
      setForm({ full_name: "", email: "", notes: "" });
    } catch (err) {
      console.error("Feedback submission failed:", err);
      toast.error("Could not send your message. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="pt-24 md:pt-32 mt-3.5">
      <section className="mx-auto px-6 py-10 md:py-16 md:px-10">
        <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
          {t("contact.tag")}
        </p>
        <h1 className="mt-6 font-display text-5xl leading-[0.95] break-words sm:text-6xl md:mt-8 md:text-8xl">
          {t("contact.title")}
        </h1>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground md:mt-8">
          {t("contact.intro")}
        </p>
      </section>

      <section className="mx-auto grid max-w-[1100px] grid-cols-1 gap-12 px-6 pb-24 md:gap-16 md:grid-cols-[1fr_1.2fr] md:px-10">
        {/* Channels */}
        <div className="space-y-8">
          <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
            {t("contact.channels")}
          </p>
          <ul className="space-y-6 border-t hairline pt-6">
            <ChannelRow label={t("contact.email")} value={EMAIL} href={`mailto:${EMAIL}`} />
            <ChannelRow label={t("contact.phone")} value={PHONE_DISPLAY} href={`tel:${PHONE_HREF}`} />
            <ChannelRow label="Instagram" value="@houseofflagstn" href={INSTAGRAM_URL} external />
            <ChannelRow label="TikTok" value="@houseofflagstn" href={TIKTOK_URL} external />
          </ul>
        </div>

        {/* Form */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">
            {t("contact.formTag")}
          </p>
          <h2 className="mt-4 font-display text-3xl md:text-4xl">
            {t("contact.formTitle")}
          </h2>

          {submitted ? (
            <div className="mt-10 border hairline p-8 text-center">
              <p className="text-[10px] uppercase tracking-[0.5em] ember-text">
                ● {t("contact.successTag")}
              </p>
              <p className="mt-6 font-display text-3xl">{t("contact.successTitle")}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                {t("contact.successBody")}
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-8 border hairline px-6 py-3 text-[10px] uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background"
              >
                {t("contact.sendAnother")}
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-8">
              <Field
                label={t("contact.fullName")}
                value={form.full_name}
                required
                onChange={(v) => setForm({ ...form, full_name: v })}
              />
              <Field
                label={t("contact.email")}
                type="email"
                value={form.email}
                required
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                  {t("contact.notes")} <span className="ember-text">*</span>
                </span>
                <textarea
                  required
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={5}
                  maxLength={2000}
                  className="mt-3 w-full resize-none border hairline bg-transparent p-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground sm:text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full border hairline py-5 text-xs uppercase tracking-[0.4em] transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? t("contact.sending") : t("contact.send")}
              </button>
            </form>
          )}
        </div>
      </section>
    </article>
  );
}

function ChannelRow({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <li className="flex flex-col items-start gap-2 border-b hairline pb-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
        {label}
      </span>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="break-all text-sm text-foreground transition-colors hover:ember-text sm:break-normal"
      >
        {value}
      </a>
    </li>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
        {label}
        {required && <span className="ember-text"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full border-b hairline bg-transparent py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground sm:text-sm"
      />
    </label>
  );
}
