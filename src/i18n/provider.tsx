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

function detectLanguageFromBrowser(): LanguageCode {
  if (typeof navigator === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const browserLanguage = navigator.language.toLowerCase();
  const matched = LANGUAGE_OPTIONS.find((option) => browserLanguage.startsWith(option.code));
  return matched?.code ?? DEFAULT_LANGUAGE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LANGUAGE;
    }

    const storedValue = window.localStorage.getItem(I18N_STORAGE_KEY);
    if (isLanguageCode(storedValue)) {
      return storedValue;
    }

    return detectLanguageFromBrowser();
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(I18N_STORAGE_KEY, language);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
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
