import { getNavaiVoiceBackendOptionsFromEnv } from "@navai/voice-backend";

export const navaiVoiceBackendOptions = getNavaiVoiceBackendOptionsFromEnv(
  process.env as Record<string, string | undefined>
);
