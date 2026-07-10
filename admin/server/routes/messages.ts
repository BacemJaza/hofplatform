import { Router } from "express";
import { requireAuth } from "../auth";
import { supabase, type MessageRow } from "../supabase";

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

messagesRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ messages: data as MessageRow[] });
});

messagesRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Message not found." });
    return;
  }
  res.json({ message: data as MessageRow });
});

messagesRouter.delete("/:id", async (req, res) => {
  const { error, count } = await supabase
    .from("contact_messages")
    .delete({ count: "exact" })
    .eq("id", req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!count) {
    res.status(404).json({ error: "Message not found." });
    return;
  }
  res.json({ ok: true });
});
