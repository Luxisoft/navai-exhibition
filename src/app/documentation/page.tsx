import Link from "next/link";

import NavaiDocsShell from "@/components/NavaiDocsShell";
import { getNavaiDocsGrouped } from "@/lib/navai-docs";

export default function DocumentacionPage() {
  const groupedDocs = getNavaiDocsGrouped();

  const quickLinks = groupedDocs.map((group) => ({
    href: `#${group.group.toLowerCase().replace(/\s+/g, "-")}`,
    label: group.group,
  }));

  return (
    <NavaiDocsShell
      badge="Documentacion Oficial"
      title="README organizados por modulo"
      description="La documentacion se estructura por README oficial (inicio, instalacion, demo y paquetes @navai) para evitar contenido mezclado en una sola pagina."
      rightTitle="Secciones"
      rightItems={quickLinks}
    >
      {groupedDocs.map((group) => (
        <section
          key={group.group}
          id={group.group.toLowerCase().replace(/\s+/g, "-")}
          className="docs-section-block"
        >
          <h2>{group.group}</h2>
          <div className="docs-readme-grid">
            {group.items.map((doc) => (
              <article key={doc.slug} className="docs-readme-card">
                <p className="docs-readme-card-title">{doc.title}</p>
                <p className="docs-readme-card-summary">{doc.summary}</p>
                <Link href={`/documentation/${doc.slug}`} className="docs-readme-card-link">
                  Abrir README
                </Link>
              </article>
            ))}
          </div>
        </section>
      ))}
    </NavaiDocsShell>
  );
}
