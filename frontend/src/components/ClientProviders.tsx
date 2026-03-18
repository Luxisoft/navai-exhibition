'use client';

import type { ReactNode } from "react";

import { I18nProvider } from "@/lib/i18n/provider";
import { NavaiPanelAccessProvider } from "@/lib/navai-panel-access";
import { FirebaseAuthProvider } from "@/lib/firebase-auth";
import LanguageFontsLoader from "@/components/LanguageFontsLoader";
import { ThemeProvider } from "@/theme/provider";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <FirebaseAuthProvider>
          <NavaiPanelAccessProvider>
            <LanguageFontsLoader />
            {children}
          </NavaiPanelAccessProvider>
        </FirebaseAuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
