function isLocalHostName(hostname: string) {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(hostname);
}

function resolveLocalhostWithoutPort(
  value: string,
  explicitPortPattern: RegExp
) {
  if (!explicitPortPattern.test(value) && typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

function readEnvApiBaseUrl() {
  const raw =
    typeof import.meta !== "undefined" && typeof import.meta.env.PUBLIC_NAVAI_API_URL === "string"
      ? import.meta.env.PUBLIC_NAVAI_API_URL
      : "";

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (isLocalHostName(parsed.hostname) && parsed.port.length === 0) {
        const sameOrigin = resolveLocalhostWithoutPort(
          trimmed,
          /^https?:\/\/[^/]+:\d+/i
        );
        if (sameOrigin) {
          return sameOrigin;
        }
      }
    } catch {
      // keep raw fallback below when URL parsing fails.
    }
    return trimmed.replace(/\/+$/, "");
  }

  if (trimmed.startsWith("//")) {
    const sameOrigin = resolveLocalhostWithoutPort(trimmed, /^\/\/[^/]+:\d+/i);
    if (sameOrigin) {
      return sameOrigin;
    }

    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    return `${protocol}${trimmed}`.replace(/\/+$/, "");
  }

  const localHostMatch =
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::(\d+))?(?:\/.*)?$/i.exec(trimmed);
  if (localHostMatch && !localHostMatch[2]) {
    // Bare localhost values (without explicit port) should stay same-origin in local dev.
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  }

  // Support host values without protocol, e.g. "localhost:3100" or "api.luxisoft.com".
  if (/^[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(trimmed)) {
    const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(?:\/.*)?$/i.test(trimmed);
    const protocolPrefix = isLocalHost ? "http://" : "https://";
    return `${protocolPrefix}${trimmed}`.replace(/\/+$/, "");
  }

  return trimmed.replace(/\/+$/, "");
}

export function getBackendApiBaseUrl() {
  const envBaseUrl = readEnvApiBaseUrl();
  if (envBaseUrl) {
    return envBaseUrl;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export function buildBackendApiUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const baseUrl = getBackendApiBaseUrl();

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
}
