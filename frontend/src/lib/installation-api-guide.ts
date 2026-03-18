import type {
  AppMessages,
  InstallationGuideContent,
  LanguageCode,
} from "@/lib/i18n/messages";
import { DEFAULT_LANGUAGE } from "@/lib/i18n/messages";
import { getLocalizedInteractiveInstallationGuide } from "@/lib/i18n/installation-guides";

export type InteractiveInstallationGuideSlug =
  | "installation-api"
  | "installation-web"
  | "installation-mobile";

export type InstallationApiGuideTocSection = {
  id: string;
  title: string;
  depth: 2;
};

const INTERACTIVE_INSTALLATION_API_GUIDE_LANGUAGES = new Set<LanguageCode>([
  "en",
  "es",
  "fr",
  "pt",
  "zh",
  "ja",
  "ru",
  "ko",
  "hi",
]);

const BASE_INSTALLATION_GUIDES: Record<
  InteractiveInstallationGuideSlug,
  InstallationGuideContent
> = {
  "installation-api": getLocalizedInteractiveInstallationGuide(
    DEFAULT_LANGUAGE,
    "installation-api",
  ),
  "installation-web": getLocalizedInteractiveInstallationGuide(
    DEFAULT_LANGUAGE,
    "installation-web",
  ),
  "installation-mobile": getLocalizedInteractiveInstallationGuide(
    DEFAULT_LANGUAGE,
    "installation-mobile",
  ),
};

function cloneGuideList<T>(items: T[] | undefined, shouldKeep: boolean) {
  if (!shouldKeep || !items?.length) {
    return undefined;
  }
  return items.map((item) => item);
}

function alignGuideToBase(
  localizedGuide: InstallationGuideContent,
  baseGuide: InstallationGuideContent,
): InstallationGuideContent {
  const localizedTabs = localizedGuide.tabsSection.tabs;
  const baseTabs = baseGuide.tabsSection.tabs;

  const tabs = baseTabs.map((baseTab, index) => {
    const localizedTab = localizedTabs[index] ?? baseTab;

    return {
      ...localizedTab,
      title: baseTab.title.trim() ? localizedTab.title : "",
      description: baseTab.description.trim() ? localizedTab.description : "",
      bullets: cloneGuideList(
        localizedTab.bullets,
        Boolean(baseTab.bullets?.length),
      ),
      codeBlocks: cloneGuideList(
        localizedTab.codeBlocks,
        Boolean(baseTab.codeBlocks?.length),
      ),
      sections: baseTab.sections.map((baseSection, sectionIndex) => {
        const localizedSection =
          localizedTab.sections[sectionIndex] ?? baseSection;
        return {
          ...localizedSection,
          bullets: cloneGuideList(
            localizedSection.bullets,
            Boolean(baseSection.bullets?.length),
          ),
          codeBlocks: cloneGuideList(
            localizedSection.codeBlocks,
            Boolean(baseSection.codeBlocks?.length),
          ),
        };
      }),
    };
  });

  return {
    sections: tabs[0]?.sections ?? localizedGuide.sections,
    tabsSection: {
      ...localizedGuide.tabsSection,
      title: localizedGuide.tabsSection.title,
      description: baseGuide.tabsSection.description.trim()
        ? localizedGuide.tabsSection.description
        : "",
      bullets: cloneGuideList(
        localizedGuide.tabsSection.bullets,
        Boolean(baseGuide.tabsSection.bullets?.length),
      ),
      tabs,
    },
  };
}

export function isInteractiveInstallationGuideSlug(
  slug: string,
): slug is InteractiveInstallationGuideSlug {
  return (
    slug === "installation-api" ||
    slug === "installation-web" ||
    slug === "installation-mobile"
  );
}

export function getLocalizedInstallationGuide(
  _messages: AppMessages,
  slug: InteractiveInstallationGuideSlug,
  language: LanguageCode = DEFAULT_LANGUAGE,
): InstallationGuideContent {
  const localizedGuide = getLocalizedInteractiveInstallationGuide(
    language,
    slug,
  );

  return alignGuideToBase(localizedGuide, BASE_INSTALLATION_GUIDES[slug]);
}

export function getLocalizedInstallationApiGuide(
  messages: AppMessages,
  language: LanguageCode = DEFAULT_LANGUAGE,
): InstallationGuideContent {
  return getLocalizedInstallationGuide(messages, "installation-api", language);
}

export function supportsInteractiveInstallationGuide(language: LanguageCode) {
  return INTERACTIVE_INSTALLATION_API_GUIDE_LANGUAGES.has(language);
}

export function supportsInteractiveInstallationApiGuide(
  language: LanguageCode,
) {
  return supportsInteractiveInstallationGuide(language);
}

export function getInstallationApiGuideSections(
  guide: InstallationGuideContent,
): InstallationApiGuideTocSection[] {
  return [
    {
      id: guide.tabsSection.id,
      title: guide.tabsSection.title,
      depth: 2 as const,
    },
    ...guide.sections.map((section) => ({
      id: section.id,
      title: section.title,
      depth: 2 as const,
    })),
  ];
}

export function getInstallationGuideSections(
  guide: InstallationGuideContent,
): InstallationApiGuideTocSection[] {
  return getInstallationApiGuideSections(guide);
}

export function getDefaultInstallationGuide(
  slug: InteractiveInstallationGuideSlug,
) {
  return BASE_INSTALLATION_GUIDES[slug];
}
