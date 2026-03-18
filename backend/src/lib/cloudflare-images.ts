type CloudflareImagesJsonPayload = {
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
      return (await response.json()) as CloudflareImagesJsonPayload;
    } catch {
      return { success: false } satisfies CloudflareImagesJsonPayload;
    }
  }

  const text = await response.text().catch(() => "");
  return {
    success: false,
    messages: text ? [text] : [],
  } satisfies CloudflareImagesJsonPayload;
}

function buildCloudflareError(status: number, payload: CloudflareImagesJsonPayload) {
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

async function requestCloudflare(pathname: string, init: RequestInit) {
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

function normalizeVariants(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => normalizeString(entry)).filter(Boolean);
}

export async function createCloudflareImageDirectUpload() {
  const form = new FormData();
  form.set("requireSignedURLs", "false");

  const result = await requestCloudflare("/images/v2/direct_upload", {
    method: "POST",
    body: form,
  });

  return {
    id: normalizeString(result.id),
    uploadURL: normalizeString(result.uploadURL),
  };
}

export async function getCloudflareImageDetails(imageId: string) {
  const normalizedImageId = normalizeString(imageId);
  if (!normalizedImageId) {
    throw new Error("image_id_missing");
  }

  const result = await requestCloudflare(
    `/images/v1/${encodeURIComponent(normalizedImageId)}`,
    {
      method: "GET",
    }
  );

  return {
    id: normalizeString(result.id) || normalizedImageId,
    filename: normalizeString(result.filename),
    uploaded: Boolean(result.uploaded),
    requireSignedURLs: Boolean(result.requireSignedURLs),
    variants: normalizeVariants(result.variants),
  };
}
