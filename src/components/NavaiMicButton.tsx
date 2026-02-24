'use client';

import { NAVAI_FRONTEND_FUNCTION_LOADERS } from "@/ai/frontend-function-loaders";
import { NAVAI_ROUTE_ITEMS } from "@/ai/routes";
import { buildNavaiAgent, createNavaiBackendClient } from "@navai/voice-frontend";
import { RealtimeSession } from "@openai/agents/realtime";
import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";

type VoiceState = "idle" | "connecting" | "connected" | "error";

type NavaiMicButtonProps = {
  hasBackendApiKey?: boolean;
  onAgentSpeakingChange?: (isSpeaking: boolean) => void;
};

const PROJECT_REPOSITORY_URL = "https://github.com/Luxisoft/navai-exhibition";
const NAVAI_AGENT_BASE_INSTRUCTIONS = [
  "You are helping users navigate this NAVAI Exhibition app.",
  "For navigation, always prefer the navigate_to tool using allowed routes/URLs.",
  "For questions about this project's documentation and implementation screens/URLs/submenus, use:",
  "- list_navai_project_navigation (catalog of routes and submenus)",
  "- describe_navai_project_view (details for one screen/submenu URL)",
  "- explain_navai_page_purpose (what a page or submenu does)",
  "- list_navai_page_purpose_summaries (overview of what pages do)",
  "- search_navai_project_knowledge (search docs/implementation content snippets)",
  "For the ecommerce demo page (/documentation/playground-stores), you can use SQLite-backed backend tools for reports and queries:",
  "- get_ecommerce_demo_seed_snapshot",
  "- get_ecommerce_demo_overview_report",
  "- list_ecommerce_demo_products",
  "- list_ecommerce_demo_orders",
  "- get_ecommerce_demo_sales_report",
  "- get_ecommerce_demo_safety_policy",
  "For local demo-only actions on /documentation/playground-stores (browser localStorage only), you can use local tools:",
  "- get_ecommerce_local_demo_state",
  "- create_ecommerce_demo_user_product",
  "- update_ecommerce_demo_user_product",
  "- delete_ecommerce_demo_user_product",
  "- buy_ecommerce_demo_product",
  "- reset_ecommerce_demo_local_data",
  "- scroll_page (scroll the current page: up/down, top/bottom, percent, or selector/id)",
  "When useful, answer with the exact URL path or URL hash section in this app.",
  "Only use scroll_page after the user is already on the correct page.",
  "Do not attempt to modify seed SQLite data; seed records are read-only and only localStorage demo records are mutable.",
].join("\n");

function estimateSpeechDurationMs(outputText: string) {
  const normalized = outputText.trim();
  if (normalized.length === 0) {
    return 1400;
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const tokenLikeCount = wordCount > 1 ? wordCount : Math.ceil(normalized.length / 3);

  // ~2.6 tokens/second + safety buffer
  const estimatedMs = Math.round((tokenLikeCount / 2.6) * 1000) + 700;
  return Math.max(1800, Math.min(16000, estimatedMs));
}

function formatVoiceError(
  error: unknown,
  messages: {
    missingKey: string;
    frontendKeyDisabled: string;
    clientSecretRejected: string;
    genericError: string;
  }
) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Missing openaiApiKey") || message.includes("Missing API key")) {
    return messages.missingKey;
  }
  if (message.includes("Passing apiKey from request is disabled")) {
    return messages.frontendKeyDisabled;
  }
  if (message.includes("OpenAI client_secrets failed")) {
    return messages.clientSecretRejected;
  }

  return message || messages.genericError;
}

