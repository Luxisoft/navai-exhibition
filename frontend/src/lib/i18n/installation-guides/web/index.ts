import type {
  InstallationGuideContent,
  LanguageCode,
} from "@/lib/i18n/messages";

import {
  buildInstallationGuide,
  type InstallationGuideTabsSectionLocale,
} from "../helpers";
import { getWebAngularGuideTab } from "./installation-guide-angular";
import { getWebAstroGuideTab } from "./installation-guide-astro";
import { getWebReactjsGuideTab } from "./installation-guide-reactjs";
import { getWebSolidjsGuideTab } from "./installation-guide-solidjs";
import { getWebSvelteGuideTab } from "./installation-guide-svelte";
import { getWebVuejsGuideTab } from "./installation-guide-vuejs";

const WEB_INSTALLATION_GUIDE_TABS_SECTION: Partial<
  Record<LanguageCode, InstallationGuideTabsSectionLocale>
> = {
  en: {
    id: "choose-web-stack",
    title: "Choose your web stack",
    description: "",
    bullets: [],
  },
  fr: {
    id: "choose-web-stack",
    title: "Choisir la stack web",
    description: "",
    bullets: [],
  },
  es: {
    id: "choose-web-stack",
    title: "Elegir stack web",
    description: "",
    bullets: [],
  },
  pt: {
    id: "choose-web-stack",
    title: "Escolher stack web",
    description: "",
    bullets: [],
  },
  zh: {
    id: "choose-web-stack",
    title: "选择 Web 技术栈",
    description: "",
    bullets: [],
  },
  ja: {
    id: "choose-web-stack",
    title: "Webスタックを選択",
    description: "",
    bullets: [],
  },
  ru: {
    id: "choose-web-stack",
    title: "Выберите web-стек",
    description: "",
    bullets: [],
  },
  ko: {
    id: "choose-web-stack",
    title: "Web 스택 선택",
    description: "",
    bullets: [],
  },
  hi: {
    id: "choose-web-stack",
    title: "वेब स्टैक चुनें",
    description: "",
    bullets: [],
  },
};

export function getLocalizedWebInstallationGuide(
  language: LanguageCode,
): InstallationGuideContent {
  return buildInstallationGuide(WEB_INSTALLATION_GUIDE_TABS_SECTION, language, [
    getWebReactjsGuideTab(language),
    getWebAstroGuideTab(language),
    getWebVuejsGuideTab(language),
    getWebSvelteGuideTab(language),
    getWebSolidjsGuideTab(language),
    getWebAngularGuideTab(language),
  ]);
}
