'use client';

import type { ReactNode } from "react";

import { I18nProvider } from "@/i18n/provider";
import LanguageFontsLoader from "@/components/LanguageFontsLoader";
import { ThemeProvider } from "@/theme/provider";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <LanguageFontsLoader />
        {children}
      </ThemeProvider>
    </I18nProvider>
  );
}