export default function NavaiMicButton({
  hasBackendApiKey = false,
  onAgentSpeakingChange,
}: NavaiMicButtonProps) {
  const { messages } = useI18n();
  const router = useRouter();
  const sessionRef = useRef<RealtimeSession | null>(null);
  const speakingStateRef = useRef(false);
  const audioPlayingRef = useRef(false);
  const agentTurnActiveRef = useRef(false);
  const audioSeenInTurnRef = useRef(false);
  const speakingFallbackUntilRef = useRef(0);
  const speakingOffTimeoutRef = useRef<number | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [state, setState] = useState<VoiceState>("idle");
  const [ariaMessage, setAriaMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const hasInputApiKey = apiKey.trim().length > 0;
  const hasAnyApiKey = hasBackendApiKey || hasInputApiKey;
  const isConnected = state === "connected";
  const isActive = state === "connecting" || state === "connected";
  const isError = state === "error";
  const isDisabled = state === "connecting";

  const buttonClassName = useMemo(() => {
    return [
      "navai-mic-button",
      hasAnyApiKey ? "is-ready" : "is-empty",
      isActive ? "is-active" : "",
      isError ? "is-error" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [hasAnyApiKey, isActive, isError]);

  useEffect(() => {
    if (isActive) {
      document.body.classList.add("home-realtime-active");
    } else {
      document.body.classList.remove("home-realtime-active");
    }

    return () => {
      document.body.classList.remove("home-realtime-active");
    };
  }, [isActive]);

  useEffect(() => {
    if (hasAnyApiKey) {
      document.body.classList.add("home-key-ready");
    } else {
      document.body.classList.remove("home-key-ready");
    }

    return () => {
      document.body.classList.remove("home-key-ready");
    };
  }, [hasAnyApiKey]);

  useEffect(() => {
    return () => {
      try {
        sessionRef.current?.close();
      } catch {
        // ignore close errors during unmount
      }
      speakingStateRef.current = false;
      audioPlayingRef.current = false;
      agentTurnActiveRef.current = false;
      audioSeenInTurnRef.current = false;
      speakingFallbackUntilRef.current = 0;
      if (speakingOffTimeoutRef.current !== null) {
        window.clearTimeout(speakingOffTimeoutRef.current);
        speakingOffTimeoutRef.current = null;
      }
      sessionRef.current = null;
      onAgentSpeakingChange?.(false);
    };
  }, [onAgentSpeakingChange]);

  const setSpeakingState = useCallback(
    (isSpeaking: boolean) => {
      if (speakingStateRef.current === isSpeaking) {
        return;
      }
      speakingStateRef.current = isSpeaking;
      onAgentSpeakingChange?.(isSpeaking);
    },
    [onAgentSpeakingChange]
  );

  const clearSpeakingOffTimeout = useCallback(() => {
    if (speakingOffTimeoutRef.current !== null) {
      window.clearTimeout(speakingOffTimeoutRef.current);
      speakingOffTimeoutRef.current = null;
    }
  }, []);

  const scheduleSpeakingOff = useCallback(
    (delayMs = 1200) => {
      clearSpeakingOffTimeout();
      speakingOffTimeoutRef.current = window.setTimeout(() => {
        speakingOffTimeoutRef.current = null;
        if (!agentTurnActiveRef.current && !audioPlayingRef.current) {
          setSpeakingState(false);
        }
      }, delayMs);
    },
    [clearSpeakingOffTimeout, setSpeakingState]
  );

  const markSpeakingOn = useCallback(() => {
    clearSpeakingOffTimeout();
    setSpeakingState(true);
  }, [clearSpeakingOffTimeout, setSpeakingState]);

  const stopSession = useCallback((message?: string) => {
    try {
      sessionRef.current?.close();
    } catch {
      // close failures are non-fatal
    } finally {
      sessionRef.current = null;
      clearSpeakingOffTimeout();
      audioPlayingRef.current = false;
      agentTurnActiveRef.current = false;
      audioSeenInTurnRef.current = false;
      speakingFallbackUntilRef.current = 0;
      setSpeakingState(false);
      setState("idle");
      if (message) {
        setAriaMessage(message);
        setStatusMessage(message);
      }
    }
  }, [clearSpeakingOffTimeout, setSpeakingState]);

  const startSession = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    setState("connecting");
    setAriaMessage(messages.mic.connecting);
    setStatusMessage(messages.mic.connecting);

    const backendClient = createNavaiBackendClient({
      apiBaseUrl: window.location.origin,
    });

    try {
      audioPlayingRef.current = false;
      agentTurnActiveRef.current = false;
      audioSeenInTurnRef.current = false;
      speakingFallbackUntilRef.current = 0;
      clearSpeakingOffTimeout();

      const trimmedKey = apiKey.trim();
      const secret = await backendClient.createClientSecret(
        trimmedKey
          ? {
              apiKey: trimmedKey,
            }
          : {}
      );
      const backendFunctions = await backendClient.listFunctions();
      const { agent, warnings } = await buildNavaiAgent({
        navigate: (path) => {
          router.push(path);
        },
        routes: NAVAI_ROUTE_ITEMS,
        functionModuleLoaders: NAVAI_FRONTEND_FUNCTION_LOADERS,
        baseInstructions: NAVAI_AGENT_BASE_INSTRUCTIONS,
        backendFunctions: backendFunctions.functions,
        executeBackendFunction: backendClient.executeFunction,
      });

      for (const warning of [...backendFunctions.warnings, ...warnings]) {
        if (warning.trim().length > 0) {
          console.warn(warning);
        }
      }

      const realtimeSession = new RealtimeSession(agent);
      realtimeSession.on("agent_start", () => {
        agentTurnActiveRef.current = true;
        audioSeenInTurnRef.current = false;
        speakingFallbackUntilRef.current = 0;
        markSpeakingOn();
      });
      realtimeSession.on("agent_end", (_context, _agent, output) => {
        agentTurnActiveRef.current = false;
        if (audioSeenInTurnRef.current) {
          if (!audioPlayingRef.current) {
            scheduleSpeakingOff(1800);
          }
          return;
        }

        // Fallback for transports where continuous audio events are sparse/unavailable.
        const expectedUntil = Date.now() + estimateSpeechDurationMs(output ?? "");
        speakingFallbackUntilRef.current = Math.max(speakingFallbackUntilRef.current, expectedUntil);

        if (!audioPlayingRef.current) {
          const delay = Math.max(1200, speakingFallbackUntilRef.current - Date.now() + 200);
          scheduleSpeakingOff(delay);
        }
      });
      realtimeSession.on("audio_start", () => {
        audioPlayingRef.current = true;
        audioSeenInTurnRef.current = true;
        speakingFallbackUntilRef.current = 0;
        markSpeakingOn();
      });
      realtimeSession.on("audio", () => {
        audioPlayingRef.current = true;
        audioSeenInTurnRef.current = true;
        speakingFallbackUntilRef.current = 0;
        markSpeakingOn();
      });
      realtimeSession.on("audio_stopped", () => {
        audioPlayingRef.current = false;
        if (!agentTurnActiveRef.current) {
          scheduleSpeakingOff(1800);
        }
      });
      realtimeSession.on("audio_interrupted", () => {
        audioPlayingRef.current = false;
        audioSeenInTurnRef.current = false;
        speakingFallbackUntilRef.current = 0;
        if (!agentTurnActiveRef.current) {
          scheduleSpeakingOff(400);
        }
      });
      await realtimeSession.connect({ apiKey: secret.value });

      sessionRef.current = realtimeSession;
      setState("connected");
      setAriaMessage(messages.mic.active);
      setStatusMessage(messages.mic.activeDetail);
    } catch (error) {
      const message = formatVoiceError(error, messages.mic);
      stopSession();
      setState("error");
      setAriaMessage(message);
      setStatusMessage(message);
      window.setTimeout(() => {
        setState("idle");
      }, 1400);
    }
  }, [
    apiKey,
    clearSpeakingOffTimeout,
    markSpeakingOn,
    messages.mic,
    router,
    scheduleSpeakingOff,
    stopSession,
  ]);

  const handleVoice = useCallback(async () => {
    if (isDisabled || !hasAnyApiKey) {
      return;
    }

    if (isConnected || sessionRef.current) {
      stopSession(messages.mic.stopped);
      return;
    }

    await startSession();
  }, [hasAnyApiKey, isConnected, isDisabled, messages.mic.stopped, startSession, stopSession]);

  const handleApiKeyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setApiKey(event.target.value);
      if (state === "error") {
        setState("idle");
      }
    },
    [state]
  );

  return (
    <div className="home-voice">
      {!hasAnyApiKey ? (
        <>
          <label htmlFor="navai-api-input" className="navai-api-label">
            {messages.mic.apiKeyLabel}
          </label>
          <input
            id="navai-api-input"
            type="text"
            value={apiKey}
            onChange={handleApiKeyChange}
            className="navai-api-input"
            placeholder={messages.mic.apiKeyPlaceholder}
            autoComplete="off"
            spellCheck={false}
          />
          <small className="navai-api-help">
            {messages.mic.apiKeyNotice}{" "}
            <a
              className="navai-api-help-link"
              href={PROJECT_REPOSITORY_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              {messages.mic.apiKeyNoticeRepoLabel}
            </a>
            : {PROJECT_REPOSITORY_URL}
          </small>
          <div className="home-voice-divider" aria-hidden />
        </>
      ) : null}

      {hasAnyApiKey ? (
        <button
          type="button"
          className={buttonClassName}
          onClick={handleVoice}
          disabled={isDisabled}
          aria-label={isConnected ? messages.mic.ariaStop : messages.mic.ariaStart}
        >
          <Mic size={28} className={isActive ? "pulse" : undefined} />
        </button>
      ) : null}

      {statusMessage ? <p className="home-voice-status">{statusMessage}</p> : null}

      <span className="sr-only" aria-live="polite">
        {ariaMessage}
      </span>
    </div>
  );
}

