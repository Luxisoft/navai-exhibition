import en from "@/i18n/locales/en.json";
import es from "@/i18n/locales/es.json";
import fr from "@/i18n/locales/fr.json";
import hi from "@/i18n/locales/hi.json";
import ja from "@/i18n/locales/ja.json";
import ko from "@/i18n/locales/ko.json";
import pt from "@/i18n/locales/pt.json";
import ru from "@/i18n/locales/ru.json";
import zh from "@/i18n/locales/zh.json";

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

export const APP_MESSAGES: Record<LanguageCode, AppMessages> = {
  en: en as AppMessages,
  es: es as AppMessages,
  fr: fr as AppMessages,
  pt: pt as AppMessages,
  zh: zh as AppMessages,
  ja: ja as AppMessages,
  ru: ru as AppMessages,
  ko: ko as AppMessages,
  hi: hi as AppMessages,
};
