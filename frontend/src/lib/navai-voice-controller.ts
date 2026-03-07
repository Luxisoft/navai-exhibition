import { NAVAI_FRONTEND_FUNCTION_LOADERS } from "@/ai/frontend-function-loaders";
import { NAVAI_ROUTE_ITEMS } from "@/ai/routes";
import { getBackendApiBaseUrl } from "@/lib/backend-api";
import type { NavaiAgentVoiceState, NavaiSessionStatus } from "@/lib/navai-agent-state";
import { navigatePath } from "@/platform/navigation";
import type { LanguageCode } from "@/i18n/messages";

export type VoiceState = NavaiSessionStatus;
export type BackendConnectionState = "idle" | "checking" | "ready" | "offline" | "unreachable";
export type ApiKeyValidationState = "idle" | "checking" | "valid" | "invalid";

type NavaiBackendClientLike = {
  createClientSecret: (payload?: { apiKey?: string }) => Promise<{ value: string }>;
  listFunctions: () => Promise<{ functions: any[]; warnings: string[] }>;
  executeFunction: (...args: any[]) => Promise<any>;
};

type RealtimeSessionLike = {
  on: (event: string, listener: (...args: any[]) => void) => void;
  off?: (event: string, listener: (...args: any[]) => void) => void;
  connect: (options: { apiKey: string }) => Promise<void>;
  updateAgent: (newAgent: any) => Promise<any>;
  close: () => void;
};

type VoiceRuntime = {
  buildNavaiAgent: (options: {
    navigate: (path: string) => void;
    routes: typeof NAVAI_ROUTE_ITEMS;
    functionModuleLoaders: typeof NAVAI_FRONTEND_FUNCTION_LOADERS;
    baseInstructions: string;
    backendFunctions: any[];
    executeBackendFunction: NavaiBackendClientLike["executeFunction"];
  }) => Promise<{ agent: any; warnings: string[] }>;
  createNavaiBackendClient: (options: { apiBaseUrl: string }) => NavaiBackendClientLike;
  RealtimeSession: new (agent: any, options?: { transport?: unknown }) => RealtimeSessionLike;
  OpenAIRealtimeWebRTC?: new (options?: { audioElement?: HTMLAudioElement }) => unknown;
};

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
    listener: (snapshot: NavaiVoiceSnapshot) => void
  ) => () => void;
  subscribeNavaiAgentSpeaking: (listener: (isSpeaking: boolean) => void) => () => void;
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

