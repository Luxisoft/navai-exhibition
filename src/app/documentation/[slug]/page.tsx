import { notFound } from "next/navigation";

import NavaiDocMarkdown from "@/components/NavaiDocMarkdown";
import NavaiDocsShell from "@/components/NavaiDocsShell";
import { NAVAI_DOCS, getNavaiDocPageBySlug, getNavaiDocSourceUrl, getNavaiDocsGrouped } from "@/lib/navai-docs";

type DocPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return NAVAI_DOCS.filter((doc) => doc.slug !== "playground-stores").map((doc) => ({ slug: doc.slug }));
}

export default async function DocumentacionDetallePage({ params }: DocPageProps) {
  const { slug } = await params;
  if (slug === "playground-stores") {
    notFound();
  }
  const doc = await getNavaiDocPageBySlug(slug);
  const groupedDocs = getNavaiDocsGrouped();
  const homeItem = groupedDocs.find((group) => group.groupKey === "home")?.items[0];
  const groups = groupedDocs.filter((group) => group.groupKey !== "home" && group.groupKey !== "examples");

  if (!doc) {
    notFound();
  }

  return (
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
      sourceHref={getNavaiDocSourceUrl(doc.sourcePath)}
      rightItems={doc.sections.map((section) => ({
        href: `#${section.id}`,
        label: section.title,
        depth: section.depth,
      }))}
    >
      <NavaiDocMarkdown doc={doc} />
    </NavaiDocsShell>
  );
}
