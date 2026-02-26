'use client';

import KnowledgeTemplate from "@/components/KnowledgeTemplate";
import { useI18n } from "@/i18n/provider";
import { getLocalizedWordpressPage } from "@/i18n/wordpress-page";

const WORDPRESS_SOURCE_URL =
  "https://github.com/Luxisoft/navai/blob/wordpress-phase-1-guardrails/apps/wordpress-plugin/README.es.md";

export default function WordpressPage() {
  const { language, messages } = useI18n();
  const wordpressPage = getLocalizedWordpressPage(language);

  return (
    <KnowledgeTemplate
      badge={wordpressPage.badge}
      title={wordpressPage.title}
      description={wordpressPage.description}
      sidebarTitle={wordpressPage.sidebarTitle}
      sections={wordpressPage.sections}
      sourceLabel={messages.common.sourceRepository}
      sourceHref={WORDPRESS_SOURCE_URL}
    />
  );
}