function logNavaiVoiceDebug(event: string, payload: Record<string, unknown> = {}) {
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

  if (typeof normalizedPatch.state === "string" && typeof normalizedPatch.status !== "string") {
    normalizedPatch.status = normalizedPatch.state;
  } else if (typeof normalizedPatch.status === "string" && typeof normalizedPatch.state !== "string") {
    normalizedPatch.state = normalizedPatch.status;
  }

  if (typeof normalizedPatch.isAgentSpeaking === "boolean" && typeof normalizedPatch.agentVoiceState !== "string") {
    normalizedPatch.agentVoiceState = normalizedPatch.isAgentSpeaking ? "speaking" : "idle";
  } else if (
    typeof normalizedPatch.agentVoiceState === "string" &&
    typeof normalizedPatch.isAgentSpeaking !== "boolean"
  ) {
    normalizedPatch.isAgentSpeaking = normalizedPatch.agentVoiceState === "speaking";
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

  if (message.includes("Missing openaiApiKey") || message.includes("Missing API key")) {
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
  setSpeakingState(isConnected && (modelSpeakingSignal || playbackSpeakingSignal));
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

function handleSessionTransportEvent(event: unknown) {
  if (!event || typeof event !== "object" || !("type" in event)) {
    return;
  }

  const eventType = String((event as { type?: unknown }).type ?? "");
  if (eventType.length === 0) {
    return;
  }

  const modelSpeakingStartEvent =
    eventType === "response.output_audio.delta" ||
    eventType === "response.output_audio_transcript.delta";
  const modelSpeakingStopEvent = eventType === "response.output_audio_transcript.done";
  const playbackSpeakingStartEvent = eventType === "output_audio_buffer.started";
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
  logNavaiVoiceDebug("stop_session", {
    hasMessage: Boolean(message),
  });
  detachSessionAudioListeners();
  detachPlaybackTrackObserver();
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
}

async function loadVoiceRuntime(): Promise<VoiceRuntime> {
  if (!voiceRuntimePromise) {
    voiceRuntimePromise = Promise.all([
      import("@navai/voice-frontend"),
      import("@openai/agents/realtime"),
    ]).then(([voiceFrontendModule, realtimeModule]) => ({
      buildNavaiAgent: voiceFrontendModule.buildNavaiAgent,
      createNavaiBackendClient: voiceFrontendModule.createNavaiBackendClient,
      RealtimeSession: realtimeModule.RealtimeSession,
      OpenAIRealtimeWebRTC: realtimeModule.OpenAIRealtimeWebRTC,
    }));
  }

  return voiceRuntimePromise;
}

async function startSession(options: ToggleOptions) {
  if (typeof window === "undefined") {
    return;
  }
  if (!getCanStartVoice()) {
    return;
  }

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
  });
  backendClientRef = backendClient;
  navigateHandlerRef = options.onNavigate ?? ((path) => void navigatePath(path));
  activeLanguageCode = options.languageCode ?? activeLanguageCode;

  try {
    clearSpeakingSignals("start_session");

    const trimmedKey = options.apiKey.trim();
    const secret = await backendClient.createClientSecret(
      trimmedKey.length > 0 ? { apiKey: trimmedKey } : undefined
    );
    patchSnapshot({
      isApiKeyValidated: true,
      apiKeyValidationState: "valid",
    });

    const backendFunctions = await backendClient.listFunctions();
    backendFunctionsRef = backendFunctions.functions;
    const { agent, warnings } = await voiceRuntime.buildNavaiAgent({
      navigate: (path) => {
        if (navigateHandlerRef) {
          navigateHandlerRef(path);
          return;
        }
        void navigatePath(path);
      },
      routes: NAVAI_ROUTE_ITEMS,
      functionModuleLoaders: NAVAI_FRONTEND_FUNCTION_LOADERS,
      baseInstructions: buildNavaiAgentBaseInstructions(options.languageCode),
      backendFunctions: backendFunctions.functions,
      executeBackendFunction: backendClient.executeFunction,
    });

    for (const warning of [...backendFunctions.warnings, ...warnings]) {
      if (warning.trim().length > 0) {
        console.warn(warning);
      }
    }

    const audioElement = document.createElement("audio");
    audioElement.autoplay = true;
    audioElement.playsInline = true;
    attachPlaybackTrackObserver(audioElement);

    const transport =
      typeof voiceRuntime.OpenAIRealtimeWebRTC === "function"
        ? new voiceRuntime.OpenAIRealtimeWebRTC({ audioElement })
        : null;
    const realtimeSession = transport
      ? new voiceRuntime.RealtimeSession(agent, { transport })
      : new voiceRuntime.RealtimeSession(agent);
    attachSessionAudioListeners(realtimeSession);

    await realtimeSession.connect({ apiKey: secret.value });

    sessionRef = realtimeSession;
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

function localSubscribeNavaiVoiceSnapshot(listener: (snapshot: NavaiVoiceSnapshot) => void) {
  snapshotListeners.add(listener);
  listener({ ...currentSnapshot });
  return () => {
    snapshotListeners.delete(listener);
  };
}

function localSubscribeNavaiAgentSpeaking(listener: (isSpeaking: boolean) => void) {
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
  if (localGetNavaiIsDisabled()) {
    return;
  }

  if (getIsConnected() || sessionRef) {
    stopSession(options.micMessages.stopped);
    return;
  }

  if (!getCanStartVoice()) {
    const blockedMessage =
      currentSnapshot.backendConnectionState === "offline"
        ? "Sin conexion a internet. Reconecta la red para iniciar NAVAI."
        : "No hay conexion valida con backend. Revisa API URL, CORS y backend.";
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
    const { agent } = await voiceRuntime.buildNavaiAgent({
      navigate: (path) => {
        if (navigateHandlerRef) {
          navigateHandlerRef(path);
          return;
        }
        void navigatePath(path);
      },
      routes: NAVAI_ROUTE_ITEMS,
      functionModuleLoaders: NAVAI_FRONTEND_FUNCTION_LOADERS,
      baseInstructions: buildNavaiAgentBaseInstructions(activeLanguageCode),
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

export function subscribeNavaiVoiceSnapshot(listener: (snapshot: NavaiVoiceSnapshot) => void) {
  return getControllerApi().subscribeNavaiVoiceSnapshot(listener);
}

export function subscribeNavaiAgentSpeaking(listener: (isSpeaking: boolean) => void) {
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
