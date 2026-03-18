import { NAVAI_FRONTEND_FUNCTION_LOADERS } from "@/ai/frontend-function-loaders";
import { NAVAI_ROUTE_ITEMS } from "@/ai/routes";
import {
  NAVAI_PUBLIC_EXPERIENCE_AGENTS_FOLDERS,
  NAVAI_PUBLIC_EXPERIENCE_ROUTES_FILE,
  NAVAI_PLATFORM_AGENTS_FOLDERS,
  NAVAI_PLATFORM_FUNCTIONS_FOLDERS,
  NAVAI_PLATFORM_ROUTES_FILE,
} from "@/ai/runtime-config";
import { buildBackendApiUrl, getBackendApiBaseUrl } from "@/lib/backend-api";
import type {
  NavaiAgentVoiceState,
  NavaiSessionStatus,
} from "@/lib/navai-agent-state";
import { withNavaiClientRequestInit } from "@/lib/navai-client-identity";
import { navigatePath } from "@/platform/navigation";
import type { LanguageCode } from "@/lib/i18n/messages";

type BuildNavaiAgentType =
  typeof import("@navai/voice-frontend").buildNavaiAgent;
type CreateNavaiBackendClientType =
  typeof import("@navai/voice-frontend").createNavaiBackendClient;
type ResolveNavaiFrontendRuntimeConfigType =
  typeof import("@navai/voice-frontend").resolveNavaiFrontendRuntimeConfig;
type RealtimeSessionType =
  typeof import("@openai/agents/realtime").RealtimeSession;
type OpenAIRealtimeWebRTCType =
  typeof import("@openai/agents/realtime").OpenAIRealtimeWebRTC;

export type VoiceState = NavaiSessionStatus;
export type BackendConnectionState =
  | "idle"
  | "checking"
  | "ready"
  | "offline"
  | "unreachable";
export type ApiKeyValidationState = "idle" | "checking" | "valid" | "invalid";
export type NavaiVoiceSessionContext = {
  agentProfile?: "platform" | "public-experience";
  model?: string;
  voice?: string;
  instructions?: string;
  language?: string;
  voiceAccent?: string;
  voiceTone?: string;
  extraInstructions?: string;
  autoStartResponse?: boolean;
  autoStartMessage?: string;
  captureConversationAudio?: boolean;
  captureConversationVideo?: boolean;
  onConversationTurn?: (turn: NavaiVoiceConversationTurn) => void;
  onConversationSessionStopped?: (
    payload: NavaiVoiceConversationStopPayload,
  ) => void | Promise<void>;
};

export type NavaiVoiceConversationTurn = {
  id: string;
  role: "assistant" | "user";
  transcript: string;
  sourceEventType: string;
  createdAt: string;
};

export type NavaiVoiceConversationStopPayload = {
  turns: NavaiVoiceConversationTurn[];
  startedAt: string;
  endedAt: string;
  audioBlob: Blob | null;
  audioMimeType: string;
  audioDurationMs: number;
  videoBlob: Blob | null;
  videoMimeType: string;
  videoDurationMs: number;
};

type NavaiBackendClientLike = ReturnType<CreateNavaiBackendClientType>;
type RealtimeSessionLike = InstanceType<RealtimeSessionType>;

type VoiceRuntime = {
  buildNavaiAgent: BuildNavaiAgentType;
  createNavaiBackendClient: CreateNavaiBackendClientType;
  resolveNavaiFrontendRuntimeConfig: ResolveNavaiFrontendRuntimeConfigType;
  RealtimeSession: RealtimeSessionType;
  OpenAIRealtimeWebRTC?: OpenAIRealtimeWebRTCType;
};

type PlatformRuntimeConfig = Awaited<
  ReturnType<ResolveNavaiFrontendRuntimeConfigType>
>;
type NavaiSpeechProvider = "openai" | "elevenlabs";
type NavaiResolvedSpeechConfig = {
  provider: NavaiSpeechProvider;
};
type NavaiClientSecretWithSpeech = {
  value: string;
  expires_at?: number;
  speech?: NavaiResolvedSpeechConfig;
};
type NavaiSpeechSynthesisResponse = {
  provider: "elevenlabs";
  mimeType: string;
  audioBase64: string;
};
type RealtimePeerConnectionLike = RTCPeerConnection;

export type NavaiMicMessages = {
  ariaStart: string;
  ariaStop: string;
  connecting: string;
  active: string;
  activeDetail: string;
  stopped: string;
  missingKey: string;
  frontendKeyDisabled: string;
  clientSecretRejected: string;
  genericError: string;
  backendChecking: string;
  backendOffline: string;
  backendUnreachable: string;
  backendOfflineStartBlocked: string;
  backendUnavailableStartBlocked: string;
  teleprompterLines: string[];
};

export type NavaiVoiceSnapshot = {
  apiKey: string;
  isApiKeyValidated: boolean;
  apiKeyValidationState: ApiKeyValidationState;
  backendConnectionState: BackendConnectionState;
  status: NavaiSessionStatus;
  state: VoiceState;
  agentVoiceState: NavaiAgentVoiceState;
  ariaMessage: string;
  statusMessage: string;
  isAgentSpeaking: boolean;
};

type ToggleOptions = {
  apiKey: string;
  micMessages: NavaiMicMessages;
  languageCode?: LanguageCode;
  onNavigate?: (path: string) => void;
};

type NavaiVoiceControllerApi = {
  getNavaiVoiceSnapshot: () => NavaiVoiceSnapshot;
  subscribeNavaiVoiceSnapshot: (
    listener: (snapshot: NavaiVoiceSnapshot) => void,
  ) => () => void;
  subscribeNavaiAgentSpeaking: (
    listener: (isSpeaking: boolean) => void,
  ) => () => void;
  updateNavaiVoiceSnapshot: (patch: Partial<NavaiVoiceSnapshot>) => void;
  resetNavaiVoiceStatusMessages: () => void;
  getNavaiCanStartVoice: () => boolean;
  getNavaiIsConnected: () => boolean;
  getNavaiIsDisabled: () => boolean;
  stopNavaiVoiceSession: (message?: string) => void;
  toggleNavaiVoiceSession: (options: ToggleOptions) => Promise<void>;
  syncNavaiVoiceSessionLanguage: (options: {
    languageCode: LanguageCode;
    onNavigate?: (path: string) => void;
  }) => Promise<void>;
};

const NAVAI_VOICE_CONTROLLER_API_KEY = "__NAVAI_VOICE_CONTROLLER_API__";

type NavaiVoiceControllerGlobalHost = typeof globalThis & {
  [NAVAI_VOICE_CONTROLLER_API_KEY]?: NavaiVoiceControllerApi;
};

const NAVAI_DEBUG_STATE_LOGS = true;

let localControllerApi: NavaiVoiceControllerApi | null = null;

function logNavaiVoiceDebug(
  event: string,
  payload: Record<string, unknown> = {},
) {
  if (typeof window === "undefined" || !NAVAI_DEBUG_STATE_LOGS) {
    return;
  }
  console.log(`[NAVAI][VoiceController] ${event}`, payload);
}

function getControllerApi() {
  const host = globalThis as NavaiVoiceControllerGlobalHost;
  if (localControllerApi) {
    host[NAVAI_VOICE_CONTROLLER_API_KEY] = localControllerApi;
    return host[NAVAI_VOICE_CONTROLLER_API_KEY];
  }

  if (host[NAVAI_VOICE_CONTROLLER_API_KEY]) {
    return host[NAVAI_VOICE_CONTROLLER_API_KEY];
  }

  throw new Error("NAVAI voice controller API is not initialized.");
}

