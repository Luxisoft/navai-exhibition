"use client";

export const NAVAI_REFERRAL_STORAGE_KEY = "navai-referral-attribution";

export type StoredNavaiReferralAttribution = {
  code: string;
  capturedAt: string;
  sourceUrl: string;
};

export function normalizeReferralCode(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/[^a-z0-9]/gi, "").toUpperCase()
    : "";
}

export function readStoredReferralAttribution() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(NAVAI_REFERRAL_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as StoredNavaiReferralAttribution;
    const code = normalizeReferralCode(parsed?.code);
    if (!code) {
      return null;
    }

    return {
      code,
      capturedAt: typeof parsed?.capturedAt === "string" ? parsed.capturedAt : "",
      sourceUrl: typeof parsed?.sourceUrl === "string" ? parsed.sourceUrl : "",
    } satisfies StoredNavaiReferralAttribution;
  } catch {
    return null;
  }
}

export function writeStoredReferralAttribution(
  attribution: StoredNavaiReferralAttribution | null
) {
  if (typeof window === "undefined") {
    return;
  }

  if (!attribution) {
    window.localStorage.removeItem(NAVAI_REFERRAL_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(NAVAI_REFERRAL_STORAGE_KEY, JSON.stringify(attribution));
}

export function captureReferralAttributionFromCurrentUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const code =
    normalizeReferralCode(searchParams.get("ref")) ||
    normalizeReferralCode(searchParams.get("referral")) ||
    normalizeReferralCode(searchParams.get("invite"));
  if (!code) {
    return null;
  }

  const nextAttribution = {
    code,
    capturedAt: new Date().toISOString(),
    sourceUrl: window.location.href,
  } satisfies StoredNavaiReferralAttribution;
  writeStoredReferralAttribution(nextAttribution);
  return nextAttribution;
}

export function buildReferralInviteUrl(code: string, baseUrl?: string) {
  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode) {
    return "";
  }

  if (typeof window === "undefined" && !baseUrl) {
    return `/?ref=${encodeURIComponent(normalizedCode)}`;
  }

  const origin = baseUrl || window.location.origin;
  const inviteUrl = new URL("/", origin);
  inviteUrl.searchParams.set("ref", normalizedCode);
  return inviteUrl.toString();
}
