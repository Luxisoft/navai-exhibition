const NAVAI_CLIENT_ID_STORAGE_KEY = "navai.browser.client_id";
export const NAVAI_CLIENT_ID_HEADER = "X-NAVAI-Client-Id";
const VALID_NAVAI_CLIENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{7,127}$/i;

function generateFallbackClientId() {
  return `web_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function generateNavaiClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `web_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  return generateFallbackClientId();
}

export function getOrCreateNavaiClientId() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existingValue = window.localStorage.getItem(NAVAI_CLIENT_ID_STORAGE_KEY)?.trim() ?? "";
    if (existingValue && VALID_NAVAI_CLIENT_ID_PATTERN.test(existingValue)) {
      return existingValue;
    }

    const nextValue = generateNavaiClientId();
    window.localStorage.setItem(NAVAI_CLIENT_ID_STORAGE_KEY, nextValue);
    return nextValue;
  } catch {
    return "";
  }
}

export function withNavaiClientHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const clientId = getOrCreateNavaiClientId();

  if (clientId) {
    nextHeaders.set(NAVAI_CLIENT_ID_HEADER, clientId);
  }

  return nextHeaders;
}

export function withNavaiClientRequestInit(init: RequestInit = {}) {
  return {
    ...init,
    headers: withNavaiClientHeaders(init.headers),
  } satisfies RequestInit;
}
