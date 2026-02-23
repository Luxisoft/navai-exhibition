'use client';

import ImplementationContact from "@/components/ImplementationContact";
import KnowledgeTemplate from "@/components/KnowledgeTemplate";
import { useI18n } from "@/i18n/provider";

export default function PedirImplementacionPage() {
  const { messages } = useI18n();

  return (
    <KnowledgeTemplate
      badge={messages.implementationPage.badge}
      title={messages.implementationPage.title}
      description={messages.implementationPage.description}
      sidebarTitle={messages.implementationPage.sidebarTitle}
      sections={messages.implementationPage.sections}
      plansTitle={messages.implementationPage.plansTitle}
      plans={messages.implementationPage.plans}
      contactSectionId="contacto"
      contactSectionTitle={messages.implementationPage.contactSectionTitle}
      contactSectionDescription={messages.implementationPage.contactSectionDescription}
      contactForm={<ImplementationContact />}
      sourceLabel={messages.common.sourceRepository}
      sourceHref="https://github.com/Luxisoft/navai"
    />
  );
}
