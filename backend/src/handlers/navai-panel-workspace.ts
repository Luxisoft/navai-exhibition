import type { Request, Response } from "express";
import nodemailer from "nodemailer";
import { z } from "zod";

import { requireFirebaseSession } from "../lib/firebase-id-token";
import {
  getHCaptchaSecretKeyFromEnv,
  getHCaptchaSiteKeyFromEnv,
  resolveRequestClientIp,
  verifyHCaptchaToken,
} from "../lib/hcaptcha";
import {
  getNavaiPanelSupportRecipients,
  isNavaiPanelSupportActor,
} from "../lib/navai-panel-access";
import {
  requestNavaiPanelAccessAccountDeletion,
  resolveStoredNavaiPanelActor,
} from "../lib/navai-panel-access-sqlite";
import {
  createNavaiPointsCashoutRequest,
  createNavaiPanelEvaluation,
  createNavaiPanelEvaluationAgent,
  createNavaiEntryOrder,
  createPublicNavaiExperienceComment,
  confirmNavaiEntryOrder,
  listNavaiEntryPackagesForAdmin,
  getNavaiReferralProgram,
  getNavaiEntryBilling,
  getNavaiPointsWallet,
  getNavaiPanelEvaluationAgentSettings,
  getNavaiPanelUserProfile,
  getNavaiPanelUserVerification,
  createNavaiPanelSupportMessage,
  createNavaiPanelSupportTicket,
  createNavaiPanelSurvey,
  createNavaiPanelSurveyAgent,
  deletePublicNavaiExperienceComment,
  deleteNavaiPanelEvaluationAgent,
  deleteNavaiPanelEvaluation,
  deleteNavaiPanelSurveyAgent,
  deleteNavaiPanelSurvey,
  gradeNavaiPanelEvaluationResponse,
  gradeNavaiPanelSurveyResponse,
  getNavaiPanelDashboardSummary,
  listNavaiPanelEvaluationAgents,
  getNavaiPanelSurveyAgentSettings,
  getPublicNavaiEvaluation,
  getPublicNavaiExperienceAccessStatus,
  getPublicNavaiSurvey,
  getNavaiPublicUserProfile,
  listNavaiPanelEvaluations,
  listNavaiPanelPendingUserVerifications,
  listNavaiPanelSurveyAgents,
  listNavaiPanelEvaluationResponses,
  listNavaiPanelSurveyResponses,
  listPublicNavaiExperienceComments,
  listPublicNavaiExperienceTop,
  listNavaiPanelSupportTickets,
  listNavaiPanelSurveys,
  listNavaiPointsCashoutRequests,
  startPublicNavaiExperienceConversation,
  trackPublicNavaiEvaluationLaunch,
  trackPublicNavaiSurveyLaunch,
  processNavaiEntryWompiWebhook,
  requestNavaiPanelUserAccountDeletion,
  reviewNavaiPointsCashoutRequest,
  reviewNavaiPanelUserVerification,
  submitNavaiPanelUserVerification,
  updatePublicNavaiExperienceComment,
  updatePublicNavaiExperienceConversationProgress,
  updateNavaiPanelEvaluation,
  updateNavaiPanelEvaluationAgent,
  updateNavaiPanelEvaluationAgentSettings,
  updateNavaiPointsCashoutPaymentSettings,
  updateNavaiPanelUserProfile,
  updateNavaiPanelSurvey,
  updateNavaiPanelSurveyAgent,
  updateNavaiPanelSurveyAgentSettings,
  upsertNavaiEntryPackage,
} from "../lib/navai-panel-workspace-sqlite";

const publicConversationStartSchema = z.object({
  hcaptchaToken: z.string().trim().optional().default(""),
  hcaptchaEkey: z.string().trim().optional().default(""),
});

const entryOrderConfirmSchema = z.object({
  orderId: z.string().trim().optional().default(""),
  transactionId: z.string().trim().optional().default(""),
});

const entryOrderCreateSchema = z.object({
  referralCode: z.string().trim().optional().default(""),
  packageKey: z.string().trim().optional().default(""),
});

