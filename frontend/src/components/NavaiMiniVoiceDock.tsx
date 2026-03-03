'use client';

import { Mic, X } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import dynamic from "@/platform/dynamic";
import { useI18n } from "@/i18n/provider";
import { buildBackendApiUrl } from "@/lib/backend-api";
import {
  getNavaiVoiceSnapshot,
  resetNavaiVoiceStatusMessages,
  stopNavaiVoiceSession,
  subscribeNavaiVoiceSnapshot,
  syncNavaiVoiceSessionLanguage,
  toggleNavaiVoiceSession,
  updateNavaiVoiceSnapshot,
} from "@/lib/navai-voice-controller";
import { useRouter } from "@/platform/navigation";
import { useTheme } from "@/theme/provider";

const Orb = dynamic(() => import("@/components/Orb"), {
  ssr: false,
});

const CONNECTION_CHECK_DEBOUNCE_MS = 320;
const CONNECTION_CHECK_TIMEOUT_MS = 4500;
const API_KEY_VALIDATION_DEBOUNCE_MS = 460;
const API_KEY_VALIDATION_TIMEOUT_MS = 6500;
const PROJECT_REPOSITORY_URL = "https://github.com/Luxisoft/navai-exhibition";

type NavaiMiniVoiceDockProps = {
  className?: string;
};

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
  if (
    message.includes("OpenAI client_secrets failed") ||
    message.includes("invalid_api_key") ||
    message.includes("Incorrect API key provided")
  ) {
    return messages.clientSecretRejected;
  }

  return message || messages.genericError;
}

