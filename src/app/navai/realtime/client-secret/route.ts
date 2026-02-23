import { createRealtimeClientSecret, type CreateClientSecretRequest } from "@navai/voice-backend";
import { NextResponse } from "next/server";

import { getNavaiVoiceOptionsFromEnv } from "@/lib/navai-backend-runtime";

export const runtime = "nodejs";

function toClientSecretInput(raw: unknown): CreateClientSecretRequest {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const payload = raw as Record<string, unknown>;
  return {
    model: typeof payload.model === "string" ? payload.model : undefined,
    voice: typeof payload.voice === "string" ? payload.voice : undefined,
    instructions: typeof payload.instructions === "string" ? payload.instructions : undefined,
    language: typeof payload.language === "string" ? payload.language : undefined,
    voiceAccent: typeof payload.voiceAccent === "string" ? payload.voiceAccent : undefined,
    voiceTone: typeof payload.voiceTone === "string" ? payload.voiceTone : undefined,
    apiKey: typeof payload.apiKey === "string" ? payload.apiKey : undefined,
  };
}

function getErrorStatus(message: string) {
  if (message.includes("Missing openaiApiKey")) {
    return 400;
  }
  if (message.includes("Passing apiKey from request is disabled")) {
    return 403;
  }
  if (message.includes("Missing API key")) {
    return 400;
  }
  if (message.includes("clientSecretTtlSeconds must be between")) {
    return 400;
  }
  return 500;
}

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json().catch(() => ({}))) as unknown;
    const input = toClientSecretInput(rawBody);
    const secret = await createRealtimeClientSecret(getNavaiVoiceOptionsFromEnv(), input);

    return NextResponse.json({
      value: secret.value,
      expires_at: secret.expires_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear client_secret.";
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }
}
