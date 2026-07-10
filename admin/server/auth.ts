import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "./env";

const COOKIE_NAME = "hof_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  return crypto.createHmac("sha256", env.sessionSecret).update(payload).digest("hex");
}

function createSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `admin:${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (sign(payload) !== signature) return false;
  const [, expiresRaw] = payload.split(":");
  const expires = Number(expiresRaw);
  return Number.isFinite(expires) && expires > Date.now();
}

export function setSessionCookie(res: Response) {
  const token = createSessionToken();
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[COOKIE_NAME] as string | undefined;
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function checkAccessCode(code: string): boolean {
  const a = Buffer.from(code.trim());
  const b = Buffer.from(env.adminAccessCode);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
