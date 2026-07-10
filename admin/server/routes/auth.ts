import { Router } from "express";
import { z } from "zod";
import {
  checkAccessCode,
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
  verifySessionToken,
} from "../auth";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const parsed = z.object({ code: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Access code is required." });
    return;
  }
  if (!checkAccessCode(parsed.data.code)) {
    res.status(401).json({ error: "Invalid access code." });
    return;
  }
  setSessionCookie(res);
  res.json({ ok: true });
});

authRouter.post("/logout", requireAuth, (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  const token = req.cookies.hof_admin_session as string | undefined;
  res.json({ authenticated: verifySessionToken(token) });
});