const entryPackageUpsertSchema = z.object({
  name: z.string().trim().optional().default(""),
  description: z.string().trim().optional().default(""),
  entriesCount: z.coerce.number().optional().default(1),
  priceUsd: z.coerce.number().optional().default(0),
  vatPercentage: z.coerce.number().optional().default(19),
  isActive: z.coerce.boolean().optional().default(true),
  sortOrder: z.coerce.number().optional().default(0),
});

const pointsCashoutPaymentSettingsSchema = z.object({
  paymentMethod: z.string().trim().optional().default(""),
  accountHolder: z.string().trim().optional().default(""),
  accountReference: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
});

const pointsCashoutRequestSchema = pointsCashoutPaymentSettingsSchema.extend({
  requestedPoints: z.coerce.number().optional().default(0),
});

const pointsCashoutReviewSchema = z.object({
  status: z.string().trim().optional().default(""),
  responseMessage: z.string().trim().optional().default(""),
});

const pointsCashoutListQuerySchema = z.object({
  status: z.string().trim().optional().default(""),
  limit: z.coerce.number().optional().default(300),
});

function resolveErrorStatus(message: string) {
  if (
    message === "Ticket not found." ||
    message === "Domain not found." ||
    message === "Experience not found." ||
    message === "Agent not found." ||
    message === "Public experience not found." ||
    message === "Conversation not found." ||
    message === "Comment not found." ||
    message === "Order not found." ||
    message === "Verification request not found." ||
    message === "Cashout request not found."
  ) {
    return 404;
  }

  if (
    message === "invalid_payload" ||
    message === "captcha_invalid" ||
    message === "captcha_service_unavailable" ||
    message === "captcha_required"
  ) {
    return 400;
  }

  if (
    message === "Authentication required." ||
    message === "Invalid Firebase token." ||
    message === "Invalid Firebase token header." ||
    message === "Invalid Firebase token payload." ||
    message === "Invalid Firebase token signature." ||
    message === "Firebase token has an invalid audience." ||
    message === "Firebase token has an invalid subject." ||
    message === "Firebase token has expired." ||
    message === "Firebase token has an invalid issue time." ||
    message === "Firebase token has an invalid auth time." ||
    message === "Firebase signing certificate was not found."
  ) {
    return 401;
  }

  if (
    message === "Ticket subject is required." ||
    message === "Message body is required." ||
    message === "Ticket id is required." ||
    message === "Experience name is required." ||
    message === "Agent name is required." ||
    message === "Experience id is required." ||
    message === "Agent id is required." ||
    message === "Conversation id is required." ||
    message === "Comment id is required." ||
    message === "Comment body is required." ||
    message === "Comment rating must be between 1 and 5." ||
    message === "User id is required." ||
    message === "Invalid billing payload." ||
    message === "Verification review status is required." ||
    message === "Private experiences require at least one allowed email." ||
    message === "End date and time must be later than start date and time." ||
    message === "Transaction id is required." ||
    message === "Entry package key is required." ||
    message === "Entry package name is required." ||
    message === "Entry package is not available." ||
    message === "Cashout request id is required." ||
    message === "Cashout account reference is required." ||
    message === "Requested points must be at least 1." ||
    message === "Insufficient available points for cashout request." ||
    message === "Cashout review status is required." ||
    message === "Verification full name is required." ||
    message === "Verification document number is required." ||
    message === "Verification document country is required." ||
    message === "Verification face image is required." ||
    message === "Verification document front image is required." ||
    message === "Verification document back image is required." ||
    message.startsWith("Invalid email address: ") ||
    message === "Start date and time is invalid." ||
    message === "End date and time is invalid."
  ) {
    return 400;
  }

  if (
    message === "Cashout request has already been processed." ||
    message === "At least one active entry package is required." ||
    message === "No active entry packages are configured." ||
    message === "A public URL with that slug already exists."
  ) {
    return 409;
  }

  if (
    message === "Editing table data is not allowed for this role." ||
    message === "Deleting table data is not allowed for this role." ||
    message === "Administrator permissions are required." ||
    message === "This private experience is only available to selected email accounts." ||
    message === "This experience requires at least one available entry." ||
    message === "This experience is not currently active." ||
    message === "This experience is not available yet." ||
    message === "This experience is no longer available." ||
    message === "Comments are not enabled for this experience." ||
    message === "You do not have permission to manage this comment." ||
    message === "This account is inactive."
  ) {
    return 403;
  }

  if (message === "Daily attempt limit reached for this experience.") {
    return 429;
  }

  if (
    message === "AI grading requires OPENAI_API_KEY on the backend." ||
    message === "Wompi checkout URL is not configured." ||
    message === "WOMPI API key is not configured."
  ) {
    return 503;
  }

  return 500;
}

function readRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getBooleanEnv(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function assertCanEditTableData(actor: { permissions: { canEditTableData: boolean } }) {
  if (!actor.permissions.canEditTableData) {
    throw new Error("Editing table data is not allowed for this role.");
  }
}

function assertCanDeleteTableData(actor: { permissions: { canDeleteTableData: boolean } }) {
  if (!actor.permissions.canDeleteTableData) {
    throw new Error("Deleting table data is not allowed for this role.");
  }
}

async function notifySupportMailbox(subject: string, text: string, replyTo?: string) {
  const recipients = getNavaiPanelSupportRecipients();
  const smtpHost = process.env.SMTP_HOST;
  const smtpPortRaw = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (recipients.length === 0 || !smtpHost || !smtpPortRaw || !smtpUser || !smtpPass) {
    return;
  }

  const smtpPort = Number.parseInt(smtpPortRaw, 10);
  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: getBooleanEnv(process.env.SMTP_SECURE, smtpPort === 465),
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? smtpUser,
    to: recipients.join(", "),
    ...(replyTo ? { replyTo } : {}),
    subject,
    text,
  });
}

export async function getNavaiPanelDashboardSummaryHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const summary = await getNavaiPanelDashboardSummary(actor);
    response.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load dashboard summary.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelEvaluationsHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const items = await listNavaiPanelEvaluations(session.uid);
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load evaluations.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelEvaluationResponsesHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const items = await listNavaiPanelEvaluationResponses(session.uid, readRouteParam(request.params.id));
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load evaluation responses.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPanelEvaluationResponseGradeHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await gradeNavaiPanelEvaluationResponse(
      session.uid,
      readRouteParam(request.params.id),
      readRouteParam(request.params.conversationId)
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not grade evaluation responses.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelEvaluationAgentSettingsHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const settings = await getNavaiPanelEvaluationAgentSettings(session.uid);
    response.json({ ok: true, settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load evaluation agent settings.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelEvaluationAgentsHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const items = await listNavaiPanelEvaluationAgents(session.uid);
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load evaluation agents.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPanelEvaluationAgentHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await createNavaiPanelEvaluationAgent(session.uid, request.body ?? {});
    response.status(201).json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create evaluation agent.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelEvaluationAgentHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await updateNavaiPanelEvaluationAgent(
      session.uid,
      readRouteParam(request.params.id),
      request.body ?? {}
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update evaluation agent.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function deleteNavaiPanelEvaluationAgentHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanDeleteTableData(actor);
    const result = await deleteNavaiPanelEvaluationAgent(session.uid, readRouteParam(request.params.id));
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete evaluation agent.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelEvaluationAgentSettingsHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const settings = await updateNavaiPanelEvaluationAgentSettings(session.uid, request.body ?? {});
    response.json({ ok: true, settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update evaluation agent settings.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPanelEvaluationHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await createNavaiPanelEvaluation(session.uid, request.body ?? {});
    response.status(201).json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create evaluation.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelEvaluationHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await updateNavaiPanelEvaluation(
      session.uid,
      readRouteParam(request.params.id),
      request.body ?? {}
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update evaluation.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function deleteNavaiPanelEvaluationHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanDeleteTableData(actor);
    const result = await deleteNavaiPanelEvaluation(session.uid, readRouteParam(request.params.id));
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete evaluation.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelSurveysHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const items = await listNavaiPanelSurveys(session.uid);
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load surveys.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelSurveyResponsesHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const items = await listNavaiPanelSurveyResponses(session.uid, readRouteParam(request.params.id));
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load survey responses.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPanelSurveyResponseGradeHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await gradeNavaiPanelSurveyResponse(
      session.uid,
      readRouteParam(request.params.id),
      readRouteParam(request.params.conversationId)
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not grade survey responses.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelSurveyAgentSettingsHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const settings = await getNavaiPanelSurveyAgentSettings(session.uid);
    response.json({ ok: true, settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load survey agent settings.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelSurveyAgentsHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const items = await listNavaiPanelSurveyAgents(session.uid);
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load survey agents.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPanelSurveyAgentHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await createNavaiPanelSurveyAgent(session.uid, request.body ?? {});
    response.status(201).json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create survey agent.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelSurveyAgentHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await updateNavaiPanelSurveyAgent(
      session.uid,
      readRouteParam(request.params.id),
      request.body ?? {}
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update survey agent.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function deleteNavaiPanelSurveyAgentHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanDeleteTableData(actor);
    const result = await deleteNavaiPanelSurveyAgent(session.uid, readRouteParam(request.params.id));
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete survey agent.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelSurveyAgentSettingsHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const settings = await updateNavaiPanelSurveyAgentSettings(session.uid, request.body ?? {});
    response.json({ ok: true, settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update survey agent settings.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPanelSurveyHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await createNavaiPanelSurvey(session.uid, request.body ?? {});
    response.status(201).json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create survey.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelSurveyHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await updateNavaiPanelSurvey(
      session.uid,
      readRouteParam(request.params.id),
      request.body ?? {}
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update survey.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function deleteNavaiPanelSurveyHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanDeleteTableData(actor);
    const result = await deleteNavaiPanelSurvey(session.uid, readRouteParam(request.params.id));
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete survey.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelUserProfileHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const profile = await getNavaiPanelUserProfile(session.uid, session.email ?? "");
    response.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load user profile.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelUserVerificationHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const verification = await getNavaiPanelUserVerification(session.uid, session.email ?? "");
    response.json({ ok: true, verification });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load user verification.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiEntryBillingHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const billing = await getNavaiEntryBilling(actor);
    response.json({ ok: true, billing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load entry billing.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiEntryPackagesAdminHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const items = await listNavaiEntryPackagesForAdmin(actor);
    response.json({ ok: true, items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load entry packages.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiEntryPackageAdminHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const parsed = entryPackageUpsertSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return response.status(400).json({ ok: false, error: "Invalid billing payload." });
    }

    const item = await upsertNavaiEntryPackage(
      actor,
      readRouteParam(request.params.key),
      parsed.data
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save entry package.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPointsWalletHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const wallet = await getNavaiPointsWallet(actor);
    response.json({ ok: true, wallet });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load points wallet.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPointsCashoutPaymentSettingsHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const parsed = pointsCashoutPaymentSettingsSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return response.status(400).json({ ok: false, error: "Invalid billing payload." });
    }

    const settings = await updateNavaiPointsCashoutPaymentSettings(
      session.uid,
      parsed.data
    );
    response.json({ ok: true, settings });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not update cashout payment settings.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPointsCashoutRequestHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const parsed = pointsCashoutRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return response.status(400).json({ ok: false, error: "Invalid billing payload." });
    }

    const requestItem = await createNavaiPointsCashoutRequest(session.uid, parsed.data);
    response.status(201).json({ ok: true, item: requestItem });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create cashout request.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPointsCashoutRequestsHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const parsed = pointsCashoutListQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return response.status(400).json({ ok: false, error: "Invalid billing payload." });
    }

    const items = await listNavaiPointsCashoutRequests(actor, parsed.data);
    response.json({ ok: true, items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load cashout requests.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPointsCashoutRequestReviewHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const parsed = pointsCashoutReviewSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return response.status(400).json({ ok: false, error: "Invalid billing payload." });
    }

    const item = await reviewNavaiPointsCashoutRequest(
      actor,
      readRouteParam(request.params.id),
      parsed.data
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not review cashout request.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiReferralProgramHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const program = await getNavaiReferralProgram(session.uid);
    response.json({ ok: true, program });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load referral program.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiEntryOrderHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const parsed = entryOrderCreateSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return response.status(400).json({ ok: false, error: "Invalid billing payload." });
    }

    const result = await createNavaiEntryOrder(session.uid, session.email ?? "", parsed.data);
    response.status(201).json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create entry order.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiEntryOrderConfirmHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const parsed = entryOrderConfirmSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return response.status(400).json({ ok: false, error: "Invalid billing payload." });
    }

    const result = await confirmNavaiEntryOrder(session.uid, parsed.data);
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not confirm entry order.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiEntryWompiWebhookHandler(request: Request, response: Response) {
  try {
    const result = await processNavaiEntryWompiWebhook(
      request.body ?? {},
      typeof request.headers["x-event-checksum"] === "string"
        ? request.headers["x-event-checksum"]
        : undefined
    );
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process Wompi webhook.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelUserProfileHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const profile = await updateNavaiPanelUserProfile(
      session.uid,
      session.email ?? "",
      request.body ?? {}
    );
    response.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update user profile.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPanelUserAccountDeletionHandler(
  request: Request,
  response: Response,
) {
  try {
    const session = await requireFirebaseSession(request);
    const profile = await requestNavaiPanelUserAccountDeletion(
      session.uid,
      session.email ?? "",
    );
    await requestNavaiPanelAccessAccountDeletion(session.uid, session.email ?? "");
    response.json({ ok: true, profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not request account deletion.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelUserVerificationHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const verification = await submitNavaiPanelUserVerification(
      session.uid,
      session.email ?? "",
      request.body ?? {}
    );
    response.json({ ok: true, verification });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not submit user verification.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelPendingUserVerificationsHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const items = await listNavaiPanelPendingUserVerifications(actor);
    response.json({ ok: true, items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load pending verifications.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelUserVerificationReviewHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const item = await reviewNavaiPanelUserVerification(
      actor,
      readRouteParam(request.params.userId),
      request.body ?? {}
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not review user verification.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getPublicNavaiEvaluationHandler(request: Request, response: Response) {
  try {
    const item = await getPublicNavaiEvaluation(readRouteParam(request.params.slug));
    if (!item) {
      response.status(404).json({ ok: false, error: "Public experience not found." });
      return;
    }
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load evaluation.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getPublicNavaiSurveyHandler(request: Request, response: Response) {
  try {
    const item = await getPublicNavaiSurvey(readRouteParam(request.params.slug));
    if (!item) {
      response.status(404).json({ ok: false, error: "Public experience not found." });
      return;
    }
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load survey.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getPublicNavaiExperienceTopHandler(request: Request, response: Response) {
  try {
    const kind = readRouteParam(request.params.kind) === "survey" ? "survey" : "evaluation";
    const items = await listPublicNavaiExperienceTop(kind, normalizeString(readRouteParam(request.params.slug)));
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load experience ranking.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getPublicNavaiExperienceCommentsHandler(
  request: Request,
  response: Response
) {
  try {
    const kind = readRouteParam(request.params.kind) === "survey" ? "survey" : "evaluation";
    const items = await listPublicNavaiExperienceComments(
      kind,
      normalizeString(readRouteParam(request.params.slug))
    );
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load experience comments.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getPublicNavaiExperienceAccessHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const kind = readRouteParam(request.params.kind) === "survey" ? "survey" : "evaluation";
    const item = await getPublicNavaiExperienceAccessStatus(
      kind,
      normalizeString(readRouteParam(request.params.slug)),
      session.uid,
      session.email ?? ""
    );
    response.json({ ok: true, ...item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not validate experience access.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postPublicNavaiExperienceCommentHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const kind = readRouteParam(request.params.kind) === "survey" ? "survey" : "evaluation";
    const item = await createPublicNavaiExperienceComment(
      kind,
      normalizeString(readRouteParam(request.params.slug)),
      { uid: session.uid, email: session.email ?? "" },
      request.body ?? {}
    );
    response.status(201).json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create comment.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putPublicNavaiExperienceCommentHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const item = await updatePublicNavaiExperienceComment(
      readRouteParam(request.params.id),
      { uid: session.uid, isAdmin: actor.role === "admin" },
      request.body ?? {}
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update comment.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function deletePublicNavaiExperienceCommentHandler(
  request: Request,
  response: Response
) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const result = await deletePublicNavaiExperienceComment(
      readRouteParam(request.params.id),
      { uid: session.uid, isAdmin: actor.role === "admin" }
    );
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete comment.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getPublicNavaiUserProfileHandler(request: Request, response: Response) {
  try {
    const profile = await getNavaiPublicUserProfile(readRouteParam(request.params.userId));
    response.json({ ok: true, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load public profile.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postPublicNavaiEvaluationLaunchHandler(request: Request, response: Response) {
  try {
    const item = await trackPublicNavaiEvaluationLaunch(readRouteParam(request.params.slug));
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not track evaluation launch.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postPublicNavaiSurveyLaunchHandler(request: Request, response: Response) {
  try {
    const item = await trackPublicNavaiSurveyLaunch(readRouteParam(request.params.slug));
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not track survey launch.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postPublicNavaiConversationHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const parsed = publicConversationStartSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return response.status(400).json({ ok: false, error: "invalid_payload" });
    }

    const kind = readRouteParam(request.params.kind) === "survey" ? "survey" : "evaluation";
    const slug = normalizeString(readRouteParam(request.params.slug));
    const publicExperience =
      kind === "survey" ? await getPublicNavaiSurvey(slug) : await getPublicNavaiEvaluation(slug);

    if (!publicExperience) {
      return response.status(404).json({ ok: false, error: "Public experience not found." });
    }

    if (publicExperience.enableHCaptcha) {
      if (!parsed.data.hcaptchaToken) {
        return response.status(400).json({ ok: false, error: "captcha_required" });
      }

      const siteSecret = getHCaptchaSecretKeyFromEnv();
      if (!siteSecret) {
        return response.status(500).json({ ok: false, error: "captcha_not_configured" });
      }

      const captchaCheck = await verifyHCaptchaToken(
        parsed.data.hcaptchaToken,
        resolveRequestClientIp(request),
        getHCaptchaSiteKeyFromEnv(),
        siteSecret
      );
      if (!captchaCheck.success) {
        return response
          .status(400)
          .json({ ok: false, error: "captcha_invalid", details: captchaCheck.errorCodes });
      }
    }

    const result = await startPublicNavaiExperienceConversation(
      kind,
      slug,
      session.uid,
      session.email ?? ""
    );
    response.status(201).json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create public conversation.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postPublicNavaiConversationProgressHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const result = await updatePublicNavaiExperienceConversationProgress(
      readRouteParam(request.params.id),
      session.uid,
      request.body ?? {}
    );
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update public conversation.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function getNavaiPanelSupportTicketsHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const items = await listNavaiPanelSupportTickets(actor);
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load tickets.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPanelSupportTicketHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const item = await createNavaiPanelSupportTicket(actor, request.body ?? {});
    if (!isNavaiPanelSupportActor(actor)) {
      void notifySupportMailbox(
        `NAVAI Support - New ticket: ${item.subject}`,
        [
          `Requester: ${actor.email || actor.uid}`,
          `Channel: ${item.channel}`,
          `Status: ${item.status}`,
          "",
          "Conversation:",
          ...item.messages.flatMap((message) => [
            `${message.author}: ${message.body || "(attachments only)"}`,
            ...message.attachments.map((attachment) => `Attachment: ${attachment.url}`),
          ]),
        ].join("\n"),
        actor.email || undefined
      ).catch(() => undefined);
    }
    response.status(201).json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create ticket.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPanelSupportMessageHandler(request: Request, response: Response) {
  try {
    const session = await requireFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const item = await createNavaiPanelSupportMessage(actor, readRouteParam(request.params.id), request.body ?? {});
    if (!isNavaiPanelSupportActor(actor)) {
      void notifySupportMailbox(
        `NAVAI Support - New reply: ${item.subject}`,
        [
          `Requester: ${actor.email || actor.uid}`,
          `Channel: ${item.channel}`,
          `Status: ${item.status}`,
          "",
          "Latest conversation:",
          ...item.messages.flatMap((message) => [
            `${message.author}: ${message.body || "(attachments only)"}`,
            ...message.attachments.map((attachment) => `Attachment: ${attachment.url}`),
          ]),
        ].join("\n"),
        actor.email || undefined
      ).catch(() => undefined);
    }
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send ticket message.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}
