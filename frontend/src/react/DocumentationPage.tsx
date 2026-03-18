import NavaiDocMarkdown from "@/components/NavaiDocMarkdown";
import NavaiDocsShell from "@/components/NavaiDocsShell";
import type { NavaiDocSlug } from "@/lib/i18n/messages";
import { isInteractiveInstallationGuideSlug } from "@/lib/installation-api-guide";
import { isInteractiveLegalGuideSlug } from "@/lib/legal-docs-guide";
import { isInteractiveLibrariesGuideSlug } from "@/lib/libraries-guide";

import AppProvidersShell from "./AppProvidersShell";

type DocSection = {
  id: string;
  title: string;
  depth: 2 | 3;
};

type NavaiDocPageModel = {
  slug: NavaiDocSlug;
  title: string;
  summary: string;
  groupKey: string;
  sourcePath: string;
  markdown: string;
  sections: DocSection[];
};

type DocsGroup = {
  groupKey: string;
  items: Array<{
    slug: string;
    title: string;
    children?: Array<{ slug: string; title: string }>;
  }>;
};

type DocumentationPageProps = {
  doc: NavaiDocPageModel;
  groupedDocs: DocsGroup[];
  sourceHref?: string;
};

export default function DocumentationPage({
  doc,
  groupedDocs,
  sourceHref,
}: DocumentationPageProps) {
  const homeItem = groupedDocs.find((group) => group.groupKey === "home")
    ?.items[0];
  const groups = groupedDocs.filter(
    (group) => group.groupKey !== "home" && group.groupKey !== "examples",
  );
  const hideDocHeaderBadge =
    isInteractiveInstallationGuideSlug(doc.slug) ||
    isInteractiveLibrariesGuideSlug(doc.slug);
  const hideDocHeaderSource =
    isInteractiveInstallationGuideSlug(doc.slug) ||
    isInteractiveLegalGuideSlug(doc.slug);

  return (
    <AppProvidersShell showMiniDock={true}>
      <NavaiDocsShell
        activeSlug={doc.slug}
        badge={hideDocHeaderBadge ? undefined : doc.groupKey}
        title={doc.title}
        description={doc.summary}
        homeItem={
          homeItem ? { slug: homeItem.slug, title: homeItem.title } : undefined
        }
        groups={groups.map((group) => ({
          groupKey: group.groupKey,
          items: group.items.map((item) => ({
            slug: item.slug,
            title: item.title,
          })),
        }))}
        hideMainHeader={doc.slug === "home"}
        sourceHref={hideDocHeaderSource ? undefined : sourceHref}
        rightItems={doc.sections.map((section) => ({
          href: `#${section.id}`,
          label: section.title,
          depth: section.depth,
        }))}
      >
        <NavaiDocMarkdown doc={doc} />
      </NavaiDocsShell>
    </AppProvidersShell>
  );
}
