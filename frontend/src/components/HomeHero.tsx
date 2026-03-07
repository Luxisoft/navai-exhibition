'use client';

import { NavaiVoiceHeroOrb } from "@navai/voice-frontend";
import Link from "@/platform/link";
import Image from "@/platform/image";
import dynamic from "@/platform/dynamic";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/provider";
import bannerAvif1x from "@/assets/navai_banner.avif";
import bannerAvif15x from "@/assets/navai_banner@1_5x.avif";
import bannerWebp1x from "@/assets/navai_banner.webp";
import bannerWebp15x from "@/assets/navai_banner@1_5x.webp";
import { useNavaiVoiceOrbAgent } from "@/lib/navai-voice-orb";
import { useTheme } from "@/theme/provider";

const ORB_AUTOPLAY_DELAY_MS_DEFAULT = 9000;
const ORB_AUTOPLAY_DELAY_MS_MIN = 0;
const ORB_AUTOPLAY_DELAY_MS_MAX = 60000;
const ORB_REVEAL_DELAY_MS_DEFAULT = 5200;
const VOICE_PANEL_REVEAL_DELAY_MS_DEFAULT = 6500;

function parsePublicDelayMs(value: unknown, fallback: number) {
  const parsedValue = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }
  return Math.min(ORB_AUTOPLAY_DELAY_MS_MAX, Math.max(ORB_AUTOPLAY_DELAY_MS_MIN, parsedValue));
}

function resolveOrbAutoplayDelayMs() {
  return parsePublicDelayMs(import.meta.env.PUBLIC_ORB_AUTOPLAY_DELAY_MS, ORB_AUTOPLAY_DELAY_MS_DEFAULT);
}

const ORB_AUTOPLAY_DELAY_MS = resolveOrbAutoplayDelayMs();
const ORB_REVEAL_DELAY_MS = parsePublicDelayMs(import.meta.env.PUBLIC_ORB_REVEAL_DELAY_MS, ORB_REVEAL_DELAY_MS_DEFAULT);
const VOICE_PANEL_REVEAL_DELAY_MS = parsePublicDelayMs(
  import.meta.env.PUBLIC_VOICE_PANEL_REVEAL_DELAY_MS,
  VOICE_PANEL_REVEAL_DELAY_MS_DEFAULT
);
const VOICE_PANEL_READY_IMMEDIATELY = VOICE_PANEL_REVEAL_DELAY_MS === 0;
const bannerAvif1xSrc = resolveAssetSrc(bannerAvif1x);
const bannerAvif15xSrc = resolveAssetSrc(bannerAvif15x);
const bannerWebp1xSrc = resolveAssetSrc(bannerWebp1x);
const bannerWebp15xSrc = resolveAssetSrc(bannerWebp15x);

const NavaiMicButton = dynamic(() => import("@/components/NavaiMicButton"), {
  ssr: false,
});

export default function HomeHero() {
  const { messages } = useI18n();
  const { theme } = useTheme();
  const voiceOrbAgent = useNavaiVoiceOrbAgent();
  const [isVoicePanelReady, setIsVoicePanelReady] = useState(VOICE_PANEL_READY_IMMEDIATELY);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (VOICE_PANEL_READY_IMMEDIATELY) {
      return;
    }

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

    const timeoutId = window.setTimeout(revealVoicePanel, VOICE_PANEL_REVEAL_DELAY_MS);
    return () => {
      window.removeEventListener("pointerdown", onUserIntent);
      window.removeEventListener("touchstart", onUserIntent);
      window.removeEventListener("keydown", onUserIntent);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <>
      <div className="home-orb-layer">
        <div className="home-hero-orb-wrap">
          <NavaiVoiceHeroOrb
            agent={voiceOrbAgent}
            themeMode={theme}
            backgroundColorLight="#000000"
            revealDelayMs={ORB_REVEAL_DELAY_MS}
            autoplayDelayMs={ORB_AUTOPLAY_DELAY_MS}
          />
        </div>
      </div>

      <div className="home-voice-slot">
        {isVoicePanelReady ? (
          <NavaiMicButton />
        ) : (
          <div className="home-voice-placeholder" aria-hidden="true" />
        )}
      </div>

      <div className="home-content">
        <div className="home-brand">
          <picture>
            <source
              type="image/avif"
              srcSet={`${bannerAvif1xSrc} 250w, ${bannerAvif15xSrc} 375w`}
              sizes="250px"
            />
            <Image
              src={bannerWebp1xSrc}
              srcSet={`${bannerWebp1xSrc} 250w, ${bannerWebp15xSrc} 375w`}
              alt={messages.common.bannerAlt}
              width={250}
              height={89}
              sizes="250px"
              fetchPriority="high"
              priority
            />
          </picture>
        </div>

        <p>{messages.home.tagline}</p>

        <div className="home-actions">
          <Link href="/documentation/home" className="home-btn home-btn-primary">
            {messages.home.documentationButton}
          </Link>
          <Link href="/request-implementation" className="home-btn home-btn-ghost">
            {messages.home.implementationButton}
          </Link>
          <Link href="/wordpress" className="home-btn home-btn-ghost">
            {"Wordpress"}
          </Link>
        </div>
      </div>
    </>
  );
}

function resolveAssetSrc(asset: unknown) {
  if (typeof asset === "string") {
    return asset;
  }

  if (asset && typeof asset === "object" && "src" in asset) {
    const withSrc = asset as { src?: unknown };
    if (typeof withSrc.src === "string") {
      return withSrc.src;
    }
  }

  return "";
}
