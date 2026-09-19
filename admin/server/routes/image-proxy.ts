import { Router } from "express";
import { requireAuth } from "../auth";
import { env } from "../env";

export const imageProxyRouter = Router();
imageProxyRouter.use(requireAuth);

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

function resolveImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
      if (env.isProduction && BLOCKED_HOSTS.has(parsed.hostname)) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("/")) {
    const base = env.storefrontUrl;
    if (!base) return null;
    try {
      return new URL(trimmed, base.endsWith("/") ? base : `${base}/`).toString();
    } catch {
      return null;
    }
  }

  return null;
}

imageProxyRouter.get("/", async (req, res) => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
  const resolved = resolveImageUrl(rawUrl);

  if (!resolved) {
    res.status(400).json({ error: "Invalid or unsupported image URL." });
    return;
  }

  try {
    const response = await fetch(resolved, {
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      res.status(502).json({ error: `Upstream image request failed (${response.status}).` });
      return;
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "URL did not return an image." });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 25 * 1024 * 1024) {
      res.status(413).json({ error: "Image is too large to process (max 25 MB)." });
      return;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(buffer);
  } catch {
    res.status(502).json({ error: "Failed to fetch image." });
  }
});
