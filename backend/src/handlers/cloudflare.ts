import type { Request, Response } from "express";
import { z } from "zod";

import { requireActiveFirebaseSession } from "../lib/firebase-id-token";
import {
  createCloudflareImageDirectUpload,
  getCloudflareImageDetails,
} from "../lib/cloudflare-images";
import {
  createCloudflareStreamDirectUpload,
  createCloudflareStreamDownload,
} from "../lib/cloudflare-stream";

const directUploadSchema = z.object({
  maxDurationSeconds: z.number().int().positive().max(60 * 60 * 4).optional(),
});

const downloadSchema = z.object({
  type: z.enum(["default", "audio"]).optional(),
});

function resolveErrorStatus(message: string) {
  if (
    message === "Authentication required." ||
    message === "Invalid Firebase token." ||
    message === "Invalid Firebase token header." ||
    message === "Invalid Firebase token payload." ||
    message === "Invalid Firebase token signature." ||
    message === "Firebase token has an invalid audience." ||
    message === "Firebase token has an invalid subject." ||
    message === "Firebase token has expired." ||
    message === "Firebase token has an invalid issue time." ||
    message === "Firebase token has an invalid auth time." ||
    message === "Firebase signing certificate was not found."
  ) {
    return 401;
  }

  if (message === "This account is inactive.") {
    return 403;
  }

  if (message === "cloudflare_not_configured") {
    return 501;
  }

  if (message === "stream_uid_missing") {
    return 400;
  }

  if (message === "image_id_missing") {
    return 400;
  }

  return 502;
}

export async function postCloudflareImageDirectUploadHandler(
  request: Request,
  response: Response
) {
  try {
    await requireActiveFirebaseSession(request);
    const result = await createCloudflareImageDirectUpload();
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "cloudflare_error";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getCloudflareImageDetailsHandler(
  request: Request,
  response: Response
) {
  try {
    await requireActiveFirebaseSession(request);
    const imageId = typeof request.params.id === "string" ? request.params.id.trim() : "";
    const result = await getCloudflareImageDetails(imageId);
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "cloudflare_error";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postCloudflareStreamDirectUploadHandler(
  request: Request,
  response: Response
) {
  try {
    await requireActiveFirebaseSession(request);
    const parsed = directUploadSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return response.status(400).json({ ok: false, error: "invalid_payload" });
    }

    const result = await createCloudflareStreamDirectUpload(
      parsed.data.maxDurationSeconds ?? 1800
    );
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "cloudflare_error";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postCloudflareStreamDownloadHandler(
  request: Request,
  response: Response
) {
  try {
    await requireActiveFirebaseSession(request);
    const parsed = downloadSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return response.status(400).json({ ok: false, error: "invalid_payload" });
    }

    const uid = typeof request.params.uid === "string" ? request.params.uid.trim() : "";
    const result = await createCloudflareStreamDownload(uid, parsed.data.type ?? "default");
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "cloudflare_error";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}
