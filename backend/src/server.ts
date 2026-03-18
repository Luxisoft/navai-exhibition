import express, { type NextFunction, type Request, type Response } from "express";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { createExpressSpeechSynthesizeHandler } from "@navai/voice-backend";

import { getDocsSearch } from "./handlers/docs-search";
import {
  getCloudflareImageDetailsHandler,
  postCloudflareImageDirectUploadHandler,
  postCloudflareStreamDirectUploadHandler,
  postCloudflareStreamDownloadHandler,
} from "./handlers/cloudflare";
import { getEcommerceDemoSeed } from "./handlers/ecommerce-demo";
import {
  getPublicNavaiRouteAccessHandler,
  getNavaiPanelActorHandler,
  getNavaiPanelManagedUsersHandler,
  getNavaiPanelRolePermissionsHandler,
  getNavaiPanelRouteAccessHandler,
  putNavaiPanelManagedUserRoleHandler,
  putNavaiPanelRolePermissionsHandler,
  putNavaiPanelRouteAccessHandler,
} from "./handlers/navai-panel-access";
import {
  deleteNavaiPanelDomainHandler,
  getNavaiPanelDomain,
  getNavaiPanelDomains,
  postNavaiPanelDomain,
  putNavaiPanelDomain,
} from "./handlers/navai-panel-domains";
import {
  deleteNavaiPanelEvaluationHandler,
  deleteNavaiPanelEvaluationAgentHandler,
  deleteNavaiPanelSurveyHandler,
  deleteNavaiPanelSurveyAgentHandler,
  getNavaiEntryBillingHandler,
  getNavaiEntryPackagesAdminHandler,
  getNavaiPointsCashoutRequestsHandler,
  getNavaiPointsWalletHandler,
  getNavaiReferralProgramHandler,
  getNavaiPanelDashboardSummaryHandler,
  getNavaiPanelEvaluationAgentsHandler,
  getNavaiPanelEvaluationAgentSettingsHandler,
  getNavaiPanelEvaluationsHandler,
  getNavaiPanelEvaluationResponsesHandler,
  getNavaiPanelUserProfileHandler,
  getNavaiPanelUserVerificationHandler,
  getNavaiPanelPendingUserVerificationsHandler,
  getNavaiPanelSupportTicketsHandler,
  getPublicNavaiExperienceAccessHandler,
  getPublicNavaiExperienceCommentsHandler,
  getPublicNavaiExperienceTopHandler,
  getNavaiPanelSurveyAgentsHandler,
  getNavaiPanelSurveyAgentSettingsHandler,
  getNavaiPanelSurveysHandler,
  getNavaiPanelSurveyResponsesHandler,
  getPublicNavaiUserProfileHandler,
  postNavaiEntryOrderConfirmHandler,
  postNavaiEntryOrderHandler,
  postNavaiPointsCashoutRequestHandler,
  postNavaiPanelEvaluationResponseGradeHandler,
  postNavaiPanelUserAccountDeletionHandler,
  postNavaiPanelSurveyResponseGradeHandler,
  postNavaiEntryWompiWebhookHandler,
  getPublicNavaiEvaluationHandler,
  getPublicNavaiSurveyHandler,
  postNavaiPanelEvaluationAgentHandler,
  postNavaiPanelEvaluationHandler,
  postNavaiPanelSurveyAgentHandler,
  postNavaiPanelSurveyHandler,
  postNavaiPanelSupportMessageHandler,
  postNavaiPanelSupportTicketHandler,
  postPublicNavaiExperienceCommentHandler,
  postPublicNavaiConversationHandler,
  postPublicNavaiConversationProgressHandler,
  postPublicNavaiEvaluationLaunchHandler,
  postPublicNavaiSurveyLaunchHandler,
  putNavaiPanelUserProfileHandler,
  putNavaiPointsCashoutPaymentSettingsHandler,
  putNavaiPointsCashoutRequestReviewHandler,
  putNavaiPanelUserVerificationHandler,
  putNavaiPanelUserVerificationReviewHandler,
  putPublicNavaiExperienceCommentHandler,
  putNavaiPanelEvaluationAgentHandler,
  putNavaiPanelEvaluationAgentSettingsHandler,
  putNavaiPanelEvaluationHandler,
  putNavaiPanelSurveyAgentHandler,
  putNavaiPanelSurveyAgentSettingsHandler,
  putNavaiPanelSurveyHandler,
  putNavaiEntryPackageAdminHandler,
  deletePublicNavaiExperienceCommentHandler,
} from "./handlers/navai-panel-workspace";
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
import { getHCaptchaSiteKeyFromEnv } from "./lib/hcaptcha";
import { getNavaiVoiceOptionsFromEnv } from "./lib/navai-backend-runtime";
import { startNavaiAccountDeletionScheduler } from "./lib/navai-account-deletion-scheduler";

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
  const siteKey = getHCaptchaSiteKeyFromEnv();
  response.json({ siteKey });
});