const NAVAI_AGENT_BASE_INSTRUCTIONS_LINES = [
  "You are helping users navigate this NAVAI Exhibition app.",
  "Users are non-technical. Never require users to mention internal tool names.",
  "For navigation, always prefer the navigate_to tool using allowed routes/URLs.",
  "For questions about this project's documentation and implementation screens/URLs/submenus, use:",
  "- list_navai_project_navigation (catalog of routes and submenus)",
  "- describe_navai_project_view (details for one screen/submenu URL)",
  "- explain_navai_page_purpose (what a page or submenu does)",
  "- list_navai_page_purpose_summaries (overview of what pages do)",
  "- search_navai_project_knowledge (search docs/implementation content snippets)",
  "- scroll_page (scroll the current page: up/down, top/bottom, percent, or selector/id)",
  "- scrape_page_text (extract visible text from the current page to answer content questions)",
  "If the user asks naturally about the current page content (for example: summarize this page, what does this page say, what information is here), call scrape_page_text automatically before answering.",
  "Do not ask users to say scrape_page_text or any internal function name.",
  "When useful, answer with the exact URL path or URL hash section in this app.",
  "Only use scroll_page after the user is already on the correct page.",
  "When users ask to complete the request-implementation contact form, collect required fields step by step: full name, work email, and project details.",
  "After each user answer, update the form with the contact tools instead of waiting for all data at once.",
  "Before submit, review the form state and ask for confirmation.",
  "If submit is blocked because captcha is not verified, ask the user to complete captcha and then retry submit.",
];

const NAVAI_LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ru: "Russian",
  ko: "Korean",
  hi: "Hindi",
};

function buildNavaiAgentBaseInstructions(languageCode?: LanguageCode) {
  const resolvedLanguageCode: LanguageCode = languageCode ?? "es";
  const languageLabel = NAVAI_LANGUAGE_LABELS[resolvedLanguageCode];

  return [
    ...NAVAI_AGENT_BASE_INSTRUCTIONS_LINES,
    `Always respond in ${languageLabel}.`,
    "Use that language for both short and detailed replies unless the user explicitly requests another language.",
  ].join("\n");
}

function buildPublicExperienceAgentBaseInstructions(languageCode?: LanguageCode) {
  const resolvedLanguageCode: LanguageCode = languageCode ?? "es";
  const languageLabel = NAVAI_LANGUAGE_LABELS[resolvedLanguageCode];

  return [
    "You are NAVAI Public Experience Agent.",
    "You are dedicated only to public surveys and evaluations.",
    "Do not act like the platform navigation assistant.",
    "Do not navigate pages, do not mention internal tools, and do not explain implementation details.",
    "Use the survey or evaluation context provided in the session instructions.",
    "Use get_public_experience_conversation_state whenever you need to review answered questions, pending questions, or the current question.",
    "Use save_public_experience_answer to persist every accepted user answer before moving to the next question.",
    "Always send the current question id when calling save_public_experience_answer.",
    "Never call save_public_experience_answer more than once for the same user answer.",
    "Ask one pending question at a time and wait for the user's answer before moving on.",
    "If the user asks something unrelated to the current question, answer briefly, then review the conversation state again and continue with the pending flow.",
    "If there are no pending questions, thank the user briefly and confirm completion.",
    `Always respond in ${languageLabel}.`,
    "Use that language for both short and detailed replies unless the user explicitly requests another language.",
  ].join("\n");
}

function buildSessionBaseInstructions(languageCode?: LanguageCode) {
  const baseInstructions =
    sessionContextRef?.agentProfile === "public-experience"
      ? buildPublicExperienceAgentBaseInstructions(languageCode)
      : buildNavaiAgentBaseInstructions(languageCode);
  const extraInstructions = sessionContextRef?.extraInstructions?.trim();
  if (!extraInstructions) {
    return baseInstructions;
  }

  return `${baseInstructions}\n${extraInstructions}`;
}

function buildRealtimeInstructions() {
  const configuredInstructions = sessionContextRef?.instructions?.trim();
  const extraInstructions = sessionContextRef?.extraInstructions?.trim();

  if (configuredInstructions && extraInstructions) {
    return `${configuredInstructions}\n${extraInstructions}`;
  }

  if (configuredInstructions) {
    return configuredInstructions;
  }

  if (extraInstructions) {
    return extraInstructions;
  }

  return undefined;
}

const initialSnapshot: NavaiVoiceSnapshot = {
  apiKey: "",
  isApiKeyValidated: false,
  apiKeyValidationState: "idle",
  backendConnectionState: "idle",
  status: "idle",
  state: "idle",
  agentVoiceState: "idle",
  ariaMessage: "",
  statusMessage: "",
  isAgentSpeaking: false,
};

export function createInitialNavaiVoiceSnapshot(): NavaiVoiceSnapshot {
  return { ...initialSnapshot };
}

let currentSnapshot: NavaiVoiceSnapshot = { ...initialSnapshot };
let voiceRuntimePromise: Promise<VoiceRuntime> | null = null;
let sessionRef: RealtimeSessionLike | null = null;
let backendClientRef: NavaiBackendClientLike | null = null;
let backendFunctionsRef: any[] = [];
let navigateHandlerRef: ((path: string) => void) | null = null;
let activeLanguageCode: LanguageCode = "es";
let speakingState = false;
let modelSpeakingSignal = false;
let playbackSpeakingSignal = false;
let startInFlight: Promise<void> | null = null;
let beforeUnloadBound = false;
let attachedSessionRef: RealtimeSessionLike | null = null;
let detachPlaybackTrackObserverRef: (() => void) | null = null;
let sessionContextRef: NavaiVoiceSessionContext | null = null;
let sessionAudioElementRef: HTMLAudioElement | null = null;
let conversationTurnsRef: NavaiVoiceConversationTurn[] = [];
let conversationSessionStartedAtRef = "";
let recorderStreamRef: MediaStream | null = null;
let recorderMicStreamRef: MediaStream | null = null;
let recorderCameraStreamRef: MediaStream | null = null;
let recorderVideoStreamRef: MediaStream | null = null;
let mediaRecorderRef: MediaRecorder | null = null;
let recorderChunksRef: Blob[] = [];
let recorderMimeTypeRef = "";
let recorderStopPromiseRef: Promise<Blob | null> | null = null;
let recorderStopResolverRef: ((blob: Blob | null) => void) | null = null;
let videoMediaRecorderRef: MediaRecorder | null = null;
let videoRecorderChunksRef: Blob[] = [];
let videoRecorderMimeTypeRef = "";
let videoRecorderStopPromiseRef: Promise<Blob | null> | null = null;
let videoRecorderStopResolverRef: ((blob: Blob | null) => void) | null = null;
let sessionStartNonceRef = 0;
let platformRuntimeConfigPromise: Promise<PlatformRuntimeConfig> | null = null;
let publicExperienceRuntimeConfigPromise: Promise<PlatformRuntimeConfig> | null =
  null;
let hybridSpeechProviderRef: NavaiSpeechProvider = "openai";
let hybridSpeechObjectUrlRef: string | null = null;
let hybridSpeechSynthesisNonceRef = 0;
let hybridSpeechPlaybackNonceRef = 0;

const snapshotListeners = new Set<(snapshot: NavaiVoiceSnapshot) => void>();
const speakingListeners = new Set<(isSpeaking: boolean) => void>();

