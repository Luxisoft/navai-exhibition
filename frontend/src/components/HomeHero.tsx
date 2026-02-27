'use client';

import Link from "@/platform/link";
import Image from "@/platform/image";
import dynamic from "@/platform/dynamic";
import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/i18n/provider";
import { getLocalizedWordpressPage } from "@/i18n/wordpress-page";
import { useTheme } from "@/theme/provider";

const NavaiMicButton = dynamic(() => import("@/components/NavaiMicButton"), {
  ssr: false,
});

const Orb = dynamic(() => import("@/components/Orb"), {
  ssr: false,
});

export default function HomeHero() {
  const { language, messages } = useI18n();
  const wordpressPage = getLocalizedWordpressPage(language);
  const { theme } = useTheme();
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isOrbReady, setIsOrbReady] = useState(false);
  const [isVoicePanelReady, setIsVoicePanelReady] = useState(false);

  const handleAgentSpeakingChange = useCallback((isSpeaking: boolean) => {
    setIsAgentSpeaking(isSpeaking);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentWindow = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let revealed = false;
    const revealVoicePanel = () => {
      if (revealed) {
        return;
      }
      revealed = true;
      setIsVoicePanelReady(true);
    };

    const onUserIntent = () => {
      revealVoicePanel();
    };

    window.addEventListener("pointerdown", onUserIntent, { passive: true, once: true });
    window.addEventListener("touchstart", onUserIntent, { passive: true, once: true });
    window.addEventListener("keydown", onUserIntent, { once: true });

    let timeoutId: number | null = null;
    if (typeof currentWindow.requestIdleCallback === "function") {
      const idleId = currentWindow.requestIdleCallback(revealVoicePanel, { timeout: 4200 });
      return () => {
        window.removeEventListener("pointerdown", onUserIntent);
        window.removeEventListener("touchstart", onUserIntent);
        window.removeEventListener("keydown", onUserIntent);
        currentWindow.cancelIdleCallback?.(idleId);
      };
    }

    timeoutId = window.setTimeout(revealVoicePanel, 3200);
    return () => {
      window.removeEventListener("pointerdown", onUserIntent);
      window.removeEventListener("touchstart", onUserIntent);
      window.removeEventListener("keydown", onUserIntent);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentWindow = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const revealOrb = () => setIsOrbReady(true);

    if (typeof currentWindow.requestIdleCallback === "function") {
      const idleId = currentWindow.requestIdleCallback(revealOrb, { timeout: 2200 });
      return () => currentWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(revealOrb, 1400);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <>
      <div className="home-orb-layer">
        {isOrbReady ? (
          <Orb
            hoverIntensity={isAgentSpeaking ? 1.05 : 0.08}
            rotateOnHover
            forceHoverState={isAgentSpeaking}
            enablePointerHover={false}
            animate={isAgentSpeaking}
            backgroundColor={theme === "light" ? "#f6f8ff" : "#000000"}
          />
        ) : null}
      </div>

      <div className="home-content">
        <div className="home-brand">
          <Image
            src="/navai_banner.webp"
            srcSet="/navai_banner.webp 250w, /navai_banner@1_5x.webp 375w"
            alt={messages.common.bannerAlt}
            width={250}
            height={89}
            sizes="250px"
            fetchPriority="high"
            priority
          />
        </div>

        <p>{messages.home.tagline}</p>

        <div className="home-voice-slot">
          {isVoicePanelReady ? (
            <NavaiMicButton onAgentSpeakingChange={handleAgentSpeakingChange} />
          ) : (
            <div className="home-voice-placeholder" aria-hidden="true" />
          )}
        </div>

        <div className="home-actions">
          <Link href="/documentation/home" className="home-btn home-btn-primary">
            {messages.home.documentationButton}
          </Link>
          <Link href="/request-implementation" className="home-btn home-btn-ghost">
            {messages.home.implementationButton}
          </Link>
          <Link href="/wordpress" className="home-btn home-btn-ghost">
            {wordpressPage.navigationLabel}
          </Link>
        </div>
      </div>
    </>
  );
}

