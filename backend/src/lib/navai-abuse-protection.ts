import type { NextFunction, Request, Response } from "express";

const NAVAI_BROWSER_CLIENT_ID_HEADER = "X-NAVAI-Client-Id";
const NORMALIZED_NAVAI_BROWSER_CLIENT_ID_HEADER = NAVAI_BROWSER_CLIENT_ID_HEADER.toLowerCase();
const VALID_BROWSER_CLIENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{7,127}$/i;
const CLEANUP_EVERY_REQUESTS = 80;

type NavaiAbuseProtectionOptions = {
  allowedOrigins: string[];
  allowAnyOrigin: boolean;
};

type NavaiAbuseProtectionConfig = {
  enabled: boolean;
  allowMissingOrigin: boolean;
  requireBrowserClientId: boolean;
  windowMs: number;
  blockMs: number;
  maxRequestsPerWindow: number;
  maxClientSecretsPerWindow: number;
  maxFunctionListsPerWindow: number;
  maxFunctionExecutionsPerWindow: number;
  minClientSecretIntervalMs: number;
};

type NavaiIdentityBudgetState = {
  key: string;
  windowStartedAt: number;
  lastSeenAt: number;
  blockedUntil: number;
  totalRequests: number;
  clientSecretRequests: number;
  functionListRequests: number;
  functionExecuteRequests: number;
  lastClientSecretAt: number;
};

type LimitDecision =
  | { allowed: true }
  | {
      allowed: false;
      status: number;
      retryAfterSeconds?: number;
      message: string;
    };

