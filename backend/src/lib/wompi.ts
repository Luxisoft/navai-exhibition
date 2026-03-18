import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { resolveProjectRoot } from "./project-root";

export const WOMPI_SANDBOX_URL = "https://sandbox.wompi.co/v1";
export const WOMPI_PRODUCTION_URL = "https://production.wompi.co/v1";
export const NAVAI_ENTRY_PRODUCT_KEY = "ENTRY" as const;
export const NAVAI_ENTRY_PRODUCT_NAME = "Entrada NAVAI";
export const NAVAI_ENTRY_CURRENCY = "COP";
export const NAVAI_ENTRY_PRICE_CENTS = 1990000;

export type WompiEnvironment = "sandbox" | "production";

export type WompiTransaction = {
  id: string;
  reference: string;
  amount_in_cents: number;
  currency: string;
  customer_email: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  payment_method?: {
    type?: string;
  };
  payment_link_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type WompiPaymentLink = {
  id: string;
  checkoutUrl: string;
  amountInCents: number;
  currency: string;
  active: boolean;
};

export type WompiPaymentLinkInput = {
  name: string;
  description: string;
  amountInCents: number;
  currency: string;
  singleUse?: boolean;
  collectShipping?: boolean;
  redirectUrl?: string;
  vatAmountInCents?: number;
};

type FrontendWompiEnv = {
  productionCheckoutUrl: string;
  sandboxCheckoutUrl: string;
};

let frontendWompiEnvCache: FrontendWompiEnv | null = null;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readBooleanEnv(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function resolveFrontendWompiEnv() {
  if (frontendWompiEnvCache) {
    return frontendWompiEnvCache;
  }

  const projectRoot = resolveProjectRoot();
  const candidates = [
    path.join(projectRoot, "frontend", ".env"),
    path.join(projectRoot, "frontend", ".env.example"),
  ];

  let productionCheckoutUrl = normalizeString(process.env.PUBLIC_WOMPI_CHECKOUT_URL);
  let sandboxCheckoutUrl = normalizeString(process.env.PUBLIC_WOMPI_TEST_CHECKOUT_URL);

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    const parsed = dotenv.parse(fs.readFileSync(candidate));
    productionCheckoutUrl =
      productionCheckoutUrl || normalizeString(parsed.PUBLIC_WOMPI_CHECKOUT_URL);
    sandboxCheckoutUrl =
      sandboxCheckoutUrl || normalizeString(parsed.PUBLIC_WOMPI_TEST_CHECKOUT_URL);
  }

  frontendWompiEnvCache = {
    productionCheckoutUrl,
    sandboxCheckoutUrl,
  };

  return frontendWompiEnvCache;
}

export function isWompiProduction() {
  return readBooleanEnv(
    process.env.PUBLIC_WOMPI_WOMPI_PRODUCTION ??
      process.env.PUBLIC_WOMPI_PRODUCTION ??
      process.env.WOMPI_PRODUCTION,
    false
  );
}

export function getWompiEnvironment(): WompiEnvironment {
  return isWompiProduction() ? "production" : "sandbox";
}

export function getWompiCheckoutUrl(environment: WompiEnvironment) {
  const env = resolveFrontendWompiEnv();
  return environment === "production"
    ? env.productionCheckoutUrl
    : env.sandboxCheckoutUrl;
}

export function getWompiApiKey(environment: WompiEnvironment) {
  return normalizeString(
    environment === "production"
      ? process.env.PUBLIC_WOMPI_API_KEY ?? process.env.WOMPI_API_KEY
      : process.env.PUBLIC_WOMPI_TEST_API_KEY ?? process.env.WOMPI_TEST_API_KEY
  );
}

export function getWompiEventSecret(environment: WompiEnvironment) {
  return normalizeString(
    environment === "production"
      ? process.env.PUBLIC_WOMPI_EVENT_SECRET ?? process.env.WOMPI_EVENT_SECRET
      : process.env.PUBLIC_WOMPI_TEST_EVENT_SECRET ?? process.env.WOMPI_TEST_EVENT_SECRET
  );
}

export function extractCheckoutLinkCode(checkoutUrl: string) {
  const normalizedUrl = normalizeString(checkoutUrl);
  if (!normalizedUrl) {
    return "";
  }

  try {
    const parsed = new URL(normalizedUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] ?? "" : "";
  } catch {
    return "";
  }
}

function getWompiBaseUrl(environment: WompiEnvironment) {
  return environment === "production"
    ? WOMPI_PRODUCTION_URL
    : WOMPI_SANDBOX_URL;
}

export async function fetchWompiTransaction(
  transactionId: string,
  environment: WompiEnvironment
) {
  const normalizedTransactionId = normalizeString(transactionId);
  if (!normalizedTransactionId) {
    return null;
  }

  const apiKey = getWompiApiKey(environment);
  if (!apiKey) {
    throw new Error("WOMPI API key is not configured.");
  }

  const response = await fetch(
    `${getWompiBaseUrl(environment)}/transactions/${encodeURIComponent(
      normalizedTransactionId
    )}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Wompi transaction lookup failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    data?: WompiTransaction;
  };

  return payload.data ?? null;
}

export async function createWompiPaymentLink(
  input: WompiPaymentLinkInput,
  environment: WompiEnvironment
) {
  const apiKey = getWompiApiKey(environment);
  if (!apiKey) {
    throw new Error("WOMPI API key is not configured.");
  }

  const normalizedName = normalizeString(input.name) || "NAVAI";
  const normalizedDescription = normalizeString(input.description) || normalizedName;
  const amountInCents = Math.max(0, Math.round(Number(input.amountInCents || 0)));
  const normalizedCurrency = normalizeString(input.currency) || NAVAI_ENTRY_CURRENCY;
  const vatAmountInCents = Math.max(
    0,
    Math.round(Number(input.vatAmountInCents || 0))
  );

  const payload: Record<string, unknown> = {
    name: normalizedName,
    description: normalizedDescription,
    single_use: input.singleUse ?? true,
    collect_shipping: input.collectShipping ?? false,
    currency: normalizedCurrency,
    amount_in_cents: amountInCents,
  };
  if (normalizeString(input.redirectUrl)) {
    payload.redirect_url = normalizeString(input.redirectUrl);
  }
  if (vatAmountInCents > 0) {
    payload.taxes = [
      {
        type: "VAT",
        amount_in_cents: vatAmountInCents,
      },
    ];
  }

  const response = await fetch(`${getWompiBaseUrl(environment)}/payment_links`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Wompi payment link creation failed with status ${response.status}.`);
  }

  const responsePayload = (await response.json()) as {
    data?: Record<string, unknown>;
  };
  const data = responsePayload.data ?? {};
  const id = normalizeString(data.id);
  const permalink =
    normalizeString(data.permalink) ||
    normalizeString(data.url) ||
    normalizeString(data.checkout_url);
  const checkoutUrl = permalink || (id ? `https://checkout.wompi.co/l/${id}` : "");
  if (!id || !checkoutUrl) {
    throw new Error("Wompi payment link response is missing id or checkout URL.");
  }

  return {
    id,
    checkoutUrl,
    amountInCents,
    currency: normalizedCurrency,
    active:
      typeof data.active === "boolean"
        ? data.active
        : normalizeString(data.active) !== "false",
  } satisfies WompiPaymentLink;
}

export function validateWompiSignature(
  payload: unknown,
  signature: string | undefined,
  environment: WompiEnvironment
) {
  const eventSecret = getWompiEventSecret(environment);
  if (!eventSecret) {
    return true;
  }

  const normalizedSignature =
    normalizeString(signature) ||
    (payload &&
    typeof payload === "object" &&
    "signature" in payload &&
    payload.signature &&
    typeof payload.signature === "object" &&
    "checksum" in payload.signature
      ? normalizeString(payload.signature.checksum)
      : "");
  if (!normalizedSignature) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", eventSecret)
      .update(JSON.stringify(payload))
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(normalizedSignature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}
