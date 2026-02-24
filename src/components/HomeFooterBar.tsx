'use client';

import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { useI18n } from "@/i18n/provider";

export default function HomeFooterBar() {
  const { messages } = useI18n();

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
      <div className="home-footer-controls">
        <LanguageSwitcher compact selectId="home-lang-select" />
        <ThemeSwitcher />
      </div>
    </div>
  );
}
