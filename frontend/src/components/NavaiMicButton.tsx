'use client';

import { Mic } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/i18n/provider";
import { buildBackendApiUrl } from "@/lib/backend-api";
import {
  getNavaiVoiceSnapshot,
  subscribeNavaiAgentSpeaking,
  subscribeNavaiVoiceSnapshot,
  syncNavaiVoiceSessionLanguage,
  toggleNavaiVoiceSession,
  updateNavaiVoiceSnapshot,
} from "@/lib/navai-voice-controller";
import { useRouter } from "@/platform/navigation";

const CONNECTION_CHECK_DEBOUNCE_MS = 320;
const CONNECTION_CHECK_TIMEOUT_MS = 4500;
const TELEPROMPTER_ROTATION_MS = 3800;

const TELEPROMPTER_LINES = {
  es: [
    "Di: 'Llevame a Documentacion' para abrir guias de instalacion y librerias.",
    "Di: 'Ir a Request Implementation' para ver planes y formulario de contacto.",
    "Pregunta: 'Que hace esta pagina?' para recibir contexto de la vista actual.",
    "Usa scroll por voz: 'Baja al final' o 'Sube al inicio'.",
    "Pide acciones concretas: 'Busca voice-frontend en la documentacion'.",
  ],
  en: [
    "Say: 'Take me to Documentation' to open setup guides and libraries.",
    "Say: 'Go to Request Implementation' to review plans and contact form.",
    "Ask: 'What does this page do?' to get context for the current screen.",
    "Use voice scrolling: 'Scroll to the bottom' or 'Back to top'.",
    "Run targeted help: 'Search voice-frontend in the docs'.",
  ],
} as const;

type NavaiMicButtonProps = {
  onAgentSpeakingChange?: (isSpeaking: boolean) => void;
};

export default function NavaiMicButton({
  onAgentSpeakingChange,
}: NavaiMicButtonProps) {
  const { language, messages } = useI18n();
  const router = useRouter();
  const [voiceSnapshot, setVoiceSnapshot] = useState(getNavaiVoiceSnapshot);
  const [teleprompterIndex, setTeleprompterIndex] = useState(0);

  const {
    backendConnectionState,
    state,
    ariaMessage,
    statusMessage,
  } = voiceSnapshot;

  const isConnected = state === "connected";
  const isActive = state === "connecting" || state === "connected";
  const isError = state === "error";
  const canStartVoice = backendConnectionState === "ready";
  const showVoiceButton = true;
  const isVoiceReadyVisual = canStartVoice || isConnected || state === "connecting";
  const isDisabled = state === "connecting" || (!isConnected && !canStartVoice);

  const voiceClassName = useMemo(() => {
    return ["home-voice", showVoiceButton ? "has-mic" : "is-compact"]
      .filter(Boolean)
      .join(" ");
  }, [showVoiceButton]);

  const buttonClassName = useMemo(() => {
    return [
      "navai-mic-button",
      isVoiceReadyVisual ? "is-ready" : "is-empty",
      isActive ? "is-active" : "",
      isError ? "is-error" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [isActive, isError, isVoiceReadyVisual]);

  const connectionStatusMessage = useMemo(() => {
    if (backendConnectionState === "checking") {
      return "Verificando conexion con backend...";
    }

    if (backendConnectionState === "offline") {
      return "Sin conexion a internet. Revisa tu red.";
    }

    if (backendConnectionState === "unreachable") {
      return "No se pudo conectar con el backend NAVAI.";
    }
    return "";
  }, [backendConnectionState]);

  const effectiveStatusMessage = statusMessage || connectionStatusMessage;
  const statusClassName = useMemo(() => {
    return [
      "home-voice-status",
      backendConnectionState === "offline" || backendConnectionState === "unreachable"
        ? "is-warning"
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [backendConnectionState]);

  const teleprompterLines = useMemo(() => {
    return language === "es" ? TELEPROMPTER_LINES.es : TELEPROMPTER_LINES.en;
  }, [language]);

  const teleprompterText = teleprompterLines[teleprompterIndex] ?? "";

  useEffect(() => {
    return subscribeNavaiVoiceSnapshot((snapshot) => {
      setVoiceSnapshot(snapshot);
    });
  }, []);

  useEffect(() => {
    if (typeof onAgentSpeakingChange !== "function") {
      return;
    }

    return subscribeNavaiAgentSpeaking((isSpeaking) => {
      onAgentSpeakingChange(isSpeaking);
    });
  }, [onAgentSpeakingChange]);

  useEffect(() => {
    void syncNavaiVoiceSessionLanguage({
      languageCode: language,
      onNavigate: (path) => {
        router.push(path);
      },
    });
  }, [language, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let isMounted = true;
    let activeController: AbortController | null = null;

    const runConnectionCheck = async () => {
      if (!navigator.onLine) {
        if (isMounted) {
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

        if (isMounted) {
          updateNavaiVoiceSnapshot({ backendConnectionState: "ready" });
        }
      } catch {
        if (isMounted) {
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
      isMounted = false;
      activeController?.abort();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearTimeout(debounceId);
    };
  }, []);

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
    if (!isActive || teleprompterLines.length < 2) {
      setTeleprompterIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setTeleprompterIndex((current) => (current + 1) % teleprompterLines.length);
    }, TELEPROMPTER_ROTATION_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isActive, teleprompterLines]);

  const handleVoice = useCallback(async () => {
    await toggleNavaiVoiceSession({
      apiKey: "",
      micMessages: messages.mic,
      languageCode: language,
      onNavigate: (path) => {
        router.push(path);
      },
    });
  }, [language, messages.mic, router]);

  return (
    <div className={voiceClassName}>
      {showVoiceButton ? (
        <div className="navai-mic-stack">
          {isActive && teleprompterText ? (
            <div className="navai-teleprompter">
              <p key={`teleprompter-${teleprompterIndex}`} className="navai-teleprompter-line">
                {teleprompterText}
              </p>
            </div>
          ) : null}

          <div
            className={[
              "navai-mic-shell",
              canStartVoice ? "is-ready" : "",
              isActive ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <button
              type="button"
              className={buttonClassName}
              onClick={handleVoice}
              disabled={isDisabled}
              aria-label={isConnected ? messages.mic.ariaStop : messages.mic.ariaStart}
            >
              <Mic size={30} className={isActive ? "pulse" : undefined} />
            </button>
          </div>
        </div>
      ) : null}

      {effectiveStatusMessage ? (
        <p className={statusClassName}>
          {effectiveStatusMessage}
        </p>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {ariaMessage}
      </span>
    </div>
  );
}
