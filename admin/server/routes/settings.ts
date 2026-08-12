import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { supabase, type SiteSettingsRow } from "../supabase";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

const settingsSchema = z.object({
  delivery_fee_tnd: z.coerce.number().min(0).max(99999),
});

settingsRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("site_settings")
      .insert({ id: 1, delivery_fee_tnd: 8 })
      .select("*")
      .single();

    if (insertError) {
      res.status(500).json({ error: insertError.message });
      return;
    }
    res.json({ settings: created as SiteSettingsRow });
    return;
  }

  res.json({ settings: data as SiteSettingsRow });
});

settingsRouter.put("/", async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .upsert({ id: 1, delivery_fee_tnd: parsed.data.delivery_fee_tnd })
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ settings: data as SiteSettingsRow });
});
