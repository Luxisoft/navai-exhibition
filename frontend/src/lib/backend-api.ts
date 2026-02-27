function readEnvApiBaseUrl() {
  const raw =
    typeof import.meta !== "undefined" && typeof import.meta.env.PUBLIC_NAVAI_API_URL === "string"
      ? import.meta.env.PUBLIC_NAVAI_API_URL
      : "";

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.replace(/\/+$/, "") : "";
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