function getCanStartVoice() {
  return currentSnapshot.backendConnectionState === "ready";
}

function getIsConnected() {
  return currentSnapshot.state === "connected";
}

function emitSnapshot() {
  const snapshot = { ...currentSnapshot };
  for (const listener of snapshotListeners) {
    listener(snapshot);
  }
}

function notifySpeakingListeners() {
  for (const listener of speakingListeners) {
    listener(speakingState);
  }
}

function patchSnapshot(patch: Partial<NavaiVoiceSnapshot>) {
  const normalizedPatch: Partial<NavaiVoiceSnapshot> = { ...patch };

  if (
    typeof normalizedPatch.state === "string" &&
    typeof normalizedPatch.status !== "string"
  ) {
    normalizedPatch.status = normalizedPatch.state;
  } else if (
    typeof normalizedPatch.status === "string" &&
    typeof normalizedPatch.state !== "string"
  ) {
    normalizedPatch.state = normalizedPatch.status;
  }

  if (
    typeof normalizedPatch.isAgentSpeaking === "boolean" &&
    typeof normalizedPatch.agentVoiceState !== "string"
  ) {
    normalizedPatch.agentVoiceState = normalizedPatch.isAgentSpeaking
      ? "speaking"
      : "idle";
  } else if (
    typeof normalizedPatch.agentVoiceState === "string" &&
    typeof normalizedPatch.isAgentSpeaking !== "boolean"
  ) {
    normalizedPatch.isAgentSpeaking =
      normalizedPatch.agentVoiceState === "speaking";
  }

  let changed = false;
  let speakingChanged = false;

  for (const [key, value] of Object.entries(normalizedPatch) as Array<
    [keyof NavaiVoiceSnapshot, NavaiVoiceSnapshot[keyof NavaiVoiceSnapshot]]
  >) {
    if (Object.is(currentSnapshot[key], value)) {
      continue;
    }
    currentSnapshot = {
      ...currentSnapshot,
      [key]: value,
    };
    changed = true;
    if (key === "isAgentSpeaking" || key === "agentVoiceState") {
      speakingChanged = true;
    }
  }

  if (!changed) {
    return;
  }

  if (speakingChanged) {
    speakingState = currentSnapshot.agentVoiceState === "speaking";
  }

  if (
    "state" in normalizedPatch ||
    "status" in normalizedPatch ||
    "agentVoiceState" in normalizedPatch ||
    "isAgentSpeaking" in normalizedPatch
  ) {
    logNavaiVoiceDebug("snapshot_update", {
      changedKeys: Object.keys(normalizedPatch),
      status: currentSnapshot.status,
      state: currentSnapshot.state,
      agentVoiceState: currentSnapshot.agentVoiceState,
      isAgentSpeaking: currentSnapshot.isAgentSpeaking,
    });
  }

  emitSnapshot();
  if (speakingChanged) {
    notifySpeakingListeners();
  }
}

function bindBeforeUnload() {
  if (beforeUnloadBound || typeof window === "undefined") {
    return;
  }

  beforeUnloadBound = true;
  window.addEventListener("beforeunload", () => {
    try {
      sessionRef?.close();
    } catch {
      // ignore close errors while unloading
    }
  });
}

function formatVoiceError(error: unknown, messages: NavaiMicMessages) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("Missing openaiApiKey") ||
    message.includes("Missing API key")
  ) {
    return messages.missingKey;
  }
  if (message.includes("Passing apiKey from request is disabled")) {
    return messages.frontendKeyDisabled;
  }
  if (
    message.includes("OpenAI client_secrets failed") ||
    message.includes("invalid_api_key") ||
    message.includes("Incorrect API key provided")
  ) {
    return messages.clientSecretRejected;
  }

  return message || messages.genericError;
}

function setSpeakingState(isSpeaking: boolean) {
  if (speakingState === isSpeaking) {
    return;
  }
  const previousSpeakingState = speakingState;
  speakingState = isSpeaking;
  patchSnapshot({
    isAgentSpeaking: isSpeaking,
    agentVoiceState: isSpeaking ? "speaking" : "idle",
  });
  logNavaiVoiceDebug("speaking_transition", {
    from: previousSpeakingState ? "speaking" : "idle",
    to: isSpeaking ? "speaking" : "idle",
  });
}

function applySpeakingSignals() {
  const isConnected = currentSnapshot.state === "connected";
  setSpeakingState(
    isConnected && (modelSpeakingSignal || playbackSpeakingSignal),
  );
}

function setModelSpeakingSignal(isSpeaking: boolean, source: string) {
  if (modelSpeakingSignal === isSpeaking) {
    return;
  }

  const previous = modelSpeakingSignal;
  modelSpeakingSignal = isSpeaking;
  logNavaiVoiceDebug("model_speaking_signal", {
    source,
    from: previous ? "speaking" : "idle",
    to: isSpeaking ? "speaking" : "idle",
  });
  applySpeakingSignals();
}

function setPlaybackSpeakingSignal(isSpeaking: boolean, source: string) {
  if (playbackSpeakingSignal === isSpeaking) {
    return;
  }

  const previous = playbackSpeakingSignal;
  playbackSpeakingSignal = isSpeaking;
  logNavaiVoiceDebug("playback_speaking_signal", {
    source,
    from: previous ? "speaking" : "idle",
    to: isSpeaking ? "speaking" : "idle",
  });
  applySpeakingSignals();
}

function clearSpeakingSignals(source: string) {
  modelSpeakingSignal = false;
  playbackSpeakingSignal = false;
  logNavaiVoiceDebug("speaking_signals_cleared", {
    source,
  });
  applySpeakingSignals();
}

function detachPlaybackTrackObserver() {
  detachPlaybackTrackObserverRef?.();
  detachPlaybackTrackObserverRef = null;
}

function emitConversationTurn(turn: NavaiVoiceConversationTurn) {
  conversationTurnsRef = [...conversationTurnsRef, turn];
  try {
    sessionContextRef?.onConversationTurn?.(turn);
  } catch {
    // Conversation observers must never break the voice session.
  }
}

function resetConversationCaptureState() {
  conversationTurnsRef = [];
  conversationSessionStartedAtRef = "";
  recorderChunksRef = [];
  recorderMimeTypeRef = "";
  recorderStopPromiseRef = null;
  recorderStopResolverRef = null;
  mediaRecorderRef = null;
  videoRecorderChunksRef = [];
  videoRecorderMimeTypeRef = "";
  videoRecorderStopPromiseRef = null;
  videoRecorderStopResolverRef = null;
  videoMediaRecorderRef = null;

  if (recorderStreamRef) {
    for (const track of recorderStreamRef.getTracks()) {
      track.stop();
    }
  }
  recorderStreamRef = null;

  if (recorderMicStreamRef) {
    for (const track of recorderMicStreamRef.getTracks()) {
      track.stop();
    }
  }
  recorderMicStreamRef = null;

  if (recorderCameraStreamRef) {
    for (const track of recorderCameraStreamRef.getTracks()) {
      track.stop();
    }
  }
  recorderCameraStreamRef = null;

  if (recorderVideoStreamRef) {
    for (const track of recorderVideoStreamRef.getTracks()) {
      track.stop();
    }
  }
  recorderVideoStreamRef = null;
}

function usesHybridSpeech() {
  return hybridSpeechProviderRef === "elevenlabs";
}

