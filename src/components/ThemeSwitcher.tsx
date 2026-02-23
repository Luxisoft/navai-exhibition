'use client';

import { Moon, Sun } from "lucide-react";

import { useI18n } from "@/i18n/provider";
import { useTheme } from "@/theme/provider";

export default function ThemeSwitcher() {
  const { messages } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const isDarkTheme = theme === "dark";
  const nextThemeLabel = isDarkTheme ? messages.common.themeLight : messages.common.themeDark;
  const buttonLabel = `${messages.common.themeLabel}: ${nextThemeLabel}`;

  return (
    <div className="theme-switcher">
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={toggleTheme}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        {isDarkTheme ? <Sun className="theme-toggle-icon" /> : <Moon className="theme-toggle-icon" />}
      </button>
    </div>
  );
}
