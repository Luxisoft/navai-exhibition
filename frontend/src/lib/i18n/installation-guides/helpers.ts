import type {
  InstallationGuideContent,
  InstallationGuideSection,
  InstallationGuideTab,
  LanguageCode,
} from "@/lib/i18n/messages";

export type InstallationGuideTabsSectionLocale = Omit<
  InstallationGuideContent["tabsSection"],
  "tabs"
>;

function isMergeableInstallationSectionId(id: string, step: number) {
  return id.startsWith(`paso-${step}-`);
}

function splitInstallationStepTitle(title: string) {
  const wordFirstMatch = title.match(/^(\S+)\s+(\d+)\s+(.+)$/u);

  if (wordFirstMatch) {
    return {
      stepWord: wordFirstMatch[1],
      stepNumber: Number(wordFirstMatch[2]),
      text: wordFirstMatch[3].trim(),
      numberFirst: false,
      numberWordSeparator: " ",
    };
  }

  const numberFirstMatch = title.match(/^(\d+)(\s*)(\S+)\s+(.+)$/u);

  if (!numberFirstMatch) {
    return null;
  }

  return {
    stepWord: numberFirstMatch[3],
    stepNumber: Number(numberFirstMatch[1]),
    text: numberFirstMatch[4].trim(),
    numberFirst: true,
    numberWordSeparator: numberFirstMatch[2],
  };
}

function withInstallationStepNumber(title: string, nextNumber: number) {
  const parts = splitInstallationStepTitle(title);

  if (!parts) {
    return title;
  }

  if (parts.numberFirst) {
    return `${nextNumber}${parts.numberWordSeparator}${parts.stepWord} ${parts.text}`;
  }

  return `${parts.stepWord} ${nextNumber} ${parts.text}`;
}

function mergeInstallationSectionText(
  sections: InstallationGuideSection[],
  key: "description",
) {
  return sections
    .map((section) => section[key].trim())
    .filter(Boolean)
    .join(" ");
}

function mergeInstallationSectionBullets(sections: InstallationGuideSection[]) {
  const bullets = sections.flatMap((section) => section.bullets ?? []);
  return bullets.length ? bullets : undefined;
}

function mergeInstallationSectionCodeBlocks(
  sections: InstallationGuideSection[],
) {
  const codeBlocks = sections.flatMap((section) => section.codeBlocks ?? []);
  return codeBlocks.length ? codeBlocks : undefined;
}

function mergeInstallationSectionActions(sections: InstallationGuideSection[]) {
  const actions = sections.flatMap((section) => section.actions ?? []);
  return actions.length ? actions : undefined;
}

function mergeInitialInstallationSections(
  sections: InstallationGuideSection[],
): InstallationGuideSection[] {
  if (
    sections.length < 3 ||
    !isMergeableInstallationSectionId(sections[0]?.id ?? "", 1) ||
    !isMergeableInstallationSectionId(sections[1]?.id ?? "", 2) ||
    !isMergeableInstallationSectionId(sections[2]?.id ?? "", 3)
  ) {
    return sections;
  }

  const initialSections = sections.slice(0, 3);
  const firstTitleParts = splitInstallationStepTitle(initialSections[0].title);
  const mergedTexts = initialSections
    .map(
      (section) =>
        splitInstallationStepTitle(section.title)?.text ??
        section.title.trim(),
    )
    .filter(Boolean);
  const mergedTitleText = mergedTexts.join(" / ");

  const mergedFirstSection: InstallationGuideSection = {
    ...initialSections[0],
    title: firstTitleParts
      ? firstTitleParts.numberFirst
        ? `1${firstTitleParts.numberWordSeparator}${firstTitleParts.stepWord} ${mergedTitleText}`
        : `${firstTitleParts.stepWord} 1 ${mergedTitleText}`
      : initialSections[0].title,
    description: mergeInstallationSectionText(initialSections, "description"),
    bullets: mergeInstallationSectionBullets(initialSections),
    codeBlocks: mergeInstallationSectionCodeBlocks(initialSections),
    actions: mergeInstallationSectionActions(initialSections),
  };

  const remainingSections = sections.slice(3).map((section, index) => ({
    ...section,
    title: withInstallationStepNumber(section.title, index + 2),
  }));

  return [mergedFirstSection, ...remainingSections];
}

function normalizeInstallationGuideTab(
  tab: InstallationGuideTab,
): InstallationGuideTab {
  return {
    ...tab,
    sections: mergeInitialInstallationSections(tab.sections),
  };
}

function getFirstLocalizedInstallationGuideValue<T>(
  values: Partial<Record<LanguageCode, T>>,
): T {
  const firstValue = Object.values(values)[0];

  if (!firstValue) {
    throw new Error("Missing installation guide localization.");
  }

  return firstValue;
}

export function getLocalizedInstallationGuideValue<T>(
  values: Partial<Record<LanguageCode, T>>,
  language: LanguageCode,
  fallbackLanguage: LanguageCode = "en",
): T {
  return (
    values[language] ??
    values[fallbackLanguage] ??
    getFirstLocalizedInstallationGuideValue(values)
  );
}

export function getLocalizedInstallationGuideTab(
  tabsByLanguage: Partial<Record<LanguageCode, InstallationGuideTab>>,
  language: LanguageCode,
  fallbackLanguage: LanguageCode = "en",
): InstallationGuideTab {
  return getLocalizedInstallationGuideValue(
    tabsByLanguage,
    language,
    fallbackLanguage,
  );
}

export function buildInstallationGuide(
  tabsSectionByLanguage: Partial<
    Record<LanguageCode, InstallationGuideTabsSectionLocale>
  >,
  language: LanguageCode,
  tabs: InstallationGuideTab[],
  fallbackLanguage: LanguageCode = "en",
): InstallationGuideContent {
  const tabsSection = getLocalizedInstallationGuideValue(
    tabsSectionByLanguage,
    language,
    fallbackLanguage,
  );
  const normalizedTabs = tabs.map(normalizeInstallationGuideTab);

  return {
    sections: normalizedTabs[0]?.sections ?? [],
    tabsSection: {
      ...tabsSection,
      tabs: normalizedTabs,
    },
  };
}
