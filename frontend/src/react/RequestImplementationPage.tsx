import { useEffect } from "react";

import ImplementationContact from "@/components/ImplementationContact";
import KnowledgeTemplate from "@/components/KnowledgeTemplate";
import RequestImplementationCarousel from "@/components/RequestImplementationCarousel";
import { NAVAI_PANEL_HREF } from "@/lib/auth-redirect";
import { stripLeadingDecorativeText } from "@/lib/decorative-text";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { useRouter } from "@/platform/navigation";

import AppProvidersShell from "./AppProvidersShell";

const IMPLEMENTATION_SECTION_ORDER = [
  "what-you-get",
  "pricing-note",
  "process",
] as const;

type RequestImplementationShowcaseProps = {
  contactTitle: string;
  contactDescription: string;
  sections: Array<{
    id: string;
    title: string;
    description: string;
    bullets?: string[];
  }>;
};

function RequestImplementationShowcase({
  contactTitle,
  contactDescription,
  sections,
}: RequestImplementationShowcaseProps) {
  const hasSections = sections.length > 0;

  if (!hasSections) {
    return null;
  }

  return (
    <article className="impl-request-showcase">
      <section className="docs-section-block impl-request-actions-card">
        <div className="impl-request-actions-copy">
          <h2>{contactTitle}</h2>
          <p>{contactDescription}</p>
        </div>
        <ImplementationContact />
      </section>

      <RequestImplementationCarousel sections={sections} />
    </article>
  );
}

function RequestImplementationContent() {
  const { messages } = useI18n();
  const { isInitializing, user } = useFirebaseAuth();
  const router = useRouter();
  const displaySections = messages.implementationPage.sections.map((section) => ({
    ...section,
    title: stripLeadingDecorativeText(section.title),
    description: stripLeadingDecorativeText(section.description),
    bullets: section.bullets?.map((bullet) => stripLeadingDecorativeText(bullet)),
  }));
  const orderedSections = IMPLEMENTATION_SECTION_ORDER.map((sectionId) =>
    displaySections.find((section) => section.id === sectionId)
  ).filter((section): section is (typeof displaySections)[number] => Boolean(section));
  const contactTitle = stripLeadingDecorativeText(messages.implementationPage.contactSectionTitle);
  const contactDescription = stripLeadingDecorativeText(
    messages.implementationPage.contactSectionDescription
  );

  useEffect(() => {
    if (!isInitializing && user) {
      router.replace(NAVAI_PANEL_HREF);
    }
  }, [isInitializing, router, user]);

  if (!isInitializing && user) {
    return null;
  }

  return (
    <KnowledgeTemplate
      activeTopNav="request-implementation"
      title={messages.implementationPage.title}
      description={messages.implementationPage.description}
      sidebarTitle={messages.implementationPage.sidebarTitle}
      sections={orderedSections}
      sidebarPageLinks={[{ href: "/", label: messages.common.home }]}
      showRightSidebarSourceLink={false}
      customSectionsContent={
        <RequestImplementationShowcase
          contactTitle={contactTitle}
          contactDescription={contactDescription}
          sections={orderedSections}
        />
      }
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
