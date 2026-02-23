import Image from "next/image";
import Link from "next/link";
import { Github } from "lucide-react";
import type { ReactNode } from "react";

import DocsSidebarAccordion from "@/components/DocsSidebarAccordion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { getNavaiDocsGrouped, type NavaiDocSlug } from "@/lib/navai-docs";

type RightItem = {
  href: string;
  label: string;
  depth?: 2 | 3;
};

type NavaiDocsShellProps = {
  activeSlug?: NavaiDocSlug;
  badge: string;
  title: string;
  description: string;
  sourceHref?: string;
  sourceLabel?: string;
  rightTitle: string;
  rightItems: RightItem[];
  children: ReactNode;
};

export default function NavaiDocsShell({
  activeSlug,
  badge,
  title,
  description,
  sourceHref,
  sourceLabel = "Ver README original",
  rightTitle,
  rightItems,
  children,
}: NavaiDocsShellProps) {
  const groupedDocs = getNavaiDocsGrouped();
  const homeGroup = groupedDocs.find((group) => group.group === "Inicio");
  const homeItem = homeGroup?.items[0];
  const secondaryGroups = groupedDocs.filter((group) => group.group !== "Inicio");

  return (
    <section className="docs-layout">
      <header className="docs-topbar">
        <div className="docs-topbar-left">
          <Link href="/" className="docs-brand" aria-label="Navai Home">
            <Image src="/navai_banner.png" alt="Navai" width={140} height={50} priority />
          </Link>

          <nav className="docs-top-tabs">
            <Link href="/documentation" className="docs-top-tab is-active">
              Documentacion
            </Link>
            <Link href="/request-implementation" className="docs-top-tab">
              Pedir implementacion
            </Link>
          </nav>
        </div>

        <div className="docs-topbar-actions">
          <a
            href="https://github.com/Luxisoft/navai"
            target="_blank"
            rel="noreferrer noopener"
            className="docs-source-btn"
            aria-label="GitHub repository"
            title="GitHub repository"
          >
            <Github className="docs-source-icon" aria-hidden="true" />
          </a>
          <div className="docs-topbar-controls">
            <LanguageSwitcher compact selectId="docs-lang-select" />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className="docs-shell">
        <DocsSidebarAccordion
          activeSlug={activeSlug}
          homeItem={homeItem ? { slug: homeItem.slug, title: homeItem.title } : undefined}
          groups={secondaryGroups.map((group) => ({
            group: group.group,
            items: group.items.map((item) => ({ slug: item.slug, title: item.title })),
          }))}
        />

        <article className="docs-main">
          <header className="docs-header">
            <p className="docs-badge">{badge}</p>
            <h1>{title}</h1>
            <p>{description}</p>
            {sourceHref ? (
              <a className="docs-inline-source" href={sourceHref} target="_blank" rel="noreferrer noopener">
                {sourceLabel}
              </a>
            ) : null}
          </header>

          <div className="docs-sections">{children}</div>
        </article>

        <aside className="docs-rightbar">
          <p className="docs-sidebar-title">{rightTitle}</p>
          <nav className="docs-toc">
            {rightItems.map((item) => (
              <a
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`docs-toc-link${item.depth === 3 ? " is-subitem" : ""}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </section>
  );
}
