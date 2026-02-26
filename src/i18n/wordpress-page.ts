import wordpressPageContentRaw from "@/i18n/wordpress-page-content.json";
import type { LanguageCode, LocalizedSection } from "@/i18n/messages";

export type LocalizedWordpressPage = {
  navigationLabel: string;
  badge: string;
  title: string;
  description: string;
  sidebarTitle: string;
  sections: LocalizedSection[];
};

const wordpressPageContent = wordpressPageContentRaw as Record<LanguageCode, LocalizedWordpressPage>;

export function getLocalizedWordpressPage(language: LanguageCode): LocalizedWordpressPage {
  return wordpressPageContent[language] ?? wordpressPageContent.en;
}
