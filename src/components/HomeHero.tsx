'use client';

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import NavaiMicButton from "@/components/NavaiMicButton";
import Orb from "@/components/Orb";
import { useI18n } from "@/i18n/provider";
import { useTheme } from "@/theme/provider";

type HomeHeroProps = {
  hasBackendApiKey: boolean;
};

export default function HomeHero({ hasBackendApiKey }: HomeHeroProps) {
  const { messages } = useI18n();
  const { theme } = useTheme();
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [orbHue, setOrbHue] = useState(0);
  const hueDirectionRef = useRef<1 | -1>(1);

  const handleAgentSpeakingChange = useCallback((isSpeaking: boolean) => {
    setIsAgentSpeaking(isSpeaking);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setOrbHue((currentHue) => {
        const nextHue = currentHue + hueDirectionRef.current;

        if (nextHue >= 360) {
          hueDirectionRef.current = -1;
          return 360;
        }

        if (nextHue <= 0) {
          hueDirectionRef.current = 1;
          return 0;
        }

        return nextHue;
      });
    }, 66);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <div className="home-orb-layer">
        <Orb
          hoverIntensity={isAgentSpeaking ? 1.05 : 0.08}
          rotateOnHover
          hue={orbHue}
          forceHoverState={isAgentSpeaking}
          enablePointerHover={false}
          backgroundColor={theme === "light" ? "#f6f8ff" : "#000000"}
        />
      </div>

      <div className="home-content">
        <div className="home-brand">
          <Image src="/navai_banner.png" alt={messages.common.bannerAlt} width={250} height={89} priority />
        </div>

        <p>{messages.home.tagline}</p>

        <NavaiMicButton
          hasBackendApiKey={hasBackendApiKey}
          onAgentSpeakingChange={handleAgentSpeakingChange}
        />

        <div className="home-actions">
          <Link href="/documentation" className="home-btn home-btn-primary">
            {messages.home.documentationButton}
          </Link>
          <Link href="/request-implementation" className="home-btn home-btn-ghost">
            {messages.home.implementationButton}
          </Link>
        </div>
      </div>
    </>
  );
}