app.post("/api/cloudflare/images/direct-upload", withAsync(postCloudflareImageDirectUploadHandler));
app.get("/api/cloudflare/images/:id", withAsync(getCloudflareImageDetailsHandler));
app.post("/api/cloudflare/stream/direct-upload", withAsync(postCloudflareStreamDirectUploadHandler));
app.post("/api/cloudflare/stream/:uid/downloads", withAsync(postCloudflareStreamDownloadHandler));
app.post("/api/quote", withAsync(postQuote));
app.get("/api/docs-search", withAsync(getDocsSearch));
app.get("/api/ecommerce-demo/seed", withAsync(getEcommerceDemoSeed));
app.get("/api/navai-panel/domains", withAsync(getNavaiPanelDomains));
app.get("/api/navai-panel/domains/:id", withAsync(getNavaiPanelDomain));
app.post("/api/navai-panel/domains", withAsync(postNavaiPanelDomain));
app.put("/api/navai-panel/domains/:id", withAsync(putNavaiPanelDomain));
app.delete("/api/navai-panel/domains/:id", withAsync(deleteNavaiPanelDomainHandler));
app.get("/api/navai-panel/auth/me", withAsync(getNavaiPanelActorHandler));
app.get("/api/navai-route-access", withAsync(getPublicNavaiRouteAccessHandler));
app.get("/api/navai-panel/admin/users", withAsync(getNavaiPanelManagedUsersHandler));
app.get("/api/navai-panel/admin/roles", withAsync(getNavaiPanelRolePermissionsHandler));
app.get("/api/navai-panel/admin/routes", withAsync(getNavaiPanelRouteAccessHandler));
app.get(
  "/api/navai-panel/admin/verifications/pending",
  withAsync(getNavaiPanelPendingUserVerificationsHandler)
);
app.put("/api/navai-panel/admin/users/:uid/role", withAsync(putNavaiPanelManagedUserRoleHandler));
app.put("/api/navai-panel/admin/roles/:role", withAsync(putNavaiPanelRolePermissionsHandler));
app.put(
  "/api/navai-panel/admin/routes/:routeId",
  withAsync(putNavaiPanelRouteAccessHandler)
);
app.put(
  "/api/navai-panel/admin/verifications/:userId",
  withAsync(putNavaiPanelUserVerificationReviewHandler)
);
app.get(
  "/api/navai-panel/admin/entries/packages",
  withAsync(getNavaiEntryPackagesAdminHandler)
);
app.put(
  "/api/navai-panel/admin/entries/packages/:key",
  withAsync(putNavaiEntryPackageAdminHandler)
);
app.get("/api/navai-panel/dashboard-summary", withAsync(getNavaiPanelDashboardSummaryHandler));
app.get("/api/navai-panel/profile", withAsync(getNavaiPanelUserProfileHandler));
app.put("/api/navai-panel/profile", withAsync(putNavaiPanelUserProfileHandler));
app.post(
  "/api/navai-panel/profile/delete-request",
  withAsync(postNavaiPanelUserAccountDeletionHandler)
);
app.get("/api/navai-panel/profile/verification", withAsync(getNavaiPanelUserVerificationHandler));
app.put("/api/navai-panel/profile/verification", withAsync(putNavaiPanelUserVerificationHandler));
app.get("/api/navai-panel/billing/entries", withAsync(getNavaiEntryBillingHandler));
app.get("/api/navai-panel/points/wallet", withAsync(getNavaiPointsWalletHandler));
app.put(
  "/api/navai-panel/points/cashout/settings",
  withAsync(putNavaiPointsCashoutPaymentSettingsHandler)
);
app.post(
  "/api/navai-panel/points/cashout/requests",
  withAsync(postNavaiPointsCashoutRequestHandler)
);
app.get(
  "/api/navai-panel/admin/points/cashout/requests",
  withAsync(getNavaiPointsCashoutRequestsHandler)
);
app.put(
  "/api/navai-panel/admin/points/cashout/requests/:id",
  withAsync(putNavaiPointsCashoutRequestReviewHandler)
);
app.get("/api/navai-panel/referrals", withAsync(getNavaiReferralProgramHandler));
app.post("/api/navai-panel/billing/entries/orders", withAsync(postNavaiEntryOrderHandler));
app.post(
  "/api/navai-panel/billing/entries/confirm",
  withAsync(postNavaiEntryOrderConfirmHandler)
);
app.get("/api/navai-panel/evaluations", withAsync(getNavaiPanelEvaluationsHandler));
app.get("/api/navai-panel/evaluations/:id/responses", withAsync(getNavaiPanelEvaluationResponsesHandler));
app.post(
  "/api/navai-panel/evaluations/:id/responses/:conversationId/grade",
  withAsync(postNavaiPanelEvaluationResponseGradeHandler)
);
app.get("/api/navai-panel/evaluations/agents", withAsync(getNavaiPanelEvaluationAgentsHandler));
app.get(
  "/api/navai-panel/evaluations/settings",
  withAsync(getNavaiPanelEvaluationAgentSettingsHandler)
);
app.post("/api/navai-panel/evaluations/agents", withAsync(postNavaiPanelEvaluationAgentHandler));
app.post("/api/navai-panel/evaluations", withAsync(postNavaiPanelEvaluationHandler));
app.put("/api/navai-panel/evaluations/agents/:id", withAsync(putNavaiPanelEvaluationAgentHandler));
app.put(
  "/api/navai-panel/evaluations/settings",
  withAsync(putNavaiPanelEvaluationAgentSettingsHandler)
);
app.put("/api/navai-panel/evaluations/:id", withAsync(putNavaiPanelEvaluationHandler));
app.delete(
  "/api/navai-panel/evaluations/agents/:id",
  withAsync(deleteNavaiPanelEvaluationAgentHandler)
);
app.delete("/api/navai-panel/evaluations/:id", withAsync(deleteNavaiPanelEvaluationHandler));
app.get("/api/navai-panel/surveys", withAsync(getNavaiPanelSurveysHandler));
app.get("/api/navai-panel/surveys/:id/responses", withAsync(getNavaiPanelSurveyResponsesHandler));
app.post(
  "/api/navai-panel/surveys/:id/responses/:conversationId/grade",
  withAsync(postNavaiPanelSurveyResponseGradeHandler)
);
app.get("/api/navai-panel/surveys/agents", withAsync(getNavaiPanelSurveyAgentsHandler));
app.get("/api/navai-panel/surveys/settings", withAsync(getNavaiPanelSurveyAgentSettingsHandler));
app.post("/api/navai-panel/surveys/agents", withAsync(postNavaiPanelSurveyAgentHandler));
app.post("/api/navai-panel/surveys", withAsync(postNavaiPanelSurveyHandler));
app.put("/api/navai-panel/surveys/agents/:id", withAsync(putNavaiPanelSurveyAgentHandler));
app.put("/api/navai-panel/surveys/settings", withAsync(putNavaiPanelSurveyAgentSettingsHandler));
app.put("/api/navai-panel/surveys/:id", withAsync(putNavaiPanelSurveyHandler));
app.delete("/api/navai-panel/surveys/agents/:id", withAsync(deleteNavaiPanelSurveyAgentHandler));
app.delete("/api/navai-panel/surveys/:id", withAsync(deleteNavaiPanelSurveyHandler));
app.get("/api/navai-panel/support/tickets", withAsync(getNavaiPanelSupportTicketsHandler));
app.post("/api/navai-panel/support/tickets", withAsync(postNavaiPanelSupportTicketHandler));
app.post(
  "/api/navai-panel/support/tickets/:id/messages",
  withAsync(postNavaiPanelSupportMessageHandler)
);
app.get("/api/navai-public/evaluations/:slug", withAsync(getPublicNavaiEvaluationHandler));
app.post(
  "/api/navai-public/evaluations/:slug/launch",
  withAsync(postPublicNavaiEvaluationLaunchHandler)
);
app.get("/api/navai-public/surveys/:slug", withAsync(getPublicNavaiSurveyHandler));
app.post("/api/navai-public/surveys/:slug/launch", withAsync(postPublicNavaiSurveyLaunchHandler));
app.get("/api/navai-public/:kind/:slug/access", withAsync(getPublicNavaiExperienceAccessHandler));
app.get("/api/navai-public/:kind/:slug/top", withAsync(getPublicNavaiExperienceTopHandler));
app.get(
  "/api/navai-public/:kind/:slug/comments",
  withAsync(getPublicNavaiExperienceCommentsHandler)
);
app.post(
  "/api/navai-public/:kind/:slug/comments",
  withAsync(postPublicNavaiExperienceCommentHandler)
);
app.put(
  "/api/navai-public/comments/:id",
  withAsync(putPublicNavaiExperienceCommentHandler)
);
app.delete(
  "/api/navai-public/comments/:id",
  withAsync(deletePublicNavaiExperienceCommentHandler)
);
app.get(
  "/api/navai-public/users/:userId/profile",
  withAsync(getPublicNavaiUserProfileHandler)
);
app.post("/api/navai-public/:kind/:slug/conversations", withAsync(postPublicNavaiConversationHandler));
app.post(
  "/api/navai-public/conversations/:id/progress",
  withAsync(postPublicNavaiConversationProgressHandler)
);
app.post("/api/payments/wompi/webhook", withAsync(postNavaiEntryWompiWebhookHandler));

app.post("/navai/realtime/client-secret", withAsync(postRealtimeClientSecret));
app.post(
  "/navai/speech/synthesize",
  createExpressSpeechSynthesizeHandler(getNavaiVoiceOptionsFromEnv())
);
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

startNavaiAccountDeletionScheduler();

app.listen(port, () => {
  console.log(`NAVAI backend running on http://localhost:${port}`);
});
