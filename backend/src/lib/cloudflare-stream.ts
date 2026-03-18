type CloudflareStreamDownloadType = "audio" | "default";

type CloudflareJsonPayload = {
  success?: boolean;
  result?: Record<string, unknown>;
  errors?: unknown[];
  messages?: unknown[];
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getCloudflareConfig() {
  const apiToken = normalizeString(process.env.CLOUDFLARE_API_TOKEN);
  const accountId = normalizeString(process.env.CLOUDFLARE_ACCOUNT_ID);
  if (!apiToken || !accountId) {
    throw new Error("cloudflare_not_configured");
  }
  return { apiToken, accountId };
}

async function readCloudflareJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return (await response.json()) as CloudflareJsonPayload;
    } catch {
      return { success: false } satisfies CloudflareJsonPayload;
    }
  }

  const text = await response.text().catch(() => "");
  return {
    success: false,
    messages: text ? [text] : [],
  } satisfies CloudflareJsonPayload;
}

function buildCloudflareError(status: number, payload: CloudflareJsonPayload) {
  const error = new Error("cloudflare_error") as Error & {
    statusCode?: number;
    details?: unknown;
  };
  error.statusCode = 502;
  error.details = {
    cloudflareStatus: status,
    cloudflareErrors: Array.isArray(payload.errors) ? payload.errors : undefined,
    cloudflareMessages: Array.isArray(payload.messages) ? payload.messages : undefined,
  };
  return error;
}

async function requestCloudflare(
  pathname: string,
  init: RequestInit
) {
  const { apiToken, accountId } = getCloudflareConfig();
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}${pathname}`,
    {
      ...init,
      headers: {
        authorization: `Bearer ${apiToken}`,
        ...(init.headers ?? {}),
      },
    }
  );
  const payload = await readCloudflareJson(response);

  if (!response.ok || !payload.success) {
    throw buildCloudflareError(response.status, payload);
  }

  return payload.result ?? {};
}

export async function createCloudflareStreamDirectUpload(maxDurationSeconds = 1800) {
  const result = await requestCloudflare("/stream/direct_upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      maxDurationSeconds: Math.max(60, Math.trunc(maxDurationSeconds)),
    }),
  });

  return {
    uploadURL: normalizeString(result.uploadURL),
    uid: normalizeString(result.uid),
  };
}

export async function createCloudflareStreamDownload(
  uid: string,
  type: CloudflareStreamDownloadType = "default"
) {
  const normalizedUid = normalizeString(uid);
  if (!normalizedUid) {
    throw new Error("stream_uid_missing");
  }

  const result = await requestCloudflare(
    `/stream/${encodeURIComponent(normalizedUid)}/downloads/${type}`,
    { method: "POST" }
  );

  return {
    type,
    status: normalizeString(result.status),
    url: normalizeString(result.url),
    percentComplete:
      typeof result.percentComplete === "number" ? result.percentComplete : 0,
  };
}
