import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Serves POST /api/generate-integrations in dev using the same handler the Vercel function uses.
function apiDevPlugin(): Plugin {
  return {
    name: "appsync-api-dev",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      for (const key of ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"]) {
        if (env[key] && !process.env[key]) process.env[key] = env[key];
      }

      server.middlewares.use("/api/favicon", async (req, res) => {
        const tool = new URL(req.url ?? "", "http://localhost").searchParams.get("tool");
        const mod = await server.ssrLoadModule("/server/favicon.ts");
        const result = await mod.getFavicon(tool);
        res.statusCode = result.status;
        if (result.status === 200) {
          res.setHeader("content-type", result.contentType);
          res.end(Buffer.from(result.body));
        } else {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: result.error }));
        }
      });

      server.middlewares.use("/api/generate-integrations", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        let body: unknown = null;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          body = null;
        }
        const mod = await server.ssrLoadModule("/server/generate.ts");
        const result = await mod.generateIntegrations(body, req.socket.remoteAddress ?? "local");
        res.statusCode = result.status;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(result.body));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevPlugin()],
});
