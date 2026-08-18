import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter } from "./routes/auth";
import { productsRouter } from "./routes/products";
import { ordersRouter } from "./routes/orders";
import { preOrdersRouter } from "./routes/pre-orders";
import { messagesRouter } from "./routes/messages";
import { settingsRouter } from "./routes/settings";
import { supabase } from "./supabase";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

export function createApp(options: { serveStatic?: boolean } = {}) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", async (_req, res) => {
    const { data, error } = await supabase
      .from("products")
      .select("id, image_urls, support_enabled")
      .limit(1);

    if (error) {
      res.status(503).json({
        ok: false,
        db: "error",
        error: error.message,
        code: error.code,
        hint:
          error.message.includes("image_urls") || error.message.includes("support_enabled")
            ? "Apply migration supabase/migrations/20260723190000_product_gallery_delivery_support.sql in the Supabase SQL editor."
            : error.message.toLowerCase().includes("row-level security")
              ? "SUPABASE_SERVICE_ROLE_KEY looks like an anon/publishable key. Set the secret/service_role key in admin env."
              : undefined,
      });
      return;
    }

    res.json({
      ok: true,
      db: "ok",
      schema: {
        image_urls: data !== null,
        support_enabled: data !== null,
      },
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/pre-orders", preOrdersRouter);
  app.use("/api/messages", messagesRouter);
  app.use("/api/settings", settingsRouter);

  if (options.serveStatic !== false) {
    const dist = path.join(root, "dist");
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  return app;
}
