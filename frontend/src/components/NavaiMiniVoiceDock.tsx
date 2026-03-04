'use client';

import { Mic } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import dynamic from "@/platform/dynamic";
import { useI18n } from "@/i18n/provider";
import { buildBackendApiUrl } from "@/lib/backend-api";
import {
  getNavaiVoiceSnapshot,
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

type NavaiMiniVoiceDockProps = {
  className?: string;
};

export default function NavaiMiniVoiceDock({ className = "" }: NavaiMiniVoiceDockProps) {
  const { language, messages } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [voiceSnapshot, setVoiceSnapshot] = useState(getNavaiVoiceSnapshot);

  const {
    backendConnectionState,
    state,
    ariaMessage,
    statusMessage,
    isAgentSpeaking,
  } = voiceSnapshot;

  const isConnected = state === "connected";
  const isActive = state === "connecting" || state === "connected";
  const shouldAnimateOrb = true;
  const shouldHighlightOrb = isAgentSpeaking || isActive;
  const orbHoverIntensity = isAgentSpeaking ? 0.66 : 0.08;
  const canStartVoice = backendConnectionState === "ready";
  const isDisabled = state === "connecting" || (!isConnected && !canStartVoice);
  const missingBackendKeyMessage = useMemo(() => {
    return statusMessage === messages.mic.missingKey ? statusMessage : "";
  }, [messages.mic.missingKey, statusMessage]);

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

    let isEffectMounted = true;
    let activeController: AbortController | null = null;

    const runConnectionCheck = async () => {
      if (!navigator.onLine) {
        if (isEffectMounted) {
          updateNavaiVoiceSnapshot({
            backendConnectionState: "offline",
            statusMessage: "",
          });
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
        const capabilitiesPayload = (await capabilitiesResponse.json()) as {
          hasBackendApiKey?: boolean;
        };

        const functionsResponse = await fetch(buildBackendApiUrl("/navai/functions"), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!functionsResponse.ok) {
          throw new Error(`functions_${functionsResponse.status}`);
        }

        if (!capabilitiesPayload?.hasBackendApiKey) {
          if (isEffectMounted) {
            updateNavaiVoiceSnapshot({
              backendConnectionState: "unreachable",
              statusMessage: messages.mic.missingKey,
              ariaMessage: messages.mic.missingKey,
            });
          }
          return;
        }

        if (isEffectMounted) {
          updateNavaiVoiceSnapshot({
            backendConnectionState: "ready",
            statusMessage: "",
          });
        }
      } catch {
        if (isEffectMounted) {
          updateNavaiVoiceSnapshot({
            backendConnectionState: navigator.onLine ? "unreachable" : "offline",
            statusMessage: "",
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
      updateNavaiVoiceSnapshot({
        backendConnectionState: "offline",
        statusMessage: "",
      });
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
  }, [isMounted, messages.mic.missingKey]);

  const handleVoice = useCallback(async () => {
    if (state === "connecting") {
      stopNavaiVoiceSession(messages.mic.stopped);
      return;
    }

    await toggleNavaiVoiceSession({
      apiKey: "",
      micMessages: messages.mic,
      languageCode: language,
      onNavigate: (path) => {
        router.push(path);
      },
    });
  }, [language, messages.mic, router, state]);

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

      {missingBackendKeyMessage ? (
        <p className="navai-mini-status" role="status">
          {missingBackendKeyMessage}
        </p>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {ariaMessage}
      </span>
    </aside>
  );
}
