'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  APP_MESSAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  type AppMessages,
  type LanguageCode,
} from "@/i18n/messages";

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  messages: AppMessages;
  options: Array<{ code: LanguageCode; label: string }>;
};

const I18N_STORAGE_KEY = "navai-language";

const I18nContext = createContext<I18nContextValue | null>(null);

function isLanguageCode(value: string | null): value is LanguageCode {
  if (!value) {
    return false;
  }
  return LANGUAGE_OPTIONS.some((option) => option.code === value);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedValue = window.localStorage.getItem(I18N_STORAGE_KEY);
    if (!isLanguageCode(storedValue)) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLanguageState((current) => (current === storedValue ? current : storedValue));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(I18N_STORAGE_KEY, language);
    }
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.lang = language;
      root.dataset.language = language;

      for (const option of LANGUAGE_OPTIONS) {
        root.classList.remove(`lang-${option.code}`);
      }
      root.classList.add(`lang-${language}`);
    }
  }, [language]);

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    return {
      language,
      setLanguage,
      messages: APP_MESSAGES[language],
      options: LANGUAGE_OPTIONS,
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }
  return context;
}
