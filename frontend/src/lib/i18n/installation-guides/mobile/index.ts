import type {
  InstallationGuideContent,
  LanguageCode,
} from "@/lib/i18n/messages";

import {
  buildInstallationGuide,
  type InstallationGuideTabsSectionLocale,
} from "../helpers";
import { getMobileExpoRouterGuideTab } from "./installation-guide-expo-router";

const MOBILE_INSTALLATION_GUIDE_TABS_SECTION: Partial<
  Record<LanguageCode, InstallationGuideTabsSectionLocale>
> = {
  es: {
    id: "elegir-stack-mobile",
    title: "Elegir stack mobile",
    description: "",
    bullets: [],
  },
  en: {
    id: "choose-your-mobile-stack",
    title: "Choose your mobile stack",
    description: "",
    bullets: [],
  },
  pt: {
    id: "escolher-stack-mobile",
    title: "Escolher stack mobile",
    description: "",
    bullets: [],
  },
  fr: {
    id: "choisir-stack-mobile",
    title: "Choisir la stack mobile",
    description: "",
    bullets: [],
  },
  hi: {
    id: "choose-mobile-stack-hi",
    title: "मोबाइल स्टैक चुनें",
    description: "",
    bullets: [],
  },
  ja: {
    id: "choose-mobile-stack-ja",
    title: "モバイルスタックを選択",
    description: "",
    bullets: [],
  },
  ko: {
    id: "choose-mobile-stack-ko",
    title: "모바일 스택 선택",
    description: "",
    bullets: [],
  },
  ru: {
    id: "choose-mobile-stack-ru",
    title: "Выберите мобильный стек",
    description: "",
    bullets: [],
  },
  zh: {
    id: "choose-mobile-stack-zh",
    title: "选择移动端技术栈",
    description: "",
    bullets: [],
  },
};

export function getLocalizedMobileInstallationGuide(
  language: LanguageCode,
): InstallationGuideContent {
  return buildInstallationGuide(
    MOBILE_INSTALLATION_GUIDE_TABS_SECTION,
    language,
    [
      getMobileExpoRouterGuideTab(language),
    ],
  );
}
