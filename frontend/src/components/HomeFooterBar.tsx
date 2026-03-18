'use client';

import { HomeFooterControlsSkeleton } from "@/components/AppShellSkeletons";
import FirebaseGoogleAuthButton from "@/components/FirebaseGoogleAuthButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PwaInstallButton from "@/components/PwaInstallButton";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/theme/provider";

export default function HomeFooterBar() {
  const { messages } = useI18n();
  const { isInitializing } = useFirebaseAuth();
  const { isReady } = useTheme();
  const showControlsSkeleton = isInitializing || !isReady;

  return (
    <div className="home-footer-bar">
      <a
        className="home-byline"
        href="https://luxisoft.com/en/"
        target="_blank"
        rel="noopener noreferrer"
      >
        {messages.common.byLuxisoft}
      </a>
      {showControlsSkeleton ? (
        <HomeFooterControlsSkeleton />
      ) : (
        <div className="home-footer-controls">
          <FirebaseGoogleAuthButton compact />
          <PwaInstallButton compact />
          <LanguageSwitcher compact selectId="home-lang-select" />
          <ThemeSwitcher />
        </div>
      )}
    </div>
  );
}