function resolveSpeechProvider(value: unknown): NavaiSpeechProvider {
  if (
    value &&
    typeof value === "object" &&
    (value as { provider?: unknown }).provider === "elevenlabs"
  ) {
    return "elevenlabs";
  }

  return "openai";
}

function revokeHybridSpeechObjectUrl() {
  if (
    hybridSpeechObjectUrlRef &&
    typeof URL !== "undefined" &&
    typeof URL.revokeObjectURL === "function"
  ) {
    URL.revokeObjectURL(hybridSpeechObjectUrlRef);
  }
  hybridSpeechObjectUrlRef = null;
}

function clearHybridSpeechPlayback() {
  hybridSpeechSynthesisNonceRef += 1;
  hybridSpeechPlaybackNonceRef += 1;

  const audioElement = sessionAudioElementRef;
  if (audioElement) {
    try {
      audioElement.pause();
    } catch {
      // Ignore pause failures while clearing playback.
    }

    if (audioElement.src) {
      audioElement.removeAttribute("src");
      audioElement.load();
    }
  }

  revokeHybridSpeechObjectUrl();
}

async function readBackendErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.clone().json()) as { error?: unknown } | null;
    if (payload && typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
  } catch {
    // Fall through to text response parsing.
  }

  try {
    const text = (await response.text()).trim();
    if (text) {
      return text;
    }
  } catch {
    // Ignore body parsing failures.
  }

  return fallback;
}

async function requestRealtimeClientSecret(
  input: Record<string, unknown>,
): Promise<NavaiClientSecretWithSpeech> {
  const response = await fetch(
    buildBackendApiUrl("/navai/realtime/client-secret"),
    withNavaiClientRequestInit({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
  );

  if (!response.ok) {
    throw new Error(
      await readBackendErrorMessage(
        response,
        "No se pudo crear client_secret.",
      ),
    );
  }

  const payload = (await response.json()) as Partial<NavaiClientSecretWithSpeech> | null;
  if (!payload || typeof payload.value !== "string" || payload.value.trim().length === 0) {
    throw new Error("Client secret response is missing value.");
  }

  return {
    value: payload.value,
    expires_at:
      typeof payload.expires_at === "number" ? payload.expires_at : undefined,
    speech: {
      provider: resolveSpeechProvider(payload.speech),
    },
  };
}

async function requestSpeechSynthesis(
  text: string,
): Promise<NavaiSpeechSynthesisResponse> {
  const response = await fetch(
    buildBackendApiUrl("/navai/speech/synthesize"),
    withNavaiClientRequestInit({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    }),
  );

  if (!response.ok) {
    throw new Error(
      await readBackendErrorMessage(
        response,
        "No se pudo sintetizar la voz.",
      ),
    );
  }

  const payload = (await response.json()) as Partial<NavaiSpeechSynthesisResponse> | null;
  if (
    !payload ||
    payload.provider !== "elevenlabs" ||
    typeof payload.audioBase64 !== "string" ||
    payload.audioBase64.trim().length === 0
  ) {
    throw new Error("Speech synthesis response is invalid.");
  }

  return {
    provider: "elevenlabs",
    mimeType:
      typeof payload.mimeType === "string" && payload.mimeType.trim().length > 0
        ? payload.mimeType
        : "audio/mpeg",
    audioBase64: payload.audioBase64,
  };
}

function decodeAudioBase64(audioBase64: string, mimeType: string) {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

async function playHybridSpeech(text: string) {
  if (!usesHybridSpeech()) {
    return;
  }

  const trimmedText = text.trim();
  const audioElement = sessionAudioElementRef;
  if (!audioElement || trimmedText.length === 0) {
    return;
  }

  const synthesisNonce = ++hybridSpeechSynthesisNonceRef;
  logNavaiVoiceDebug("hybrid_speech_synthesize_start", {
    textLength: trimmedText.length,
  });

  try {
    const payload = await requestSpeechSynthesis(trimmedText);
    if (
      synthesisNonce !== hybridSpeechSynthesisNonceRef ||
      !usesHybridSpeech() ||
      sessionAudioElementRef !== audioElement
    ) {
      return;
    }

    const playbackNonce = ++hybridSpeechPlaybackNonceRef;
    const objectUrl = URL.createObjectURL(
      decodeAudioBase64(payload.audioBase64, payload.mimeType),
    );

    try {
      audioElement.pause();
    } catch {
      // Ignore pause failures while replacing playback.
    }

    revokeHybridSpeechObjectUrl();

    if ("srcObject" in audioElement && audioElement.srcObject) {
      audioElement.srcObject = null;
    }

    if (audioElement.src) {
      audioElement.removeAttribute("src");
    }

    hybridSpeechObjectUrlRef = objectUrl;

    const cleanupPlaybackListeners = () => {
      audioElement.removeEventListener("playing", handlePlaying);
      audioElement.removeEventListener("ended", handleEnded);
      audioElement.removeEventListener("pause", handlePause);
      audioElement.removeEventListener("error", handleError);
    };

    const finalizePlayback = (source: string) => {
      cleanupPlaybackListeners();

      if (playbackNonce === hybridSpeechPlaybackNonceRef) {
        setPlaybackSpeakingSignal(false, source);
      }

      if (hybridSpeechObjectUrlRef === objectUrl) {
        revokeHybridSpeechObjectUrl();
      }
    };

    const handlePlaying = () => {
      if (playbackNonce !== hybridSpeechPlaybackNonceRef) {
        return;
      }
      setPlaybackSpeakingSignal(true, "hybrid_speech_playing");
    };

    const handleEnded = () => {
      finalizePlayback("hybrid_speech_ended");
    };

    const handlePause = () => {
      if (audioElement.ended) {
        return;
      }
      finalizePlayback("hybrid_speech_paused");
    };

    const handleError = () => {
      finalizePlayback("hybrid_speech_error");
    };

    audioElement.addEventListener("playing", handlePlaying);
    audioElement.addEventListener("ended", handleEnded);
    audioElement.addEventListener("pause", handlePause);
    audioElement.addEventListener("error", handleError);

    audioElement.src = objectUrl;
    audioElement.load();
    await audioElement.play();
    handlePlaying();

    logNavaiVoiceDebug("hybrid_speech_playback_started", {
      textLength: trimmedText.length,
      mimeType: payload.mimeType,
    });
  } catch (error) {
    if (synthesisNonce !== hybridSpeechSynthesisNonceRef) {
      return;
    }

    setPlaybackSpeakingSignal(false, "hybrid_speech_failed");
    logNavaiVoiceDebug("hybrid_speech_error", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function configureHybridPeerConnection(
  peerConnection: RealtimePeerConnectionLike,
) {
  peerConnection.ontrack = (event) => {
    logNavaiVoiceDebug("hybrid_remote_audio_ignored", {
      streamCount: event.streams.length,
      audioTrackCount: event.streams.reduce(
        (count, stream) => count + stream.getAudioTracks().length,
        0,
      ),
    });
  };

  return peerConnection;
}

function resolvePreferredVideoRecorderMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=h264,opus",
    "video/webm",
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "";
}

async function startConversationRecorder(audioElement: HTMLAudioElement) {
  if (
    typeof window === "undefined" ||
    typeof MediaRecorder === "undefined" ||
    !sessionContextRef?.captureConversationAudio
  ) {
    return;
  }

  const audioCaptureElement = audioElement as HTMLAudioElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  const captureStream =
    typeof audioCaptureElement.captureStream === "function"
      ? audioCaptureElement.captureStream.bind(audioCaptureElement)
      : typeof audioCaptureElement.mozCaptureStream === "function"
        ? audioCaptureElement.mozCaptureStream.bind(audioCaptureElement)
        : null;

  if (!captureStream || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return;
  }

  try {
    const mixedDestinationContext = new AudioContext();
    const destination = mixedDestinationContext.createMediaStreamDestination();
    const playbackStream = captureStream();
    recorderMicStreamRef = await navigator.mediaDevices.getUserMedia({ audio: true });

    if (playbackStream.getAudioTracks().length > 0) {
      const playbackSource = mixedDestinationContext.createMediaStreamSource(playbackStream);
      playbackSource.connect(destination);
    }

    if (recorderMicStreamRef.getAudioTracks().length > 0) {
      const micSource = mixedDestinationContext.createMediaStreamSource(recorderMicStreamRef);
      micSource.connect(destination);
    }

    recorderStreamRef = destination.stream;
    const preferredMimeType =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

    mediaRecorderRef = preferredMimeType
      ? new MediaRecorder(destination.stream, { mimeType: preferredMimeType })
      : new MediaRecorder(destination.stream);
    recorderMimeTypeRef = mediaRecorderRef.mimeType || preferredMimeType || "audio/webm";
    recorderChunksRef = [];
    recorderStopPromiseRef = new Promise<Blob | null>((resolve) => {
      recorderStopResolverRef = resolve;
    });

    mediaRecorderRef.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        recorderChunksRef.push(event.data);
      }
    });
    mediaRecorderRef.addEventListener("stop", () => {
      const recordedBlob =
        recorderChunksRef.length > 0
          ? new Blob(recorderChunksRef, {
              type: recorderMimeTypeRef || "audio/webm",
            })
          : null;
      recorderStopResolverRef?.(recordedBlob);
    });
    mediaRecorderRef.start(1000);

    if (sessionContextRef?.captureConversationVideo) {
      recorderCameraStreamRef = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
      });
      recorderVideoStreamRef = new MediaStream([
        ...destination.stream.getAudioTracks(),
        ...recorderCameraStreamRef.getVideoTracks(),
      ]);

      const preferredVideoMimeType = resolvePreferredVideoRecorderMimeType();
      videoMediaRecorderRef = preferredVideoMimeType
        ? new MediaRecorder(recorderVideoStreamRef, { mimeType: preferredVideoMimeType })
        : new MediaRecorder(recorderVideoStreamRef);
      videoRecorderMimeTypeRef =
        videoMediaRecorderRef.mimeType || preferredVideoMimeType || "video/webm";
      videoRecorderChunksRef = [];
      videoRecorderStopPromiseRef = new Promise<Blob | null>((resolve) => {
        videoRecorderStopResolverRef = resolve;
      });

      videoMediaRecorderRef.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          videoRecorderChunksRef.push(event.data);
        }
      });
      videoMediaRecorderRef.addEventListener("stop", () => {
        const recordedBlob =
          videoRecorderChunksRef.length > 0
            ? new Blob(videoRecorderChunksRef, {
                type: videoRecorderMimeTypeRef || "video/webm",
              })
            : null;
        videoRecorderStopResolverRef?.(recordedBlob);
      });
      videoMediaRecorderRef.start(1000);
    }
  } catch {
    resetConversationCaptureState();
  }
}

