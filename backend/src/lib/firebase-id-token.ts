import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import type { Request } from "express";

import { assertNavaiPanelAccessAccountIsActive } from "./navai-panel-access-sqlite";
import { resolveProjectRoot } from "./project-root";

type FirebaseJwtHeader = {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
};

type FirebaseJwtPayload = {
  aud?: unknown;
  auth_time?: unknown;
  email?: unknown;
  exp?: unknown;
  iat?: unknown;
  iss?: unknown;
  sub?: unknown;
  user_id?: unknown;
};

type FirebaseCertCache = {
  certs: Record<string, string>;
  expiresAt: number;
};

const FIREBASE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const FIREBASE_LEGACY_USER_ID = "__legacy_unassigned__";

let firebaseCertCache: FirebaseCertCache | null = null;
let firebaseProjectIdCache: string | null = null;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseJwtSection<T>(value: string) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    throw new Error("Invalid Firebase token payload.");
  }
}

function resolveFirebaseProjectIdFromFrontendEnv() {
  const projectRoot = resolveProjectRoot();
  const envCandidates = [
    path.join(projectRoot, "frontend", ".env"),
    path.join(projectRoot, "frontend", ".env.example"),
  ];

  for (const candidate of envCandidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    const parsed = dotenv.parse(fs.readFileSync(candidate));
    const projectId = normalizeString(parsed.PUBLIC_FIREBASE_PROJECT_ID);
    if (projectId) {
      return projectId;
    }
  }

  return "";
}

export function resolveFirebaseProjectId() {
  if (firebaseProjectIdCache) {
    return firebaseProjectIdCache;
  }

  const projectId =
    normalizeString(process.env.FIREBASE_PROJECT_ID) ||
    normalizeString(process.env.PUBLIC_FIREBASE_PROJECT_ID) ||
    resolveFirebaseProjectIdFromFrontendEnv();

  if (!projectId) {
    throw new Error("Firebase project id is not configured.");
  }

  firebaseProjectIdCache = projectId;
  return firebaseProjectIdCache;
}

function parseMaxAgeSeconds(cacheControlHeader: string | null) {
  if (!cacheControlHeader) {
    return 300;
  }

  const match = cacheControlHeader.match(/max-age=(\d+)/i);
  if (!match) {
    return 300;
  }

  const seconds = Number.parseInt(match[1] ?? "300", 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 300;
}

async function fetchFirebaseCerts(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && firebaseCertCache && firebaseCertCache.expiresAt > now) {
    return firebaseCertCache.certs;
  }

  const response = await fetch(FIREBASE_CERTS_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Could not load Firebase signing certificates.");
  }

  const payload = (await response.json()) as Record<string, string>;
  firebaseCertCache = {
    certs: payload,
    expiresAt: now + parseMaxAgeSeconds(response.headers.get("cache-control")) * 1000,
  };

  return firebaseCertCache.certs;
}

async function resolveFirebaseCert(kid: string) {
  const certs = await fetchFirebaseCerts();
  if (certs[kid]) {
    return certs[kid];
  }

  const refreshedCerts = await fetchFirebaseCerts(true);
  return refreshedCerts[kid] ?? "";
}

function verifyFirebaseSignature(token: string, cert: string) {
  const [headerPart, payloadPart, signaturePart] = token.split(".");
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();

  return verifier.verify(cert, Buffer.from(signaturePart, "base64url"));
}

function validateFirebasePayload(payload: FirebaseJwtPayload, projectId: string) {
  const issuer = `https://securetoken.google.com/${projectId}`;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = typeof payload.exp === "number" ? payload.exp : Number(payload.exp);
  const issuedAt = typeof payload.iat === "number" ? payload.iat : Number(payload.iat);
  const authTime =
    typeof payload.auth_time === "number" ? payload.auth_time : Number(payload.auth_time);
  const audience = normalizeString(payload.aud);
  const tokenIssuer = normalizeString(payload.iss);
  const subject = normalizeString(payload.sub);

  if (audience !== projectId || tokenIssuer !== issuer) {
    throw new Error("Firebase token has an invalid audience.");
  }

  if (!subject || subject === FIREBASE_LEGACY_USER_ID) {
    throw new Error("Firebase token has an invalid subject.");
  }

  if (!Number.isFinite(expiresAt) || expiresAt <= nowSeconds) {
    throw new Error("Firebase token has expired.");
  }

  if (!Number.isFinite(issuedAt) || issuedAt > nowSeconds + 300) {
    throw new Error("Firebase token has an invalid issue time.");
  }

  if (Number.isFinite(authTime) && authTime > nowSeconds + 300) {
    throw new Error("Firebase token has an invalid auth time.");
  }

  return subject;
}

export async function verifyFirebaseIdToken(token: string) {
  const normalizedToken = normalizeString(token);
  if (!normalizedToken) {
    throw new Error("Authentication required.");
  }

  const sections = normalizedToken.split(".");
  if (sections.length !== 3) {
    throw new Error("Invalid Firebase token.");
  }

  const header = parseJwtSection<FirebaseJwtHeader>(sections[0] ?? "");
  const payload = parseJwtSection<FirebaseJwtPayload>(sections[1] ?? "");
  const kid = normalizeString(header.kid);
  const algorithm = normalizeString(header.alg);

  if (algorithm !== "RS256" || !kid) {
    throw new Error("Invalid Firebase token header.");
  }

  const projectId = resolveFirebaseProjectId();
  const cert = await resolveFirebaseCert(kid);
  if (!cert) {
    throw new Error("Firebase signing certificate was not found.");
  }

  if (!verifyFirebaseSignature(normalizedToken, cert)) {
    throw new Error("Invalid Firebase token signature.");
  }

  const uid = validateFirebasePayload(payload, projectId);
  const email = normalizeString(payload.email);
  return {
    projectId,
    uid,
    email,
  };
}

export async function requireFirebaseSession(request: Request) {
  const authorizationHeader = request.headers.authorization;
  const bearerToken = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  const session = await verifyFirebaseIdToken(bearerToken);
  await assertNavaiPanelAccessAccountIsActive(session.uid);
  return session;
}

export async function requireActiveFirebaseSession(request: Request) {
  return requireFirebaseSession(request);
}
