import "dotenv/config";

import express, { type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";

import { getDocsSearch } from "./handlers/docs-search";
import { getEcommerceDemoSeed } from "./handlers/ecommerce-demo";
import {
  getNavaiFunctions,
  postNavaiExecuteFunction,
} from "./handlers/navai-functions";
import { postQuote } from "./handlers/quote";
import { postRealtimeClientSecret } from "./handlers/realtime-client-secret";

import { resolveProjectRoot } from "@/lib/project-root";

type AsyncHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => Promise<unknown> | unknown;

function withAsync(handler: AsyncHandler) {
  return (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function stripLeadingSlash(value: string) {
  return value.replace(/^\/+/, "");
}

function serveRouteHtml(distDir: string, request: Request, response: Response) {
  const cleanPath = request.path.replace(/\/+$/, "");
  const relativePath = cleanPath === "" ? "index" : stripLeadingSlash(cleanPath);
  const candidates = [
    path.join(distDir, `${relativePath}.html`),
    path.join(distDir, relativePath, "index.html"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      response.setHeader("Cache-Control", "no-cache");
      response.sendFile(candidate);
      return true;
    }
  }

  return false;
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/hcaptcha/site-key", (_request, response) => {
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? process.env.HCAPTCHA_SITE_KEY ?? "";
  response.json({ siteKey });
});

app.post("/api/quote", withAsync(postQuote));
app.get("/api/docs-search", withAsync(getDocsSearch));
app.get("/api/ecommerce-demo/seed", withAsync(getEcommerceDemoSeed));

app.post("/navai/realtime/client-secret", withAsync(postRealtimeClientSecret));
app.get("/navai/functions", withAsync(getNavaiFunctions));
app.post("/navai/functions/execute", withAsync(postNavaiExecuteFunction));

app.get("/documentacion/readme-raiz", (_request, response) => {
  response.redirect(308, "/documentation/home");
});
app.get("/documentation/readme-raiz", (_request, response) => {
  response.redirect(308, "/documentation/home");
});
app.get("/pedir-implementacion", (_request, response) => {
  response.redirect(308, "/request-implementation");
});
app.get(/^\/documentacion\/(.*)$/, (request, response) => {
  const tail = request.params[0];
  response.redirect(308, `/documentation/${tail ?? ""}`);
});

const projectRoot = resolveProjectRoot();
const frontendDist = path.join(projectRoot, "frontend", "dist");

if (fs.existsSync(frontendDist)) {
  app.use(
    express.static(frontendDist, {
      index: false,
      setHeaders: (response, filePath) => {
        if (filePath.endsWith(".html")) {
          response.setHeader("Cache-Control", "no-cache");
          return;
        }

        if (filePath.endsWith(".xml") || filePath.endsWith(".txt")) {
          response.setHeader("Cache-Control", "public, max-age=3600");
          return;
        }

        response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    })
  );
}

app.get(/.*/, (request, response) => {
  if (request.path.startsWith("/api/") || request.path.startsWith("/navai/")) {
    return response.status(404).json({ ok: false, error: "not_found" });
  }

  if (!fs.existsSync(frontendDist)) {
    return response.status(500).json({
      ok: false,
      error: "frontend_dist_missing",
      hint: "Run `npm run build:frontend` before starting the server.",
    });
  }

  if (serveRouteHtml(frontendDist, request, response)) {
    return;
  }

  const notFoundHtml = path.join(frontendDist, "404.html");
  if (fs.existsSync(notFoundHtml)) {
    response.status(404).setHeader("Cache-Control", "no-cache");
    response.sendFile(notFoundHtml);
    return;
  }

  response.status(404).json({ ok: false, error: "not_found" });
});

app.use(
  (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : "Unhandled server error.";
    response.status(500).json({ ok: false, error: message });
  }
);

const portRaw = process.env.PORT ?? "3000";
const port = Number.parseInt(portRaw, 10);
if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT value: '${portRaw}'.`);
}

app.listen(port, () => {
  console.log(`NAVAI backend running on http://localhost:${port}`);
});
