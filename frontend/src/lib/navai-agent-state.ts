export type NavaiSessionStatus = "idle" | "connecting" | "connected" | "error";
export type NavaiAgentVoiceState = "idle" | "speaking";
export type NavaiAgentRuntimeState = "idle" | "connecting" | "connected" | "speaking" | "error";

type ResolveNavaiAgentRuntimeStateInput = {
  status: NavaiSessionStatus;
  agentVoiceState: NavaiAgentVoiceState;
};

type ResolveNavaiAgentRuntimeSnapshotInput = {
  status?: NavaiSessionStatus | null;
  state?: NavaiSessionStatus | null;
  agentVoiceState?: NavaiAgentVoiceState | null;
  isAgentSpeaking?: boolean | null;
};

const NAVAI_SESSION_STATUSES: NavaiSessionStatus[] = ["idle", "connecting", "connected", "error"];
const NAVAI_AGENT_VOICE_STATES: NavaiAgentVoiceState[] = ["idle", "speaking"];

function normalizeNavaiSessionStatus(value: unknown): NavaiSessionStatus {
  if (typeof value === "string" && NAVAI_SESSION_STATUSES.includes(value as NavaiSessionStatus)) {
    return value as NavaiSessionStatus;
  }
  return "idle";
}

function normalizeNavaiAgentVoiceState(value: unknown): NavaiAgentVoiceState {
  if (typeof value === "string" && NAVAI_AGENT_VOICE_STATES.includes(value as NavaiAgentVoiceState)) {
    return value as NavaiAgentVoiceState;
  }
  return "idle";
}

export function resolveNavaiAgentRuntimeState({
  status,
  agentVoiceState,
}: ResolveNavaiAgentRuntimeStateInput): NavaiAgentRuntimeState {
  if (status === "error") {
    return "error";
  }

  if (status === "connecting") {
    return "connecting";
  }

  if (status === "connected" && agentVoiceState === "speaking") {
    return "speaking";
  }

  if (status === "connected" && agentVoiceState === "idle") {
    return "connected";
  }

  return "idle";
}

export function resolveNavaiAgentRuntimeSnapshot(
  input: ResolveNavaiAgentRuntimeSnapshotInput
): {
  status: NavaiSessionStatus;
  agentVoiceState: NavaiAgentVoiceState;
  runtimeState: NavaiAgentRuntimeState;
  isAgentSpeaking: boolean;
} {
  const status = normalizeNavaiSessionStatus(input.status ?? input.state);
  const fallbackVoiceState =
    typeof input.isAgentSpeaking === "boolean" ? (input.isAgentSpeaking ? "speaking" : "idle") : "idle";
  const agentVoiceState =
    input.agentVoiceState == null
      ? fallbackVoiceState
      : normalizeNavaiAgentVoiceState(input.agentVoiceState);
  const runtimeState = resolveNavaiAgentRuntimeState({
    status,
    agentVoiceState,
  });

  return {
    status,
    agentVoiceState,
    runtimeState,
    isAgentSpeaking: runtimeState === "speaking",
  };
}
