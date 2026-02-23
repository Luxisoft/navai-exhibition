import { notFound } from "next/navigation";

import NavaiDocMarkdown from "@/components/NavaiDocMarkdown";
import NavaiDocsShell from "@/components/NavaiDocsShell";
import { NAVAI_DOCS, getNavaiDocPageBySlug, getNavaiDocSourceUrl } from "@/lib/navai-docs";

type DocPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return NAVAI_DOCS.map((doc) => ({ slug: doc.slug }));
}

export default async function DocumentacionDetallePage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = await getNavaiDocPageBySlug(slug);

  if (!doc) {
    notFound();
  }

  return (
    <NavaiDocsShell
      activeSlug={doc.slug}
      badge={doc.group}
      title={doc.title}
      description={doc.summary}
      sourceHref={getNavaiDocSourceUrl(doc.sourcePath)}
      sourceLabel="Abrir README en GitHub"
      rightTitle="En esta pagina"
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

