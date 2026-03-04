import ImplementationContact from "@/components/ImplementationContact";
import KnowledgeTemplate from "@/components/KnowledgeTemplate";
import { useI18n } from "@/i18n/provider";

import AppProvidersShell from "./AppProvidersShell";

function RequestImplementationContent() {
  const { messages } = useI18n();

  return (
    <KnowledgeTemplate
      activeTopNav="request-implementation"
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

export default function RequestImplementationPage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <RequestImplementationContent />
    </AppProvidersShell>
  );
}