async function stopConversationRecorder() {
  if (!mediaRecorderRef && !videoMediaRecorderRef) {
    return {
      audioBlob: null,
      videoBlob: null,
    };
  }

  const activeRecorder = mediaRecorderRef;
  const stopPromise = recorderStopPromiseRef;
  if (activeRecorder && activeRecorder.state !== "inactive") {
    activeRecorder.stop();
  }

  const activeVideoRecorder = videoMediaRecorderRef;
  const videoStopPromise = videoRecorderStopPromiseRef;
  if (activeVideoRecorder && activeVideoRecorder.state !== "inactive") {
    activeVideoRecorder.stop();
  }

  const [recordedBlob, recordedVideoBlob] = await Promise.all([
    stopPromise ?? Promise.resolve(null),
    videoStopPromise ?? Promise.resolve(null),
  ]);
  mediaRecorderRef = null;
  videoMediaRecorderRef = null;

  if (recorderStreamRef) {
    for (const track of recorderStreamRef.getTracks()) {
      track.stop();
    }
  }
  recorderStreamRef = null;

  if (recorderMicStreamRef) {
    for (const track of recorderMicStreamRef.getTracks()) {
      track.stop();
    }
  }
  recorderMicStreamRef = null;

  if (recorderCameraStreamRef) {
    for (const track of recorderCameraStreamRef.getTracks()) {
      track.stop();
    }
  }
  recorderCameraStreamRef = null;

  if (recorderVideoStreamRef) {
    for (const track of recorderVideoStreamRef.getTracks()) {
      track.stop();
    }
  }
  recorderVideoStreamRef = null;

  return {
    audioBlob: recordedBlob,
    videoBlob: recordedVideoBlob,
  };
}

function attachPlaybackTrackObserver(audioElement: HTMLAudioElement) {
  if (typeof window === "undefined") {
    return;
  }

  detachPlaybackTrackObserver();

  let currentTrack: MediaStreamTrack | null = null;

  const onTrackUnmute = () => {
    logNavaiVoiceDebug("track_unmute");
  };
  const onTrackMute = () => {
    logNavaiVoiceDebug("track_mute");
  };
  const onTrackEnded = () => {
    logNavaiVoiceDebug("track_ended");
  };

  const detachTrackListeners = () => {
    if (!currentTrack) {
      return;
    }
    currentTrack.removeEventListener("unmute", onTrackUnmute);
    currentTrack.removeEventListener("mute", onTrackMute);
    currentTrack.removeEventListener("ended", onTrackEnded);
    currentTrack = null;
  };

  const attachTrackListeners = (track: MediaStreamTrack) => {
    track.addEventListener("unmute", onTrackUnmute);
    track.addEventListener("mute", onTrackMute);
    track.addEventListener("ended", onTrackEnded);
    currentTrack = track;
    logNavaiVoiceDebug("track_attached", {
      muted: track.muted,
      readyState: track.readyState,
    });
  };

  const syncTrack = () => {
    const srcObject = audioElement.srcObject;
    const stream = srcObject instanceof MediaStream ? srcObject : null;
    const nextTrack = stream?.getAudioTracks()[0] ?? null;

    if (nextTrack === currentTrack) {
      return;
    }

    detachTrackListeners();

    if (!nextTrack) {
      return;
    }

    attachTrackListeners(nextTrack);
  };

  const pollId = window.setInterval(syncTrack, 120);
  syncTrack();

  detachPlaybackTrackObserverRef = () => {
    window.clearInterval(pollId);
    detachTrackListeners();
  };
}

function detachSessionAudioListeners() {
  if (!attachedSessionRef?.off) {
    attachedSessionRef = null;
    return;
  }

  attachedSessionRef.off("agent_end", handleSessionAgentEnd);
  attachedSessionRef.off("audio_start", handleSessionAudioStart);
  attachedSessionRef.off("audio", handleSessionAudioChunk);
  attachedSessionRef.off("audio_stopped", handleSessionAudioStopped);
  attachedSessionRef.off("audio_interrupted", handleSessionAudioInterrupted);
  attachedSessionRef.off("transport_event", handleSessionTransportEvent);
  attachedSessionRef.off("error", handleSessionError);
  attachedSessionRef = null;
}

