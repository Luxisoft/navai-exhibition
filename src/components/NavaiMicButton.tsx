'use client';

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
      sessionRef.current = null;
      onAgentSpeakingChange?.(false);
    };
  }, [onAgentSpeakingChange]);

  const stopSession = useCallback((message?: string) => {
    try {
      sessionRef.current?.close();
    } catch {
      // close failures are non-fatal
    } finally {
      sessionRef.current = null;
      onAgentSpeakingChange?.(false);
      setState("idle");
      if (message) {
        setAriaMessage(message);
        setStatusMessage(message);
      }
    }
  }, [onAgentSpeakingChange]);

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
        backendFunctions: backendFunctions.functions,
        executeBackendFunction: backendClient.executeFunction,
      });

      for (const warning of [...backendFunctions.warnings, ...warnings]) {
        if (warning.trim().length > 0) {
          console.warn(warning);
        }
      }

      const realtimeSession = new RealtimeSession(agent);
      realtimeSession.on("audio_start", () => {
        onAgentSpeakingChange?.(true);
      });
      realtimeSession.on("audio_stopped", () => {
        onAgentSpeakingChange?.(false);
      });
      realtimeSession.on("audio_interrupted", () => {
        onAgentSpeakingChange?.(false);
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
  }, [apiKey, messages.mic, onAgentSpeakingChange, router, stopSession]);

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

