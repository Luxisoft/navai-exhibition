import localizedMarkdownRaw from "@/content/navai-readmes/localized-markdown.json";
import voiceBackendMarkdownRaw from "@/content/navai-readmes/voice-backend.md?raw";
import voiceFrontendMarkdownRaw from "@/content/navai-readmes/voice-frontend.md?raw";
import voiceMobileMarkdownRaw from "@/content/navai-readmes/voice-mobile.md?raw";
import {
  stripLeadingDecorativeMarkdownText,
  stripLeadingDecorativeText,
} from "@/lib/decorative-text";
import { buildStableHeadingId, cleanHeadingText } from "@/lib/heading-id";
import type { AppMessages, LanguageCode } from "@/lib/i18n/messages";
import { DEFAULT_LANGUAGE } from "@/lib/i18n/messages";
import { normalizeMarkdownBlockFormatting } from "@/lib/markdown-normalization";

export type InteractiveLibrariesGuideSlug =
  | "voice-backend"
  | "voice-frontend"
  | "voice-mobile";

export type LibraryGuideSection = {
  id: string;
  title: string;
  bodyMarkdown: string;
};

export type LibrariesGuideTab = {
  value: InteractiveLibrariesGuideSlug;
  label: string;
  summary: string;
  href: string;
  sourcePath: string;
  sourceHref: string;
  introMarkdown: string;
  sections: LibraryGuideSection[];
};

export type LibrariesGuideContent = {
  title: string;
  description: string;
  currentTab: LibrariesGuideTab;
  tabs: LibrariesGuideTab[];
};

type LibraryGuideModel = {
  introMarkdown: string;
  sections: LibraryGuideSection[];
};

type LocalizedMarkdownMap = Partial<
  Record<
    InteractiveLibrariesGuideSlug,
    Partial<Record<Exclude<LanguageCode, "en">, string>>
  >
>;

