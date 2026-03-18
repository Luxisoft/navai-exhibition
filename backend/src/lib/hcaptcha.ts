import type { Request } from "express";

export type HCaptchaVerificationResult = {
  success: boolean;
  errorCodes: string[];
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getHCaptchaSiteKeyFromEnv() {
  return normalizeString(process.env.PUBLIC_HCAPTCHA_SITE_KEY) ||
    normalizeString(process.env.HCAPTCHA_SITE_KEY);
}

export function getHCaptchaSecretKeyFromEnv() {
  return normalizeString(process.env.HCAPTCHA_SITE_SECRET_KEY);
}

export function resolveRequestClientIp(request: Request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }
  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(",")[0]?.trim() ?? null;
  }
  return request.ip ?? null;
}

export async function verifyHCaptchaToken(
  token: string,
  remoteIp: string | null,
  siteKey = getHCaptchaSiteKeyFromEnv(),
  siteSecret = getHCaptchaSecretKeyFromEnv()
): Promise<HCaptchaVerificationResult> {
  if (!normalizeString(token) || !siteSecret) {
    return { success: false, errorCodes: ["captcha_not_configured"] };
  }

  const formBody = new URLSearchParams();
  formBody.set("secret", siteSecret);
  formBody.set("response", normalizeString(token));
  if (remoteIp) {
    formBody.set("remoteip", remoteIp);
  }
  if (siteKey) {
    formBody.set("sitekey", siteKey);
  }

  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
    cache: "no-store",
  });

  if (!response.ok) {
    return { success: false, errorCodes: ["captcha_service_unavailable"] };
  }

  const data = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
  return {
    success: Boolean(data.success),
    errorCodes: data["error-codes"] ?? [],
  };
}