function attachSessionAudioListeners(session: RealtimeSessionLike) {
  detachSessionAudioListeners();
  session.on("agent_end", handleSessionAgentEnd);
  session.on("audio_start", handleSessionAudioStart);
  session.on("audio", handleSessionAudioChunk);
  session.on("audio_stopped", handleSessionAudioStopped);
  session.on("audio_interrupted", handleSessionAudioInterrupted);
  session.on("transport_event", handleSessionTransportEvent);
  session.on("error", handleSessionError);
  attachedSessionRef = session;
  logNavaiVoiceDebug("session_audio_listeners_attached");
}

function handleSessionAudioStart() {
  logNavaiVoiceDebug("event_audio_start");
  setModelSpeakingSignal(true, "audio_start");
}

function handleSessionAudioChunk() {
  setModelSpeakingSignal(true, "audio_chunk");
}

function handleSessionAudioStopped() {
  logNavaiVoiceDebug("event_audio_stopped");
}

function handleSessionAudioInterrupted() {
  logNavaiVoiceDebug("event_audio_interrupted");
  setModelSpeakingSignal(false, "audio_interrupted");
}

function handleSessionError() {
  logNavaiVoiceDebug("event_error");
  setModelSpeakingSignal(false, "error");
}

function handleSessionAgentEnd(
  _context: unknown,
  _agent: unknown,
  output: unknown,
) {
  if (!usesHybridSpeech() || typeof output !== "string") {
    return;
  }

  const transcript = output.trim();
  if (transcript.length === 0) {
    return;
  }

  emitConversationTurn({
    id: `assistant-${Date.now()}`,
    role: "assistant",
    transcript,
    sourceEventType: "agent_end",
    createdAt: new Date().toISOString(),
  });

  void playHybridSpeech(transcript);
}

function handleSessionTransportEvent(event: unknown) {
  if (!event || typeof event !== "object" || !("type" in event)) {
    return;
  }

  const eventType = String((event as { type?: unknown }).type ?? "");
  if (eventType.length === 0) {
    return;
  }

  if (
    eventType === "conversation.item.input_audio_transcription.completed" &&
    typeof (event as { transcript?: unknown }).transcript === "string"
  ) {
    emitConversationTurn({
      id: String((event as { item_id?: unknown }).item_id ?? `user-${Date.now()}`),
      role: "user",
      transcript: String((event as { transcript?: unknown }).transcript ?? ""),
      sourceEventType: eventType,
      createdAt: new Date().toISOString(),
    });
  } else if (
    eventType === "response.output_audio_transcript.done" &&
    typeof (event as { transcript?: unknown }).transcript === "string"
  ) {
    emitConversationTurn({
      id: String(
        (event as { item_id?: unknown; response_id?: unknown }).item_id ??
          (event as { response_id?: unknown }).response_id ??
          `assistant-${Date.now()}`,
      ),
      role: "assistant",
      transcript: String((event as { transcript?: unknown }).transcript ?? ""),
      sourceEventType: eventType,
      createdAt: new Date().toISOString(),
    });
  }

  const modelSpeakingStartEvent =
    eventType === "response.output_audio.delta" ||
    eventType === "response.output_audio_transcript.delta" ||
    eventType === "response.output_text.delta";
  const modelSpeakingStopEvent =
    eventType === "response.output_audio_transcript.done" ||
    eventType === "response.output_text.done";
  const playbackSpeakingStartEvent =
    eventType === "output_audio_buffer.started";
  const playbackSpeakingStopEvent =
    eventType === "output_audio_buffer.stopped" ||
    eventType === "output_audio_buffer.cleared";

  if (
    !modelSpeakingStartEvent &&
    !modelSpeakingStopEvent &&
    !playbackSpeakingStartEvent &&
    !playbackSpeakingStopEvent
  ) {
    return;
  }

  logNavaiVoiceDebug("transport_event", {
    type: eventType,
  });

  if (modelSpeakingStartEvent) {
    setModelSpeakingSignal(true, eventType);
    return;
  }

  if (modelSpeakingStopEvent) {
    setModelSpeakingSignal(false, eventType);
    return;
  }

  if (playbackSpeakingStartEvent) {
    setPlaybackSpeakingSignal(true, eventType);
    return;
  }

  setPlaybackSpeakingSignal(false, eventType);
}

function stopSession(message?: string) {
  sessionStartNonceRef += 1;
  logNavaiVoiceDebug("stop_session", {
    hasMessage: Boolean(message),
  });
  const stoppedTurns = [...conversationTurnsRef];
  const startedAt = conversationSessionStartedAtRef;
  const endedAt = new Date().toISOString();
  detachSessionAudioListeners();
  detachPlaybackTrackObserver();
  clearHybridSpeechPlayback();
  sessionAudioElementRef = null;
  hybridSpeechProviderRef = "openai";
  try {
    sessionRef?.close();
  } catch {
    // close failures are non-fatal
  } finally {
    sessionRef = null;
    backendClientRef = null;
    backendFunctionsRef = [];
    navigateHandlerRef = null;
    clearSpeakingSignals("stop_session");
    patchSnapshot({
      state: "idle",
      ...(message
        ? {
            ariaMessage: message,
            statusMessage: message,
          }
        : {}),
    });
  }

  void stopConversationRecorder()
    .catch(() => null)
    .then((recording) =>
      sessionContextRef?.onConversationSessionStopped?.({
        turns: stoppedTurns,
        startedAt,
        endedAt,
        audioBlob: recording?.audioBlob ?? null,
        audioMimeType:
          recorderMimeTypeRef || recording?.audioBlob?.type || "audio/webm",
        audioDurationMs:
          startedAt && endedAt
            ? Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime())
            : 0,
        videoBlob: recording?.videoBlob ?? null,
        videoMimeType:
          videoRecorderMimeTypeRef || recording?.videoBlob?.type || "video/webm",
        videoDurationMs:
          startedAt && endedAt
            ? Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime())
            : 0,
      }),
    )
    .finally(() => {
      resetConversationCaptureState();
    });
}

async function loadVoiceRuntime(): Promise<VoiceRuntime> {
  if (!voiceRuntimePromise) {
    voiceRuntimePromise = Promise.all([
      import("@navai/voice-frontend"),
      import("@openai/agents/realtime"),
    ]).then(([voiceFrontendModule, realtimeModule]) => ({
      buildNavaiAgent: voiceFrontendModule.buildNavaiAgent,
      createNavaiBackendClient: voiceFrontendModule.createNavaiBackendClient,
      resolveNavaiFrontendRuntimeConfig:
        voiceFrontendModule.resolveNavaiFrontendRuntimeConfig,
      RealtimeSession: realtimeModule.RealtimeSession,
      OpenAIRealtimeWebRTC: realtimeModule.OpenAIRealtimeWebRTC,
    }));
  }

  return voiceRuntimePromise!;
}

async function resolvePlatformRuntimeConfig(
  voiceRuntime: VoiceRuntime,
): Promise<PlatformRuntimeConfig> {
  if (!platformRuntimeConfigPromise) {
    platformRuntimeConfigPromise = voiceRuntime
      .resolveNavaiFrontendRuntimeConfig({
        moduleLoaders: NAVAI_FRONTEND_FUNCTION_LOADERS,
        defaultRoutes: NAVAI_ROUTE_ITEMS,
        routesFile: NAVAI_PLATFORM_ROUTES_FILE,
        functionsFolders: NAVAI_PLATFORM_FUNCTIONS_FOLDERS,
        agentsFolders: NAVAI_PLATFORM_AGENTS_FOLDERS,
        defaultRoutesFile: NAVAI_PLATFORM_ROUTES_FILE,
        defaultFunctionsFolder: NAVAI_PLATFORM_FUNCTIONS_FOLDERS,
      })
      .catch((error) => {
        platformRuntimeConfigPromise = null;
        throw error;
      });
  }

  return platformRuntimeConfigPromise;
}

