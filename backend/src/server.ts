import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
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
import {
  createNavaiAbuseProtection,
  NAVAI_BROWSER_CLIENT_ID_HEADER,
} from "./lib/navai-abuse-protection";

import { resolveProjectRoot } from "./lib/project-root";

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

function readBooleanEnv(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function readCsvEnv(value: string | undefined) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function isCorsApiPath(pathname: string) {
  return pathname.startsWith("/api/") || pathname.startsWith("/navai/");
}

function setCorsHeaders(request: Request, response: Response) {
  const requestOrigin = request.headers.origin;
  if (!requestOrigin || requestOrigin.trim().length === 0) {
    return;
  }

  const isAllowedOrigin = corsAllowAnyOrigin || corsAllowedOrigins.includes(requestOrigin);
  if (!isAllowedOrigin) {
    return;
  }

  if (corsAllowAnyOrigin && !corsAllowCredentials) {
    response.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    response.setHeader("Access-Control-Allow-Origin", requestOrigin);
    response.setHeader("Vary", "Origin");
  }

  if (corsAllowCredentials) {
    response.setHeader("Access-Control-Allow-Credentials", "true");
  }

  response.setHeader("Access-Control-Allow-Methods", corsAllowedMethods);
  response.setHeader("Access-Control-Allow-Headers", corsAllowedHeaders);

  if (corsExposeHeaders.length > 0) {
    response.setHeader("Access-Control-Expose-Headers", corsExposeHeaders);
  }
}

const projectRoot = resolveProjectRoot();
const envPathCandidates = [
  path.join(projectRoot, "backend", ".env"),
  path.join(projectRoot, ".env"),
];
const envPath = envPathCandidates.find((candidate) => fs.existsSync(candidate));
dotenv.config(envPath ? { path: envPath } : undefined);
const corsAllowedOrigins = readCsvEnv(
  process.env.CORS_ALLOWED_ORIGINS ?? "https://navai.luxisoft.com"
);
const corsAllowAnyOrigin = corsAllowedOrigins.includes("*");
const corsAllowCredentials = readBooleanEnv(process.env.CORS_ALLOW_CREDENTIALS) ?? false;
const corsAllowedMethods =
  process.env.CORS_ALLOWED_METHODS ?? "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const configuredCorsAllowedHeaders =
  process.env.CORS_ALLOWED_HEADERS ?? "Content-Type, Authorization, X-Requested-With";
const corsAllowedHeaders = Array.from(
  new Set(
    configuredCorsAllowedHeaders
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .concat(NAVAI_BROWSER_CLIENT_ID_HEADER)
  )
).join(", ");
const corsExposeHeaders = process.env.CORS_EXPOSE_HEADERS?.trim() ?? "";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "2mb" }));
app.use((request, response, next) => {
  if (!isCorsApiPath(request.path)) {
    next();
    return;
  }

  setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  next();
});
app.use(
  "/navai",
  createNavaiAbuseProtection({
    allowedOrigins: corsAllowedOrigins,
    allowAnyOrigin: corsAllowAnyOrigin,
  })
);

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/backend-capabilities", (_request, response) => {
  response.json({
    hasBackendApiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
});

app.get("/api/hcaptcha/site-key", (_request, response) => {
  const siteKey = process.env.PUBLIC_HCAPTCHA_SITE_KEY ?? process.env.HCAPTCHA_SITE_KEY ?? "";
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

app.get(/.*/, (request, response) => {
  if (request.path.startsWith("/api/") || request.path.startsWith("/navai/")) {
    return response.status(404).json({ ok: false, error: "not_found" });
  }

  if (request.path === "/") {
    return response.json({
      ok: true,
      service: "navai-backend",
      mode: "api-only",
    });
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