function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function readPositiveIntegerEnv(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function secondsToMs(seconds: number) {
  return seconds * 1000;
}

function formatRetryAfterSeconds(valueMs: number) {
  return Math.max(1, Math.ceil(valueMs / 1000));
}

function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

function normalizeRemoteIp(value: string | undefined) {
  const normalized = (value ?? "unknown").trim().toLowerCase();
  return normalized.replace(/^::ffff:/, "") || "unknown";
}

function readBrowserClientId(request: Request) {
  const rawValue = request.get(NAVAI_BROWSER_CLIENT_ID_HEADER)?.trim() ?? "";
  if (!rawValue || !VALID_BROWSER_CLIENT_ID_PATTERN.test(rawValue)) {
    return "";
  }

  return rawValue.toLowerCase();
}

function createIdentityBudgetState(identityKey: string, now: number): NavaiIdentityBudgetState {
  return {
    key: identityKey,
    windowStartedAt: now,
    lastSeenAt: now,
    blockedUntil: 0,
    totalRequests: 0,
    clientSecretRequests: 0,
    functionListRequests: 0,
    functionExecuteRequests: 0,
    lastClientSecretAt: 0,
  };
}

function resetBudgetWindow(state: NavaiIdentityBudgetState, now: number) {
  state.windowStartedAt = now;
  state.totalRequests = 0;
  state.clientSecretRequests = 0;
  state.functionListRequests = 0;
  state.functionExecuteRequests = 0;
}

function resolveBudgetKind(request: Request) {
  if (request.method === "POST" && request.path === "/realtime/client-secret") {
    return "clientSecret";
  }

  if (request.method === "GET" && request.path === "/functions") {
    return "functionsList";
  }

  if (request.method === "POST" && request.path === "/functions/execute") {
    return "functionsExecute";
  }

  return "generic";
}

function buildRateLimitMessage(scopeLabel: string, retryAfterSeconds: number) {
  return `NAVAI usage limit reached for ${scopeLabel}. Try again in ${retryAfterSeconds} seconds.`;
}

function readProtectionConfigFromEnv(): NavaiAbuseProtectionConfig {
  return {
    enabled: readBooleanEnv(process.env.NAVAI_SECURITY_ENABLED, true),
    allowMissingOrigin: readBooleanEnv(process.env.NAVAI_SECURITY_ALLOW_MISSING_ORIGIN, true),
    requireBrowserClientId: readBooleanEnv(
      process.env.NAVAI_SECURITY_REQUIRE_BROWSER_CLIENT_ID,
      true
    ),
    windowMs: secondsToMs(
      readPositiveIntegerEnv(process.env.NAVAI_SECURITY_WINDOW_SECONDS, 600)
    ),
    blockMs: secondsToMs(
      readPositiveIntegerEnv(process.env.NAVAI_SECURITY_BLOCK_SECONDS, 600)
    ),
    maxRequestsPerWindow: readPositiveIntegerEnv(
      process.env.NAVAI_SECURITY_MAX_REQUESTS_PER_WINDOW,
      240
    ),
    maxClientSecretsPerWindow: readPositiveIntegerEnv(
      process.env.NAVAI_SECURITY_MAX_CLIENT_SECRETS_PER_WINDOW,
      10
    ),
    maxFunctionListsPerWindow: readPositiveIntegerEnv(
      process.env.NAVAI_SECURITY_MAX_FUNCTION_LISTS_PER_WINDOW,
      120
    ),
    maxFunctionExecutionsPerWindow: readPositiveIntegerEnv(
      process.env.NAVAI_SECURITY_MAX_FUNCTION_EXECUTIONS_PER_WINDOW,
      150
    ),
    minClientSecretIntervalMs: secondsToMs(
      readPositiveIntegerEnv(
        process.env.NAVAI_SECURITY_MIN_CLIENT_SECRET_INTERVAL_SECONDS,
        8
      )
    ),
  };
}

export function createNavaiAbuseProtection({
  allowedOrigins,
  allowAnyOrigin,
}: NavaiAbuseProtectionOptions) {
  const config = readProtectionConfigFromEnv();
  const normalizedAllowedOrigins = new Set(
    allowedOrigins
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
  );
  const budgets = new Map<string, NavaiIdentityBudgetState>();
  let handledRequests = 0;

  function cleanupExpiredBudgets(now: number) {
    handledRequests += 1;
    if (handledRequests % CLEANUP_EVERY_REQUESTS !== 0) {
      return;
    }

    const expirationCutoff = now - Math.max(config.windowMs, config.blockMs) * 2;
    for (const [key, state] of budgets) {
      const isLongExpired =
        state.lastSeenAt < expirationCutoff && state.blockedUntil < now;
      if (isLongExpired) {
        budgets.delete(key);
      }
    }
  }

  function getBudgetState(request: Request, now: number) {
    const browserClientId = readBrowserClientId(request);
    const remoteIp = normalizeRemoteIp(request.ip);
    const identityKey = browserClientId
      ? `cid:${browserClientId}`
      : `ip:${remoteIp}`;
    const existingState = budgets.get(identityKey);
    if (existingState) {
      existingState.lastSeenAt = now;
      return existingState;
    }

    const createdState = createIdentityBudgetState(identityKey, now);
    budgets.set(identityKey, createdState);
    return createdState;
  }

  function rejectRequest(
    response: Response,
    decision: Extract<LimitDecision, { allowed: false }>
  ) {
    if (typeof decision.retryAfterSeconds === "number") {
      response.setHeader("Retry-After", String(decision.retryAfterSeconds));
    }

    response
      .status(decision.status)
      .type("text/plain; charset=utf-8")
      .send(decision.message);
  }

  function evaluateRequest(request: Request, state: NavaiIdentityBudgetState, now: number): LimitDecision {
    if (state.blockedUntil > now) {
      return {
        allowed: false,
        status: 429,
        retryAfterSeconds: formatRetryAfterSeconds(state.blockedUntil - now),
        message: buildRateLimitMessage(
          "NAVAI voice access",
          formatRetryAfterSeconds(state.blockedUntil - now)
        ),
      };
    }

    if (now - state.windowStartedAt >= config.windowMs) {
      resetBudgetWindow(state, now);
    }

    state.totalRequests += 1;
    if (state.totalRequests > config.maxRequestsPerWindow) {
      state.blockedUntil = now + config.blockMs;
      const retryAfterSeconds = formatRetryAfterSeconds(config.blockMs);
      return {
        allowed: false,
        status: 429,
        retryAfterSeconds,
        message: buildRateLimitMessage("NAVAI backend", retryAfterSeconds),
      };
    }

    const budgetKind = resolveBudgetKind(request);
    if (budgetKind === "clientSecret") {
      const elapsedMs = now - state.lastClientSecretAt;
      if (
        state.lastClientSecretAt > 0 &&
        elapsedMs < config.minClientSecretIntervalMs
      ) {
        const retryAfterSeconds = formatRetryAfterSeconds(
          config.minClientSecretIntervalMs - elapsedMs
        );
        return {
          allowed: false,
          status: 429,
          retryAfterSeconds,
          message: `NAVAI voice session requests are too frequent. Wait ${retryAfterSeconds} seconds before retrying.`,
        };
      }

      state.clientSecretRequests += 1;
      state.lastClientSecretAt = now;
      if (state.clientSecretRequests > config.maxClientSecretsPerWindow) {
        state.blockedUntil = now + config.blockMs;
        const retryAfterSeconds = formatRetryAfterSeconds(config.blockMs);
        return {
          allowed: false,
          status: 429,
          retryAfterSeconds,
          message: buildRateLimitMessage("voice session creation", retryAfterSeconds),
        };
      }

      return { allowed: true };
    }

    if (budgetKind === "functionsList") {
      state.functionListRequests += 1;
      if (state.functionListRequests > config.maxFunctionListsPerWindow) {
        state.blockedUntil = now + config.blockMs;
        const retryAfterSeconds = formatRetryAfterSeconds(config.blockMs);
        return {
          allowed: false,
          status: 429,
          retryAfterSeconds,
          message: buildRateLimitMessage("backend function discovery", retryAfterSeconds),
        };
      }

      return { allowed: true };
    }

    if (budgetKind === "functionsExecute") {
      state.functionExecuteRequests += 1;
      if (state.functionExecuteRequests > config.maxFunctionExecutionsPerWindow) {
        state.blockedUntil = now + config.blockMs;
        const retryAfterSeconds = formatRetryAfterSeconds(config.blockMs);
        return {
          allowed: false,
          status: 429,
          retryAfterSeconds,
          message: buildRateLimitMessage("backend function execution", retryAfterSeconds),
        };
      }
    }

    return { allowed: true };
  }

  return (request: Request, response: Response, next: NextFunction) => {
    if (!config.enabled) {
      next();
      return;
    }

    const requestOrigin = request.get("origin")?.trim() ?? "";
    const normalizedOrigin = normalizeOrigin(requestOrigin);
    const browserClientId = readBrowserClientId(request);

    if (
      normalizedOrigin &&
      !allowAnyOrigin &&
      !normalizedAllowedOrigins.has(normalizedOrigin)
    ) {
      rejectRequest(response, {
        allowed: false,
        status: 403,
        message: "Origin not allowed for NAVAI backend usage.",
      });
      return;
    }

    if (!normalizedOrigin && !config.allowMissingOrigin) {
      rejectRequest(response, {
        allowed: false,
        status: 403,
        message: "Requests without Origin are not allowed for NAVAI backend usage.",
      });
      return;
    }

    if (config.requireBrowserClientId && normalizedOrigin && !browserClientId) {
      rejectRequest(response, {
        allowed: false,
        status: 400,
        message: `Missing ${NAVAI_BROWSER_CLIENT_ID_HEADER} header.`,
      });
      return;
    }

    const now = Date.now();
    cleanupExpiredBudgets(now);
    const budgetState = getBudgetState(request, now);
    const decision = evaluateRequest(request, budgetState, now);

    if (!decision.allowed) {
      console.warn("[NAVAI][Security] Request blocked", {
        path: request.originalUrl,
        identity: budgetState.key,
        ip: normalizeRemoteIp(request.ip),
        origin: normalizedOrigin || "none",
        status: decision.status,
        retryAfterSeconds: decision.retryAfterSeconds ?? 0,
        reason: decision.message,
      });
      rejectRequest(response, decision);
      return;
    }

    response.setHeader("X-NAVAI-Security-Window", String(config.windowMs / 1000));
    response.setHeader(
      "X-NAVAI-Identity-Mode",
      budgetState.key.startsWith("cid:") ? "client-id" : "ip"
    );
    next();
  };
}

export { NAVAI_BROWSER_CLIENT_ID_HEADER, NORMALIZED_NAVAI_BROWSER_CLIENT_ID_HEADER };