const INTERACTIVE_LIBRARIES_GUIDE_LANGUAGES = new Set<LanguageCode>([
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

const LIBRARY_GUIDE_SLUGS: InteractiveLibrariesGuideSlug[] = [
  "voice-backend",
  "voice-frontend",
  "voice-mobile",
];

const LIBRARY_GUIDE_SOURCE_HREFS: Record<
  InteractiveLibrariesGuideSlug,
  string
> = {
  "voice-backend":
    "https://github.com/Luxisoft/navai/tree/main/packages/voice-backend",
  "voice-frontend":
    "https://github.com/Luxisoft/navai/tree/main/packages/voice-frontend",
  "voice-mobile":
    "https://github.com/Luxisoft/navai/tree/main/packages/voice-mobile",
};

const BASE_LIBRARY_MARKDOWN: Record<InteractiveLibrariesGuideSlug, string> = {
  "voice-backend": voiceBackendMarkdownRaw,
  "voice-frontend": voiceFrontendMarkdownRaw,
  "voice-mobile": voiceMobileMarkdownRaw,
};

const LIBRARY_GUIDE_SOURCE_PATHS: Record<
  InteractiveLibrariesGuideSlug,
  string
> = {
  "voice-backend": "packages/voice-backend/README.md",
  "voice-frontend": "packages/voice-frontend/README.md",
  "voice-mobile": "packages/voice-mobile/README.md",
};

const LOCALIZED_MARKDOWN = localizedMarkdownRaw as LocalizedMarkdownMap;

function buildLibrarySectionId(title: string, index: number) {
  return buildStableHeadingId({
    title,
    line: index + 1,
    column: 1,
  });
}

function normalizeLibraryMarkdown(markdown: string) {
  return stripLeadingDecorativeMarkdownText(
    normalizeMarkdownBlockFormatting(markdown),
  )
    .replace(/^\s*#\s+.+\n?/u, "")
    .replace(/^(?:\s*<p[\s\S]*?<\/p>\s*)+/u, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseLibraryGuide(markdown: string): LibraryGuideModel {
  const normalizedMarkdown = normalizeLibraryMarkdown(markdown);
  const sectionMatches = [...normalizedMarkdown.matchAll(/^##\s+(.+)$/gm)];

  if (sectionMatches.length === 0) {
    return {
      introMarkdown: normalizedMarkdown,
      sections: [],
    };
  }

  const introMarkdown = normalizedMarkdown
    .slice(0, sectionMatches[0]?.index ?? 0)
    .trim();

  const sections = sectionMatches.map((match, index) => {
    const rawTitle = match[1] ?? "";
    const title = stripLeadingDecorativeText(cleanHeadingText(rawTitle));
    const sectionStart = (match.index ?? 0) + match[0].length;
    const nextMatch = sectionMatches[index + 1];
    const sectionEnd = nextMatch?.index ?? normalizedMarkdown.length;
    const bodyMarkdown = normalizedMarkdown
      .slice(sectionStart, sectionEnd)
      .trim();

    return {
      id: buildLibrarySectionId(title, index),
      title,
      bodyMarkdown,
    };
  });

  return {
    introMarkdown,
    sections,
  };
}

function alignGuideToBase(
  localizedGuide: LibraryGuideModel,
  baseGuide: LibraryGuideModel,
): LibraryGuideModel {
  return {
    introMarkdown: localizedGuide.introMarkdown || baseGuide.introMarkdown,
    sections: baseGuide.sections.map((baseSection, index) => {
      const localizedSection = localizedGuide.sections[index] ?? baseSection;

      return {
        id: baseSection.id,
        title: localizedSection.title || baseSection.title,
        bodyMarkdown: localizedSection.bodyMarkdown || baseSection.bodyMarkdown,
      };
    }),
  };
}

const BASE_LIBRARY_GUIDES: Record<
  InteractiveLibrariesGuideSlug,
  LibraryGuideModel
> = {
  "voice-backend": parseLibraryGuide(BASE_LIBRARY_MARKDOWN["voice-backend"]),
  "voice-frontend": parseLibraryGuide(BASE_LIBRARY_MARKDOWN["voice-frontend"]),
  "voice-mobile": parseLibraryGuide(BASE_LIBRARY_MARKDOWN["voice-mobile"]),
};

export function isInteractiveLibrariesGuideSlug(
  slug: string,
): slug is InteractiveLibrariesGuideSlug {
  return (
    slug === "voice-backend" ||
    slug === "voice-frontend" ||
    slug === "voice-mobile"
  );
}

export function supportsInteractiveLibrariesGuide(language: LanguageCode) {
  return INTERACTIVE_LIBRARIES_GUIDE_LANGUAGES.has(language);
}

export function getLibrariesGuideSections(slug: InteractiveLibrariesGuideSlug) {
  return BASE_LIBRARY_GUIDES[slug].sections.map((section) => ({
    id: section.id,
    title: section.title,
    depth: 2 as const,
  }));
}

function getLocalizedLibraryGuide(
  slug: InteractiveLibrariesGuideSlug,
  language: LanguageCode,
) {
  const localizedMarkdown =
    language === DEFAULT_LANGUAGE
      ? LOCALIZED_MARKDOWN[slug]?.es
      : LOCALIZED_MARKDOWN[slug]?.[language as Exclude<LanguageCode, "en">];
  const baseGuide = BASE_LIBRARY_GUIDES[slug];

  if (!localizedMarkdown) {
    return baseGuide;
  }

  return alignGuideToBase(parseLibraryGuide(localizedMarkdown), baseGuide);
}

export function getLibraryGuideSourceHref(slug: InteractiveLibrariesGuideSlug) {
  return LIBRARY_GUIDE_SOURCE_HREFS[slug];
}

export function getLocalizedLibrariesGuide(
  messages: AppMessages,
  slug: InteractiveLibrariesGuideSlug,
  language: LanguageCode = DEFAULT_LANGUAGE,
): LibrariesGuideContent {
  const tabs = LIBRARY_GUIDE_SLUGS.map((value) => {
    const entry = messages.docsCatalog.entries[value];
    const guide = getLocalizedLibraryGuide(value, language);

    return {
      value,
      label: stripLeadingDecorativeText(entry?.title ?? value),
      summary: stripLeadingDecorativeText(entry?.summary ?? ""),
      href: `/documentation/${value}`,
      sourcePath: LIBRARY_GUIDE_SOURCE_PATHS[value],
      sourceHref: getLibraryGuideSourceHref(value),
      introMarkdown: guide.introMarkdown,
      sections: guide.sections,
    };
  });

  const currentTab = tabs.find((tab) => tab.value === slug) ?? tabs[0];

  return {
    title: stripLeadingDecorativeText(messages.common.docsGroupLibraries),
    description: currentTab.summary,
    currentTab,
    tabs,
  };
}
