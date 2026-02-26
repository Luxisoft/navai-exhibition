'use client';

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/i18n/provider";
import { getLocalizedWordpressPage } from "@/i18n/wordpress-page";
import { useTheme } from "@/theme/provider";

type HomeHeroProps = {
  hasBackendApiKey: boolean;
};

const NavaiMicButton = dynamic(() => import("@/components/NavaiMicButton"), {
  ssr: false,
});

const Orb = dynamic(() => import("@/components/Orb"), {
  ssr: false,
});

export default function HomeHero({ hasBackendApiKey }: HomeHeroProps) {
  const { language, messages } = useI18n();
  const wordpressPage = getLocalizedWordpressPage(language);
  const { theme } = useTheme();
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
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

    const revealVoicePanel = () => setIsVoicePanelReady(true);
    if (typeof currentWindow.requestIdleCallback === "function") {
      const idleId = currentWindow.requestIdleCallback(revealVoicePanel, { timeout: 1800 });
      return () => currentWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(revealVoicePanel, 1200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <>
      <div className="home-orb-layer">
        <Orb
          hoverIntensity={isAgentSpeaking ? 1.05 : 0.08}
          rotateOnHover
          forceHoverState={isAgentSpeaking}
          enablePointerHover={false}
          backgroundColor={theme === "light" ? "#f6f8ff" : "#000000"}
        />
      </div>

      <div className="home-content">
        <div className="home-brand">
          <Image
            src="/navai_banner.webp"
            alt={messages.common.bannerAlt}
            width={250}
            height={89}
            quality={60}
            sizes="250px"
            fetchPriority="high"
            priority
          />
        </div>

        <p>{messages.home.tagline}</p>

        {isVoicePanelReady ? (
          <NavaiMicButton
            hasBackendApiKey={hasBackendApiKey}
            onAgentSpeakingChange={handleAgentSpeakingChange}
          />
        ) : (
          <div style={{ width: "min(92vw, 640px)", minHeight: "12rem" }} aria-hidden="true" />
        )}

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
