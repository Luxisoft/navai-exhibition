import es from "@/i18n/locales/es.json";

export type LanguageCode = "en" | "fr" | "es" | "pt" | "zh" | "ja" | "ru" | "ko" | "hi";

export type LocalizedSection = {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
  code?: string;
};

export type LocalizedPlan = {
  name: string;
  menuRange: string;
  price: string;
  timeline: string;
  highlights: string[];
};

export type AppMessages = {
  common: {
    languageLabel: string;
    themeLabel: string;
    themeDark: string;
    themeLight: string;
    byLuxisoft: string;
    homeLinkAria: string;
    bannerAlt: string;
    githubRepository: string;
    docsNavigation: string;
    docsOnThisPage: string;
    docsOpenReadmeGithub: string;
    docsSidebarTitle: string;
    docsGroupHome: string;
    docsGroupInstallation: string;
    docsGroupDemo: string;
    docsGroupExamples: string;
    docsGroupLibraries: string;
    docsInstallApi: string;
    docsInstallWeb: string;
    docsInstallMobile: string;
    plansLabel: string;
    searchDocsAria: string;
    searchDocsPlaceholder: string;
    searchDocsEmpty: string;
    searchDocsSearching: string;
    searchDocsNoResults: string;
    searchDocsDocumentation: string;
    searchDocsImplementation: string;
    documentation: string;
    requestImplementation: string;
    sourceRepository: string;
    home: string;
  };
  home: {
    documentationButton: string;
    implementationButton: string;
    tagline: string;
  };
  mic: {
    apiKeyLabel: string;
    apiKeyPlaceholder: string;
    apiKeyNotice: string;
    apiKeyNoticeRepoLabel: string;
    ariaStart: string;
    ariaStop: string;
    connecting: string;
    active: string;
    activeDetail: string;
    stopped: string;
    missingKey: string;
    frontendKeyDisabled: string;
    clientSecretRejected: string;
    genericError: string;
  };
  docsPage: {
    badge: string;
    title: string;
    description: string;
    sidebarTitle: string;
    sections: LocalizedSection[];
  };
  implementationPage: {
    badge: string;
    title: string;
    description: string;
    sidebarTitle: string;
    sections: LocalizedSection[];
    plansTitle: string;
    plans: LocalizedPlan[];
    whatsappButtonLabel: string;
    whatsappPrefill: string;
    contactSectionTitle: string;
    contactSectionDescription: string;
    contactNameLabel: string;
    contactEmailLabel: string;
    contactCompanyLabel: string;
    contactWhatsappLabel: string;
    contactMessageLabel: string;
    contactNameRequiredMessage: string;
    contactEmailRequiredMessage: string;
    contactEmailInvalidMessage: string;
    contactMessageRequiredMessage: string;
    contactCaptchaRequiredMessage: string;
    contactCaptchaNotReadyMessage: string;
    contactCaptchaConfigMessage: string;
    contactCaptchaGenericErrorMessage: string;
    contactSendingLabel: string;
    contactSuccessMessage: string;
    contactErrorMessage: string;
    contactSubmitLabel: string;
    contactDisclaimer: string;
    ctaLabel: string;
    ctaHref: string;
  };
};

export const DEFAULT_LANGUAGE: LanguageCode = "es";

export const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ru", label: "Русский" },
  { code: "ko", label: "한국어" },
  { code: "hi", label: "हिन्दी" },
];

const DEFAULT_MESSAGES = es as AppMessages;

const APP_MESSAGES_CACHE: Partial<Record<LanguageCode, AppMessages>> = {
  es: DEFAULT_MESSAGES,
};

const APP_MESSAGES_LOADERS: Record<Exclude<LanguageCode, "es">, () => Promise<AppMessages>> = {
  en: async () => (await import("@/i18n/locales/en.json")).default as AppMessages,
  fr: async () => (await import("@/i18n/locales/fr.json")).default as AppMessages,
  pt: async () => (await import("@/i18n/locales/pt.json")).default as AppMessages,
  zh: async () => (await import("@/i18n/locales/zh.json")).default as AppMessages,
  ja: async () => (await import("@/i18n/locales/ja.json")).default as AppMessages,
  ru: async () => (await import("@/i18n/locales/ru.json")).default as AppMessages,
  ko: async () => (await import("@/i18n/locales/ko.json")).default as AppMessages,
  hi: async () => (await import("@/i18n/locales/hi.json")).default as AppMessages,
};

export function getCachedMessagesForLanguage(language: LanguageCode): AppMessages {
  return APP_MESSAGES_CACHE[language] ?? DEFAULT_MESSAGES;
}

export async function loadMessagesForLanguage(language: LanguageCode): Promise<AppMessages> {
  const cached = APP_MESSAGES_CACHE[language];
  if (cached) {
    return cached;
  }

  if (language === "es") {
    return DEFAULT_MESSAGES;
  }

  const loader = APP_MESSAGES_LOADERS[language];
  const messages = await loader();
  APP_MESSAGES_CACHE[language] = messages;
  return messages;
}
