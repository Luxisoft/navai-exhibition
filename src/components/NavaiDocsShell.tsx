'use client';

import Image from "next/image";
import Link from "next/link";
import { Github, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import DocsSidebarAccordion from "@/components/DocsSidebarAccordion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { getLocalizedNavaiDocs } from "@/i18n/docs-catalog";
import { useI18n } from "@/i18n/provider";

type NavaiDocSlug =
  | "home"
  | "installation-api"
  | "installation-web"
  | "installation-mobile"
  | "playground-api"
  | "playground-web"
  | "playground-mobile"
  | "playground-stores"
  | "voice-backend"
  | "voice-frontend"
  | "voice-mobile";

type NavaiDocGroupKey = "home" | "installation" | "demo" | "examples" | "libraries";

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
  homeItem?: { slug: NavaiDocSlug; title: string };
  groups: Array<{ groupKey: NavaiDocGroupKey; items: Array<{ slug: NavaiDocSlug; title: string }> }>;
  hideMainHeader?: boolean;
  sourceHref?: string;
  sourceLabel?: string;
  rightTitle?: string;
  rightItems: RightItem[];
  children: ReactNode;
};

function isDocGroupKey(value: string): value is NavaiDocGroupKey {
  return value === "home" || value === "installation" || value === "demo" || value === "examples" || value === "libraries";
}

export default function NavaiDocsShell({
  activeSlug,
  badge,
  title,
  description,
  homeItem,
  groups,
  hideMainHeader = false,
  sourceHref,
  sourceLabel,
  rightTitle,
  rightItems,
  children,
}: NavaiDocsShellProps) {
  const { language, messages } = useI18n();
  const localizedDocs = useMemo(() => getLocalizedNavaiDocs(language), [language]);
  const [resolvedRightItems, setResolvedRightItems] = useState<RightItem[]>(rightItems);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const rightItemsSignature = useMemo(
    () => rightItems.map((item) => `${item.href}|${item.depth ?? 2}|${item.label}`).join("||"),
    [rightItems]
  );

  const secondaryGroups = groups.filter((group) => group.groupKey !== "home");

  const displayTitle = activeSlug ? (localizedDocs.entries[activeSlug]?.title ?? title) : title;
  const displayDescription = activeSlug ? (localizedDocs.entries[activeSlug]?.summary ?? description) : description;

  const displayBadge = isDocGroupKey(badge) ? (localizedDocs.groupLabels[badge] ?? badge) : badge;
  const resolvedSourceLabel = sourceLabel ?? messages.common.docsOpenReadmeGithub;
  const resolvedRightTitle = rightTitle ?? messages.common.docsOnThisPage;

  useEffect(() => {
    setResolvedRightItems(rightItems);
  }, [rightItems]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      const headingElements = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".docs-main .docs-markdown-body h2[id], .docs-main .docs-markdown-body h3[id]"
        )
      );

      if (headingElements.length === 0) {
        return;
      }

      const nextItems = headingElements.map((heading) => {
        const label = heading.textContent?.trim() || heading.id;
        const depth = heading.tagName === "H3" ? 3 : 2;
        return {
          href: `#${heading.id}`,
          label,
          depth: depth as 2 | 3,
        };
      });

      setResolvedRightItems((currentItems) => {
        const hasChanges =
          nextItems.length !== currentItems.length ||
          nextItems.some(
            (item, index) =>
              item.href !== currentItems[index]?.href ||
              item.label !== currentItems[index]?.label ||
              item.depth !== currentItems[index]?.depth
          );

        return hasChanges ? nextItems : currentItems;
      });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [activeSlug, language, rightItemsSignature]);

  return (
    <section className="docs-layout">
      <header className="docs-topbar">
        <div className="docs-topbar-left">
          <Link href="/" className="docs-brand" aria-label={messages.common.homeLinkAria}>
            <Image src="/navai_banner.png" alt={messages.common.bannerAlt} width={140} height={50} priority />
          </Link>

          <nav className="docs-top-tabs">
            <Link href="/documentation" className="docs-top-tab is-active">
              {messages.common.documentation}
            </Link>
            <Link href="/request-implementation" className="docs-top-tab">
              {messages.common.requestImplementation}
            </Link>
          </nav>
        </div>

        <div className="docs-topbar-actions">
          <button
            type="button"
            className="docs-mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-expanded={isMobileMenuOpen}
            aria-label={messages.common.docsNavigation}
            title={messages.common.docsNavigation}
          >
            {isMobileMenuOpen ? (
              <X className="docs-source-icon" aria-hidden="true" />
            ) : (
              <Menu className="docs-source-icon" aria-hidden="true" />
            )}
          </button>

          <a
            href="https://github.com/Luxisoft/navai"
            target="_blank"
            rel="noreferrer noopener"
            className="docs-source-btn"
            aria-label={messages.common.githubRepository}
            title={messages.common.githubRepository}
          >
            <Github className="docs-source-icon" aria-hidden="true" />
          </a>
          <div className="docs-topbar-controls">
            <LanguageSwitcher compact selectId="docs-lang-select" />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className={`docs-mobile-menu${isMobileMenuOpen ? " is-open" : ""}`}>
        <nav className="docs-top-tabs docs-mobile-top-tabs">
          <Link href="/documentation" className="docs-top-tab is-active" onClick={() => setIsMobileMenuOpen(false)}>
            {messages.common.documentation}
          </Link>
          <Link
            href="/request-implementation"
            className="docs-top-tab"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {messages.common.requestImplementation}
          </Link>
        </nav>

        <DocsSidebarAccordion
          navTitle={messages.common.docsSidebarTitle}
          activeSlug={activeSlug}
          onNavigate={() => setIsMobileMenuOpen(false)}
          homeItem={
            homeItem
              ? {
                  slug: homeItem.slug,
                  title: localizedDocs.entries[homeItem.slug]?.title ?? homeItem.title,
                }
              : undefined
          }
          groups={secondaryGroups.map((group) => ({
            groupKey: group.groupKey,
            label: localizedDocs.groupLabels[group.groupKey] ?? group.groupKey,
            items: group.items.map((item) => ({
              slug: item.slug,
              title: localizedDocs.entries[item.slug]?.title ?? item.title,
            })),
          }))}
        />
      </div>

      <div className="docs-shell">
        <DocsSidebarAccordion
          navTitle={messages.common.docsSidebarTitle}
          activeSlug={activeSlug}
          homeItem={
            homeItem
              ? {
                  slug: homeItem.slug,
                  title: localizedDocs.entries[homeItem.slug]?.title ?? homeItem.title,
                }
              : undefined
          }
          groups={secondaryGroups.map((group) => ({
            groupKey: group.groupKey,
            label: localizedDocs.groupLabels[group.groupKey] ?? group.groupKey,
            items: group.items.map((item) => ({
              slug: item.slug,
              title: localizedDocs.entries[item.slug]?.title ?? item.title,
            })),
          }))}
        />

        <article className="docs-main">
          {!hideMainHeader ? (
            <header className="docs-header">
              <p className="docs-badge">{displayBadge}</p>
              <h1>{displayTitle}</h1>
              <p>{displayDescription}</p>
              {sourceHref ? (
                <a className="docs-inline-source" href={sourceHref} target="_blank" rel="noreferrer noopener">
                  {resolvedSourceLabel}
                </a>
              ) : null}
            </header>
          ) : null}

          <div className="docs-sections">{children}</div>
        </article>

        <aside className="docs-rightbar">
          <p className="docs-sidebar-title">{resolvedRightTitle}</p>
          <nav className="docs-toc">
            {resolvedRightItems.map((item) => (
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