async function resolvePublicExperienceRuntimeConfig(
  voiceRuntime: VoiceRuntime,
): Promise<PlatformRuntimeConfig> {
  if (!publicExperienceRuntimeConfigPromise) {
    publicExperienceRuntimeConfigPromise = voiceRuntime
      .resolveNavaiFrontendRuntimeConfig({
        moduleLoaders: NAVAI_FRONTEND_FUNCTION_LOADERS,
        defaultRoutes: [],
        routesFile: NAVAI_PUBLIC_EXPERIENCE_ROUTES_FILE,
        functionsFolders: NAVAI_PLATFORM_FUNCTIONS_FOLDERS,
        agentsFolders: NAVAI_PUBLIC_EXPERIENCE_AGENTS_FOLDERS,
        defaultRoutesFile: NAVAI_PUBLIC_EXPERIENCE_ROUTES_FILE,
        defaultFunctionsFolder: NAVAI_PLATFORM_FUNCTIONS_FOLDERS,
      })
      .catch((error) => {
        publicExperienceRuntimeConfigPromise = null;
        throw error;
      });
  }

  return publicExperienceRuntimeConfigPromise;
}

async function startSession(options: ToggleOptions) {
  if (typeof window === "undefined") {
    return;
  }
  if (!getCanStartVoice()) {
    return;
  }
  const sessionStartNonce = ++sessionStartNonceRef;

  bindBeforeUnload();
  logNavaiVoiceDebug("start_session", {
    backendConnectionState: currentSnapshot.backendConnectionState,
  });
  patchSnapshot({
    state: "connecting",
    ariaMessage: options.micMessages.connecting,
    statusMessage: options.micMessages.connecting,
  });

  const voiceRuntime = await loadVoiceRuntime();
  const backendApiBaseUrl = getBackendApiBaseUrl();
  const backendClient = voiceRuntime.createNavaiBackendClient({
    apiBaseUrl: backendApiBaseUrl,
    fetchImpl: (input, init) => fetch(input, withNavaiClientRequestInit(init)),
  });
  backendClientRef = backendClient;
  navigateHandlerRef =
    options.onNavigate ?? ((path) => void navigatePath(path));
  activeLanguageCode = options.languageCode ?? activeLanguageCode;

  try {
    clearSpeakingSignals("start_session");
    clearHybridSpeechPlayback();
    hybridSpeechProviderRef = "openai";
    conversationTurnsRef = [];
    conversationSessionStartedAtRef = new Date().toISOString();

    const trimmedKey = options.apiKey.trim();
    const realtimeInstructions = buildRealtimeInstructions();
    const secret = await requestRealtimeClientSecret({
      ...(trimmedKey.length > 0 ? { apiKey: trimmedKey } : {}),
      ...(sessionContextRef?.model ? { model: sessionContextRef.model } : {}),
      ...(sessionContextRef?.voice ? { voice: sessionContextRef.voice } : {}),
      ...(realtimeInstructions ? { instructions: realtimeInstructions } : {}),
      ...(sessionContextRef?.language ? { language: sessionContextRef.language } : {}),
      ...(sessionContextRef?.voiceAccent ? { voiceAccent: sessionContextRef.voiceAccent } : {}),
      ...(sessionContextRef?.voiceTone ? { voiceTone: sessionContextRef.voiceTone } : {}),
    });
    hybridSpeechProviderRef = secret.speech?.provider ?? "openai";
    logNavaiVoiceDebug("client_secret_created", {
      speechProvider: hybridSpeechProviderRef,
    });
    patchSnapshot({
      isApiKeyValidated: true,
      apiKeyValidationState: "valid",
    });

    const backendFunctions = await backendClient.listFunctions();
    const isPublicExperienceAgent =
      sessionContextRef?.agentProfile === "public-experience";
    const sessionRuntimeCatalog = isPublicExperienceAgent
      ? await resolvePublicExperienceRuntimeConfig(voiceRuntime)
      : await resolvePlatformRuntimeConfig(voiceRuntime);
    backendFunctionsRef = isPublicExperienceAgent ? [] : backendFunctions.functions;
    const { agent, warnings } = await voiceRuntime.buildNavaiAgent({
      navigate: (path) => {
        if (navigateHandlerRef) {
          navigateHandlerRef(path);
          return;
        }
        void navigatePath(path);
      },
      routes: sessionRuntimeCatalog.routes,
      functionModuleLoaders: sessionRuntimeCatalog.functionModuleLoaders,
      agents: sessionRuntimeCatalog.agents,
      primaryAgentKey: sessionRuntimeCatalog.primaryAgentKey,
      baseInstructions: buildSessionBaseInstructions(options.languageCode),
      backendFunctions: isPublicExperienceAgent ? [] : backendFunctions.functions,
      executeBackendFunction: backendClient.executeFunction,
    });

    for (const warning of [
      ...sessionRuntimeCatalog.warnings,
      ...backendFunctions.warnings,
      ...warnings,
    ]) {
      if (warning.trim().length > 0) {
        console.warn(warning);
      }
    }

    const sessionAudioElement = document.createElement("audio");
    sessionAudioElement.autoplay = true;
    sessionAudioElement.setAttribute("playsinline", "true");
    sessionAudioElementRef = sessionAudioElement;
    attachPlaybackTrackObserver(sessionAudioElement);
    await startConversationRecorder(sessionAudioElement);

    const realtimeAudioElement = usesHybridSpeech()
      ? (() => {
          const mutedAudioElement = document.createElement("audio");
          mutedAudioElement.autoplay = true;
          mutedAudioElement.muted = true;
          mutedAudioElement.volume = 0;
          mutedAudioElement.setAttribute("playsinline", "true");
          return mutedAudioElement;
        })()
      : sessionAudioElement;

    const transport =
      typeof voiceRuntime.OpenAIRealtimeWebRTC === "function"
        ? new voiceRuntime.OpenAIRealtimeWebRTC({
            audioElement: realtimeAudioElement,
            ...(usesHybridSpeech()
              ? {
                  changePeerConnection: configureHybridPeerConnection,
                }
              : {}),
          })
        : null;
    const realtimeSession = transport
      ? new voiceRuntime.RealtimeSession(agent, { transport })
      : new voiceRuntime.RealtimeSession(agent);
    attachSessionAudioListeners(realtimeSession);
    sessionRef = realtimeSession;

    await realtimeSession.connect({ apiKey: secret.value });

    if (sessionRef !== realtimeSession || sessionStartNonce !== sessionStartNonceRef) {
      try {
        realtimeSession.close();
      } catch {
        // ignore cleanup errors after a cancelled start
      }
      return;
    }

    if (sessionContextRef?.autoStartMessage?.trim()) {
      realtimeSession.sendMessage(sessionContextRef.autoStartMessage.trim());
    } else if (sessionContextRef?.autoStartResponse) {
      realtimeSession.transport.sendEvent({
        type: "response.create",
      });
    }

    logNavaiVoiceDebug("session_connected");
    patchSnapshot({
      state: "connected",
      ariaMessage: options.micMessages.active,
      statusMessage: options.micMessages.activeDetail,
    });
  } catch (error) {
    patchSnapshot({ isApiKeyValidated: false });
    const message = formatVoiceError(error, options.micMessages);
    logNavaiVoiceDebug("session_error", {
      message,
    });
    detachSessionAudioListeners();
    detachPlaybackTrackObserver();
    stopSession();
    patchSnapshot({
      state: "error",
      ariaMessage: message,
      statusMessage: message,
    });
    window.setTimeout(() => {
      if (currentSnapshot.state === "error") {
        patchSnapshot({ state: "idle" });
      }
    }, 1400);
  }
}