export default function NavaiMiniVoiceDock({ className = "" }: NavaiMiniVoiceDockProps) {
  const { language, messages } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [shouldAutoStartAfterValidation, setShouldAutoStartAfterValidation] = useState(false);
  const [voiceSnapshot, setVoiceSnapshot] = useState(getNavaiVoiceSnapshot);
  const apiInputRef = useRef<HTMLInputElement | null>(null);

  const {
    apiKey,
    isApiKeyValidated,
    apiKeyValidationState,
    backendConnectionState,
    state,
    ariaMessage,
    statusMessage,
    isAgentSpeaking,
  } = voiceSnapshot;

  const hasInputApiKey = apiKey.trim().length > 0;
  const isConnected = state === "connected";
  const isActive = state === "connecting" || state === "connected";
  const shouldAnimateOrb = true;
  const shouldHighlightOrb = isAgentSpeaking || isActive;
  const orbHoverIntensity = isAgentSpeaking ? 0.66 : 0.08;
  const canStartVoice = isApiKeyValidated && backendConnectionState === "ready";
  const isDisabled = false;
  const connectionStatusMessage = useMemo(() => {
    if (!hasInputApiKey || isApiKeyValidated) {
      return "";
    }

    if (backendConnectionState === "checking") {
      return "Verificando conexion con backend...";
    }

    if (backendConnectionState === "offline") {
      return "Sin conexion a internet. Revisa tu red.";
    }

    if (backendConnectionState === "unreachable") {
      return "No se pudo conectar con el backend NAVAI.";
    }

    if (backendConnectionState === "ready" && apiKeyValidationState === "checking") {
      return "Validando API key de OpenAI...";
    }

    return "";
  }, [apiKeyValidationState, backendConnectionState, hasInputApiKey, isApiKeyValidated]);
  const effectiveStatusMessage = statusMessage || connectionStatusMessage;
  const modalStatusClassName = useMemo(() => {
    return [
      "navai-api-modal-status",
      backendConnectionState === "offline" || backendConnectionState === "unreachable"
        ? "is-warning"
        : "",
      apiKeyValidationState === "invalid" ? "is-error" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [apiKeyValidationState, backendConnectionState]);

  const dockClassName = useMemo(() => {
    return ["navai-mini-dock", className].filter(Boolean).join(" ");
  }, [className]);

  const miniShellClassName = useMemo(() => {
    return [
      "navai-mini-mic-shell",
      canStartVoice ? "is-ready" : "",
      isActive ? "is-active" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [canStartVoice, isActive]);

  const miniButtonClassName = useMemo(() => {
    return [
      "navai-mini-mic-button",
      isActive ? "is-active" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [isActive]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isApiModalOpen) {
      return;
    }
    apiInputRef.current?.focus();
  }, [isApiModalOpen]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }
    return subscribeNavaiVoiceSnapshot((snapshot) => {
      setVoiceSnapshot(snapshot);
    });
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    void syncNavaiVoiceSessionLanguage({
      languageCode: language,
      onNavigate: (path) => {
        router.push(path);
      },
    });
  }, [isMounted, language, router]);

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    if (!hasInputApiKey) {
      updateNavaiVoiceSnapshot({ backendConnectionState: navigator.onLine ? "idle" : "offline" });
      return;
    }

    let isEffectMounted = true;
    let activeController: AbortController | null = null;

    const runConnectionCheck = async () => {
      if (!navigator.onLine) {
        if (isEffectMounted) {
          updateNavaiVoiceSnapshot({ backendConnectionState: "offline" });
        }
        return;
      }

      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      updateNavaiVoiceSnapshot({ backendConnectionState: "checking" });
      const timeoutId = window.setTimeout(() => controller.abort(), CONNECTION_CHECK_TIMEOUT_MS);

      try {
        const capabilitiesResponse = await fetch(buildBackendApiUrl("/api/backend-capabilities"), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!capabilitiesResponse.ok) {
          throw new Error(`capabilities_${capabilitiesResponse.status}`);
        }

        const functionsResponse = await fetch(buildBackendApiUrl("/navai/functions"), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!functionsResponse.ok) {
          throw new Error(`functions_${functionsResponse.status}`);
        }

        if (isEffectMounted) {
          updateNavaiVoiceSnapshot({ backendConnectionState: "ready" });
        }
      } catch {
        if (isEffectMounted) {
          updateNavaiVoiceSnapshot({
            backendConnectionState: navigator.onLine ? "unreachable" : "offline",
          });
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (activeController === controller) {
          activeController = null;
        }
      }
    };

    const debounceId = window.setTimeout(() => {
      void runConnectionCheck();
    }, CONNECTION_CHECK_DEBOUNCE_MS);

    const handleOnline = () => {
      void runConnectionCheck();
    };
    const handleOffline = () => {
      updateNavaiVoiceSnapshot({ backendConnectionState: "offline" });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      isEffectMounted = false;
      activeController?.abort();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearTimeout(debounceId);
    };
  }, [hasInputApiKey, isMounted, apiKey]);

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") {
      return;
    }

    if (!hasInputApiKey) {
      updateNavaiVoiceSnapshot({ apiKeyValidationState: "idle" });
      return;
    }
    if (backendConnectionState !== "ready" || isApiKeyValidated) {
      return;
    }

    let isEffectMounted = true;
    const controller = new AbortController();
    let timeoutId: number | null = null;
    const trimmedKey = apiKey.trim();

    const runApiKeyValidation = async () => {
      updateNavaiVoiceSnapshot({ apiKeyValidationState: "checking" });
      resetNavaiVoiceStatusMessages();
      updateNavaiVoiceSnapshot({ ariaMessage: "Validando API key de OpenAI..." });
      timeoutId = window.setTimeout(() => controller.abort(), API_KEY_VALIDATION_TIMEOUT_MS);

      try {
        const response = await fetch(buildBackendApiUrl("/navai/realtime/client-secret"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey: trimmedKey,
          }),
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          let backendError = `client_secret_${response.status}`;
          try {
            const payload = (await response.json()) as { error?: string };
            if (typeof payload.error === "string" && payload.error.trim().length > 0) {
              backendError = payload.error;
            }
          } catch {
            // Keep fallback error string.
          }
          throw new Error(backendError);
        }

        const payload = (await response.json()) as { value?: string };
        if (typeof payload.value !== "string" || payload.value.trim().length === 0) {
          throw new Error("OpenAI client_secrets failed: invalid backend response");
        }

        if (isEffectMounted) {
          updateNavaiVoiceSnapshot({
            isApiKeyValidated: true,
            apiKeyValidationState: "valid",
            statusMessage: "",
            ariaMessage: "API key validada correctamente.",
          });
        }
      } catch (error) {
        if (!isEffectMounted || controller.signal.aborted) {
          return;
        }
        const message = formatVoiceError(error, messages.mic);
        updateNavaiVoiceSnapshot({
          isApiKeyValidated: false,
          apiKeyValidationState: "invalid",
          statusMessage: message,
          ariaMessage: message,
        });
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      }
    };

    const debounceId = window.setTimeout(() => {
      void runApiKeyValidation();
    }, API_KEY_VALIDATION_DEBOUNCE_MS);

    return () => {
      isEffectMounted = false;
      controller.abort();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      window.clearTimeout(debounceId);
    };
  }, [apiKey, backendConnectionState, hasInputApiKey, isApiKeyValidated, isMounted, messages.mic]);

  useEffect(() => {
    if (!isMounted || !isApiModalOpen || !isApiKeyValidated || !canStartVoice) {
      return;
    }

    setIsApiModalOpen(false);

    if (!shouldAutoStartAfterValidation) {
      return;
    }

    setShouldAutoStartAfterValidation(false);
    void toggleNavaiVoiceSession({
      apiKey: apiKey.trim(),
      micMessages: messages.mic,
      languageCode: language,
      onNavigate: (path) => {
        router.push(path);
      },
    });
  }, [
    apiKey,
    canStartVoice,
    isApiKeyValidated,
    isApiModalOpen,
    isMounted,
    language,
    messages.mic,
    router,
    shouldAutoStartAfterValidation,
  ]);

  const closeApiModal = useCallback(() => {
    setIsApiModalOpen(false);
    setShouldAutoStartAfterValidation(false);
  }, []);

  const handleApiKeyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateNavaiVoiceSnapshot({
        apiKey: event.target.value,
        isApiKeyValidated: false,
        apiKeyValidationState: "idle",
        statusMessage: "",
        ariaMessage: "",
        ...(state === "error" ? { state: "idle" } : {}),
      });
    },
    [state]
  );

  const handleVoice = useCallback(async () => {
    if (state === "connecting") {
      stopNavaiVoiceSession(messages.mic.stopped);
      return;
    }

    if (!isConnected && !hasInputApiKey) {
      setIsApiModalOpen(true);
      setShouldAutoStartAfterValidation(true);
      return;
    }

    setShouldAutoStartAfterValidation(false);

    await toggleNavaiVoiceSession({
      apiKey: apiKey.trim(),
      micMessages: messages.mic,
      languageCode: language,
      onNavigate: (path) => {
        router.push(path);
      },
    });
  }, [apiKey, hasInputApiKey, isConnected, language, messages.mic, router, state]);

  if (!isMounted) {
    return null;
  }

  return (
    <aside className={dockClassName}>
      <div className="navai-mini-orb-wrap">
        <div className={["navai-mini-orb", shouldHighlightOrb ? "is-active" : ""].filter(Boolean).join(" ")}>
          <Orb
            hoverIntensity={orbHoverIntensity}
            rotateOnHover
            forceHoverState={isAgentSpeaking}
            enablePointerHover={false}
            animate={shouldAnimateOrb}
            backgroundColor={theme === "light" ? "#f4f6fb" : "#060914"}
          />
        </div>

        <div className={miniShellClassName}>
          <button
            type="button"
            className={miniButtonClassName}
            onClick={handleVoice}
            disabled={isDisabled}
            aria-label={isConnected || state === "connecting" ? messages.mic.ariaStop : messages.mic.ariaStart}
          >
            <Mic size={20} className={isActive ? "pulse" : undefined} />
          </button>
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {ariaMessage}
      </span>

      {isApiModalOpen ? (
        <div className="navai-api-modal-backdrop" onClick={closeApiModal}>
          <section
            className="navai-api-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="navai-mini-api-modal-title"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <header className="navai-api-modal-header">
              <h2 id="navai-mini-api-modal-title" className="navai-api-modal-title">
                {messages.mic.apiKeyLabel}
              </h2>
              <button
                type="button"
                className="navai-api-modal-close"
                onClick={closeApiModal}
                aria-label="Close API key modal"
              >
                <X size={16} />
              </button>
            </header>

            <input
              ref={apiInputRef}
              id="navai-mini-api-input"
              type="text"
              value={apiKey}
              onChange={handleApiKeyChange}
              className="navai-api-modal-input"
              aria-label={messages.mic.apiKeyLabel}
              placeholder={messages.mic.apiKeyPlaceholder}
              autoComplete="off"
              spellCheck={false}
            />

            <p className="navai-api-modal-help">
              {messages.mic.apiKeyNotice}{" "}
              <a
                className="navai-api-modal-help-link"
                href={PROJECT_REPOSITORY_URL}
                target="_blank"
                rel="noreferrer noopener"
              >
                {messages.mic.apiKeyNoticeRepoLabel}
              </a>
            </p>

            {effectiveStatusMessage ? (
              <p className={modalStatusClassName}>
                {effectiveStatusMessage}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </aside>
  );
}
