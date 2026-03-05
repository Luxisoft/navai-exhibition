import { NAVAI_FRONTEND_FUNCTION_LOADERS } from "@/ai/frontend-function-loaders";
import { NAVAI_ROUTE_ITEMS } from "@/ai/routes";
import { getBackendApiBaseUrl } from "@/lib/backend-api";
import { navigatePath } from "@/platform/navigation";
import type { LanguageCode } from "@/i18n/messages";

export type VoiceState = "idle" | "connecting" | "connected" | "error";
export type BackendConnectionState = "idle" | "checking" | "ready" | "offline" | "unreachable";
export type ApiKeyValidationState = "idle" | "checking" | "valid" | "invalid";

type NavaiBackendClientLike = {
  createClientSecret: (payload?: { apiKey?: string }) => Promise<{ value: string }>;
  listFunctions: () => Promise<{ functions: any[]; warnings: string[] }>;
  executeFunction: (...args: any[]) => Promise<any>;
};

type RealtimeSessionLike = {
  on: (event: string, listener: (...args: any[]) => void) => void;
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
  RealtimeSession: new (agent: any) => RealtimeSessionLike;
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
  state: VoiceState;
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

let localControllerApi: NavaiVoiceControllerApi | null = null;

function getControllerApi() {
  const host = globalThis as NavaiVoiceControllerGlobalHost;
  if (host[NAVAI_VOICE_CONTROLLER_API_KEY]) {
    return host[NAVAI_VOICE_CONTROLLER_API_KEY];
  }

  if (!localControllerApi) {
    throw new Error("NAVAI voice controller API is not initialized.");
  }

  host[NAVAI_VOICE_CONTROLLER_API_KEY] = localControllerApi;
  return host[NAVAI_VOICE_CONTROLLER_API_KEY];
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
  state: "idle",
  ariaMessage: "",
  statusMessage: "",
  isAgentSpeaking: false,
};

let currentSnapshot: NavaiVoiceSnapshot = { ...initialSnapshot };
let voiceRuntimePromise: Promise<VoiceRuntime> | null = null;
let sessionRef: RealtimeSessionLike | null = null;
let backendClientRef: NavaiBackendClientLike | null = null;
let backendFunctionsRef: any[] = [];
let navigateHandlerRef: ((path: string) => void) | null = null;
let activeLanguageCode: LanguageCode = "es";
let speakingState = false;
let audioPlaying = false;
let agentTurnActive = false;
let audioSeenInTurn = false;
let speakingFallbackUntil = 0;
let speakingOffTimeout: number | null = null;
let startInFlight: Promise<void> | null = null;
let beforeUnloadBound = false;

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
  let changed = false;
  let speakingChanged = false;

  for (const [key, value] of Object.entries(patch) as Array<[keyof NavaiVoiceSnapshot, NavaiVoiceSnapshot[keyof NavaiVoiceSnapshot]]>) {
    if (Object.is(currentSnapshot[key], value)) {
      continue;
    }
    currentSnapshot = {
      ...currentSnapshot,
      [key]: value,
    };
    changed = true;
    if (key === "isAgentSpeaking") {
      speakingChanged = true;
    }
  }

  if (!changed) {
    return;
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

function estimateSpeechDurationMs(outputText: string) {
  const normalized = outputText.trim();
  if (normalized.length === 0) {
    return 1400;
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const tokenLikeCount = wordCount > 1 ? wordCount : Math.ceil(normalized.length / 3);
  const estimatedMs = Math.round((tokenLikeCount / 2.6) * 1000) + 700;
  return Math.max(1800, Math.min(16000, estimatedMs));
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

function clearSpeakingOffTimeout() {
  if (speakingOffTimeout !== null && typeof window !== "undefined") {
    window.clearTimeout(speakingOffTimeout);
  }
  speakingOffTimeout = null;
}

function setSpeakingState(isSpeaking: boolean) {
  if (speakingState === isSpeaking) {
    return;
  }
  speakingState = isSpeaking;
  patchSnapshot({ isAgentSpeaking: isSpeaking });
}

function scheduleSpeakingOff(delayMs = 1200) {
  if (typeof window === "undefined") {
    return;
  }
  clearSpeakingOffTimeout();
  speakingOffTimeout = window.setTimeout(() => {
    speakingOffTimeout = null;
    if (!agentTurnActive && !audioPlaying) {
      setSpeakingState(false);
    }
  }, delayMs);
}

function markSpeakingOn() {
  clearSpeakingOffTimeout();
  setSpeakingState(true);
}

function stopSession(message?: string) {
  try {
    sessionRef?.close();
  } catch {
    // close failures are non-fatal
  } finally {
    sessionRef = null;
    backendClientRef = null;
    backendFunctionsRef = [];
    navigateHandlerRef = null;
    clearSpeakingOffTimeout();
    audioPlaying = false;
    agentTurnActive = false;
    audioSeenInTurn = false;
    speakingFallbackUntil = 0;
    setSpeakingState(false);
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
    audioPlaying = false;
    agentTurnActive = false;
    audioSeenInTurn = false;
    speakingFallbackUntil = 0;
    clearSpeakingOffTimeout();

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

    const realtimeSession = new voiceRuntime.RealtimeSession(agent);
    realtimeSession.on("agent_start", () => {
      agentTurnActive = true;
      audioSeenInTurn = false;
      speakingFallbackUntil = 0;
      markSpeakingOn();
    });
    realtimeSession.on("agent_end", (_context, _agent, output) => {
      agentTurnActive = false;
      if (audioSeenInTurn) {
        if (!audioPlaying) {
          scheduleSpeakingOff(1800);
        }
        return;
      }

      const expectedUntil = Date.now() + estimateSpeechDurationMs(output ?? "");
      speakingFallbackUntil = Math.max(speakingFallbackUntil, expectedUntil);
      if (!audioPlaying) {
        const delay = Math.max(1200, speakingFallbackUntil - Date.now() + 200);
        scheduleSpeakingOff(delay);
      }
    });
    realtimeSession.on("audio_start", () => {
      audioPlaying = true;
      audioSeenInTurn = true;
      speakingFallbackUntil = 0;
      markSpeakingOn();
    });
    realtimeSession.on("audio", () => {
      audioPlaying = true;
      audioSeenInTurn = true;
      speakingFallbackUntil = 0;
      markSpeakingOn();
    });
    realtimeSession.on("audio_stopped", () => {
      audioPlaying = false;
      if (!agentTurnActive) {
        scheduleSpeakingOff(1800);
      }
    });
    realtimeSession.on("audio_interrupted", () => {
      audioPlaying = false;
      audioSeenInTurn = false;
      speakingFallbackUntil = 0;
      if (!agentTurnActive) {
        scheduleSpeakingOff(400);
      }
    });

    await realtimeSession.connect({ apiKey: secret.value });

    sessionRef = realtimeSession;
    patchSnapshot({
      state: "connected",
      ariaMessage: options.micMessages.active,
      statusMessage: options.micMessages.activeDetail,
    });
  } catch (error) {
    patchSnapshot({ isApiKeyValidated: false });
    const message = formatVoiceError(error, options.micMessages);
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