function localGetNavaiVoiceSnapshot() {
  return { ...currentSnapshot };
}

function localSubscribeNavaiVoiceSnapshot(
  listener: (snapshot: NavaiVoiceSnapshot) => void,
) {
  snapshotListeners.add(listener);
  listener({ ...currentSnapshot });
  return () => {
    snapshotListeners.delete(listener);
  };
}

function localSubscribeNavaiAgentSpeaking(
  listener: (isSpeaking: boolean) => void,
) {
  speakingListeners.add(listener);
  listener(speakingState);
  return () => {
    speakingListeners.delete(listener);
  };
}

function localUpdateNavaiVoiceSnapshot(patch: Partial<NavaiVoiceSnapshot>) {
  patchSnapshot(patch);
}

function localResetNavaiVoiceStatusMessages() {
  patchSnapshot({
    statusMessage: "",
    ariaMessage: "",
  });
}

function localGetNavaiCanStartVoice() {
  return getCanStartVoice();
}

function localGetNavaiIsConnected() {
  return getIsConnected();
}

function localGetNavaiIsDisabled() {
  return currentSnapshot.state === "connecting";
}

function localStopNavaiVoiceSession(message?: string) {
  stopSession(message);
}

async function localToggleNavaiVoiceSession(options: ToggleOptions) {
  if (getIsConnected() || sessionRef || currentSnapshot.state === "connecting" || startInFlight) {
    stopSession(options.micMessages.stopped);
    return;
  }

  if (!getCanStartVoice()) {
    const blockedMessage =
      currentSnapshot.backendConnectionState === "offline"
        ? options.micMessages.backendOfflineStartBlocked
        : options.micMessages.backendUnavailableStartBlocked;
    patchSnapshot({
      state: "error",
      ariaMessage: blockedMessage,
      statusMessage: blockedMessage,
    });
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        if (currentSnapshot.state === "error") {
          patchSnapshot({ state: "idle" });
        }
      }, 1400);
    }
    return;
  }

  if (!startInFlight) {
    startInFlight = startSession(options).finally(() => {
      startInFlight = null;
    });
  }

  await startInFlight;
}

async function localSyncNavaiVoiceSessionLanguage(options: {
  languageCode: LanguageCode;
  onNavigate?: (path: string) => void;
}) {
  if (typeof window === "undefined") {
    return;
  }
  if (!sessionRef || currentSnapshot.state !== "connected") {
    activeLanguageCode = options.languageCode;
    if (typeof options.onNavigate === "function") {
      navigateHandlerRef = options.onNavigate;
    }
    return;
  }
  if (options.languageCode === activeLanguageCode) {
    if (typeof options.onNavigate === "function") {
      navigateHandlerRef = options.onNavigate;
    }
    return;
  }

  const backendClient = backendClientRef;
  if (!backendClient) {
    activeLanguageCode = options.languageCode;
    return;
  }

  if (typeof options.onNavigate === "function") {
    navigateHandlerRef = options.onNavigate;
  }
  activeLanguageCode = options.languageCode;

  try {
    const voiceRuntime = await loadVoiceRuntime();
    const isPublicExperienceAgent =
      sessionContextRef?.agentProfile === "public-experience";
    const sessionRuntimeCatalog = isPublicExperienceAgent
      ? await resolvePublicExperienceRuntimeConfig(voiceRuntime)
      : await resolvePlatformRuntimeConfig(voiceRuntime);
    const { agent } = await voiceRuntime.buildNavaiAgent({
      navigate: (path) => {
        if (navigateHandlerRef) {
          navigateHandlerRef(path);
          return;
        }
        void navigatePath(path);
      },
      routes: sessionRuntimeCatalog.routes,
      functionModuleLoaders: sessionRuntimeCatalog.functionModuleLoaders,
      agents: sessionRuntimeCatalog.agents,
      primaryAgentKey: sessionRuntimeCatalog.primaryAgentKey,
      baseInstructions: buildSessionBaseInstructions(activeLanguageCode),
      backendFunctions: backendFunctionsRef,
      executeBackendFunction: backendClient.executeFunction,
    });

    await sessionRef.updateAgent(agent);
  } catch {
    // Ignore runtime language update failures and keep current live session.
  }
}

localControllerApi = {
  getNavaiVoiceSnapshot: localGetNavaiVoiceSnapshot,
  subscribeNavaiVoiceSnapshot: localSubscribeNavaiVoiceSnapshot,
  subscribeNavaiAgentSpeaking: localSubscribeNavaiAgentSpeaking,
  updateNavaiVoiceSnapshot: localUpdateNavaiVoiceSnapshot,
  resetNavaiVoiceStatusMessages: localResetNavaiVoiceStatusMessages,
  getNavaiCanStartVoice: localGetNavaiCanStartVoice,
  getNavaiIsConnected: localGetNavaiIsConnected,
  getNavaiIsDisabled: localGetNavaiIsDisabled,
  stopNavaiVoiceSession: localStopNavaiVoiceSession,
  toggleNavaiVoiceSession: localToggleNavaiVoiceSession,
  syncNavaiVoiceSessionLanguage: localSyncNavaiVoiceSessionLanguage,
};

getControllerApi();

export function getNavaiVoiceSnapshot() {
  return getControllerApi().getNavaiVoiceSnapshot();
}

export function subscribeNavaiVoiceSnapshot(
  listener: (snapshot: NavaiVoiceSnapshot) => void,
) {
  return getControllerApi().subscribeNavaiVoiceSnapshot(listener);
}

export function subscribeNavaiAgentSpeaking(
  listener: (isSpeaking: boolean) => void,
) {
  return getControllerApi().subscribeNavaiAgentSpeaking(listener);
}

export function updateNavaiVoiceSnapshot(patch: Partial<NavaiVoiceSnapshot>) {
  getControllerApi().updateNavaiVoiceSnapshot(patch);
}

export function resetNavaiVoiceStatusMessages() {
  getControllerApi().resetNavaiVoiceStatusMessages();
}

export function getNavaiCanStartVoice() {
  return getControllerApi().getNavaiCanStartVoice();
}

export function getNavaiIsConnected() {
  return getControllerApi().getNavaiIsConnected();
}

export function getNavaiIsDisabled() {
  return getControllerApi().getNavaiIsDisabled();
}

export function stopNavaiVoiceSession(message?: string) {
  getControllerApi().stopNavaiVoiceSession(message);
}

export async function toggleNavaiVoiceSession(options: ToggleOptions) {
  await getControllerApi().toggleNavaiVoiceSession(options);
}

export async function syncNavaiVoiceSessionLanguage(options: {
  languageCode: LanguageCode;
  onNavigate?: (path: string) => void;
}) {
  await getControllerApi().syncNavaiVoiceSessionLanguage(options);
}

export function setNavaiVoiceSessionContext(context: NavaiVoiceSessionContext | null) {
  sessionContextRef = context;
}

export function clearNavaiVoiceSessionContext() {
  sessionContextRef = null;
}
