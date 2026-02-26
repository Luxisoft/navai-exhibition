import NavaiDocMarkdown from "@/components/NavaiDocMarkdown";
import NavaiDocsShell from "@/components/NavaiDocsShell";

import AppProvidersShell from "./AppProvidersShell";

type DocSection = {
  id: string;
  title: string;
  depth: 2 | 3;
};

type NavaiDocPageModel = {
  slug: string;
  title: string;
  summary: string;
  groupKey: string;
  sourcePath: string;
  markdown: string;
  sections: DocSection[];
};

type DocsGroup = {
  groupKey: string;
  items: Array<{ slug: string; title: string; children?: Array<{ slug: string; title: string }> }>;
};

type DocumentationPageProps = {
  doc: NavaiDocPageModel;
  groupedDocs: DocsGroup[];
  sourceHref: string;
};

export default function DocumentationPage({
  doc,
  groupedDocs,
  sourceHref,
}: DocumentationPageProps) {
  const homeItem = groupedDocs.find((group) => group.groupKey === "home")?.items[0];
  const groups = groupedDocs.filter(
    (group) => group.groupKey !== "home" && group.groupKey !== "examples"
  );

  return (
    <AppProvidersShell>
      <NavaiDocsShell
        activeSlug={doc.slug}
        badge={doc.groupKey}
        title={doc.title}
        description={doc.summary}
        homeItem={homeItem ? { slug: homeItem.slug, title: homeItem.title } : undefined}
        groups={groups.map((group) => ({
          groupKey: group.groupKey,
          items: group.items.map((item) => ({ slug: item.slug, title: item.title })),
        }))}
        hideMainHeader={doc.slug === "home"}
        sourceHref={sourceHref}
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
