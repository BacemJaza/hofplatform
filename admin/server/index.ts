import { createServer as createViteServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { env } from "./env";

async function main() {
  const app = createApp({ serveStatic: env.isProduction });

  if (!env.isProduction) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(env.port, () => {
    console.log(`Admin dashboard running at http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
