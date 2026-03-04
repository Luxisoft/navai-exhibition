'use client';

import Image from "@/platform/image";
import Link from "@/platform/link";
import { normalizePathname } from "@/platform/navigation";
import { Github, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import DocsSidebarAccordion from "@/components/DocsSidebarAccordion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NavaiMiniVoiceDock from "@/components/NavaiMiniVoiceDock";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { getLocalizedNavaiDocs } from "@/i18n/docs-catalog";
import { useI18n } from "@/i18n/provider";
import { getLocalizedWordpressPage } from "@/i18n/wordpress-page";

type NavaiDocSlug =
  | "home"
  | "installation-api"
  | "installation-web"
  | "installation-mobile"
  | "installation-wordpress"
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

type DocsNavGroup = {
  groupKey: string;
  label?: string;
  items: Array<{ slug: string; title: string; children?: Array<{ slug: string; title: string }> }>;
};

type NavaiDocsShellProps = {
  activeSlug?: string;
  badge: string;
  title: string;
  description: string;
  homeItem?: { slug: string; title: string };
  groups: DocsNavGroup[];
  hideMainHeader?: boolean;
  sourceHref?: string;
  sourceLabel?: string;
  rightTitle?: string;
  sidebarNavTitle?: string;
  sidebarBasePath?: string;
  defaultExpandedGroupKey?: string;
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
  sidebarNavTitle,
  sidebarBasePath = "/documentation",
  defaultExpandedGroupKey,
  rightItems,
  children,
}: NavaiDocsShellProps) {
  const { language, messages } = useI18n();
  const localizedDocs = useMemo(() => getLocalizedNavaiDocs(language), [language]);
  const wordpressPage = useMemo(() => getLocalizedWordpressPage(language), [language]);
  const [resolvedRightItems, setResolvedRightItems] = useState<RightItem[]>(rightItems);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const rightItemsSignature = useMemo(
    () => rightItems.map((item) => `${item.href}|${item.depth ?? 2}|${item.label}`).join("||"),
    [rightItems]
  );

  const secondaryGroups = groups.filter((group) => group.groupKey !== "home" && group.groupKey !== "examples");
  const localizedDocEntry = activeSlug ? localizedDocs.entries[activeSlug as NavaiDocSlug] : undefined;
  const getLocalizedDocTitle = (slug: string, fallbackTitle: string) =>
    localizedDocs.entries[slug as NavaiDocSlug]?.title ?? fallbackTitle;
  const getLocalizedGroupLabel = (groupKey: string, fallbackLabel?: string) =>
    localizedDocs.groupLabels[groupKey as NavaiDocGroupKey] ?? fallbackLabel ?? groupKey;
  const localizeNavItem = (item: DocsNavGroup["items"][number]) => ({
    slug: item.slug,
    title: getLocalizedDocTitle(item.slug, item.title),
    children: item.children?.map((child) => ({
      slug: child.slug,
      title: getLocalizedDocTitle(child.slug, child.title),
    })),
  });

  const displayTitle = activeSlug ? (localizedDocEntry?.title ?? title) : title;
  const displayDescription = activeSlug ? (localizedDocEntry?.summary ?? description) : description;

  const displayBadge = isDocGroupKey(badge) ? (localizedDocs.groupLabels[badge] ?? badge) : badge;
  const resolvedSourceLabel = sourceLabel ?? messages.common.docsOpenReadmeGithub;
  const resolvedRightTitle = rightTitle ?? messages.common.docsOnThisPage;
  const resolvedSidebarNavTitle = sidebarNavTitle ?? messages.common.docsSidebarTitle;
  const normalizedSidebarBasePath = normalizePathname(sidebarBasePath);
  const isDocumentationTabActive = normalizedSidebarBasePath.startsWith("/documentation");
  const isRequestImplementationTabActive = normalizedSidebarBasePath.startsWith("/request-implementation");
  const isWordpressTabActive = normalizedSidebarBasePath.startsWith("/wordpress");

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

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    setIsMobileViewport(mediaQuery.matches);

    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
      if (!event.matches) {
        setIsMobileMenuOpen(false);
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  return (
    <section className="docs-layout docs-layout--drawer-nav">
      <header className="docs-topbar">
        <div className="docs-topbar-left">
          <Link href="/" className="docs-brand" aria-label={messages.common.homeLinkAria}>
            <Image src="/navai_banner.webp" alt={messages.common.bannerAlt} width={140} height={50} priority />
          </Link>

          <nav className="docs-top-tabs">
            <Link href="/documentation/home" className={`docs-top-tab${isDocumentationTabActive ? " is-active" : ""}`}>
              {messages.common.documentation}
            </Link>
            <Link href="/request-implementation" className={`docs-top-tab${isRequestImplementationTabActive ? " is-active" : ""}`}>
              {messages.common.requestImplementation}
            </Link>
            <Link href="/wordpress" className={`docs-top-tab${isWordpressTabActive ? " is-active" : ""}`}>
              {wordpressPage.navigationLabel}
            </Link>
          </nav>
        </div>

        <div className="docs-topbar-actions">
          <button
            type="button"
            className="docs-mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="docs-mobile-menu"
            aria-label={messages.common.docsNavigation}
            title={messages.common.docsNavigation}
          >
            {isMobileMenuOpen ? (
              <X className="docs-source-icon" aria-hidden="true" />
            ) : (
              <Menu className="docs-source-icon" aria-hidden="true" />
            )}
          </button>

          {isMobileViewport ? (
            <div className="docs-topbar-mini-orb">
              <NavaiMiniVoiceDock className="navai-mini-dock--in-topbar-mobile" />
            </div>
          ) : null}

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

      <div id="docs-mobile-menu" className={`docs-mobile-menu${isMobileMenuOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="docs-mobile-menu-backdrop"
          aria-label={messages.common.docsNavigation}
          onClick={() => setIsMobileMenuOpen(false)}
          tabIndex={isMobileMenuOpen ? 0 : -1}
        />

        <div className="docs-mobile-menu-panel" role="dialog" aria-modal="true" aria-label={messages.common.docsNavigation}>
          <Link
            href="/"
            className="docs-brand docs-mobile-menu-brand"
            aria-label={messages.common.homeLinkAria}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Image src="/navai_banner.webp" alt={messages.common.bannerAlt} width={140} height={50} />
          </Link>

          <div className="docs-mobile-menu-stack">
            <nav className="docs-top-tabs docs-mobile-top-tabs docs-mobile-menu-main-links">
              <Link
                href="/documentation/home"
                className={`docs-top-tab${isDocumentationTabActive ? " is-active" : ""}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {messages.common.documentation}
              </Link>
              <Link
                href="/request-implementation"
                className={`docs-top-tab${isRequestImplementationTabActive ? " is-active" : ""}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {messages.common.requestImplementation}
              </Link>
              <Link
                href="/wordpress"
                className={`docs-top-tab${isWordpressTabActive ? " is-active" : ""}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {wordpressPage.navigationLabel}
              </Link>
            </nav>

            <div className="docs-mobile-menu-separator" aria-hidden="true" />

            <div className="docs-mobile-menu-submenus">
              <DocsSidebarAccordion
                navTitle={resolvedSidebarNavTitle}
                activeSlug={activeSlug}
                onNavigate={() => setIsMobileMenuOpen(false)}
                defaultExpandedGroupKey={defaultExpandedGroupKey}
                basePath={sidebarBasePath}
                homeItem={
                  homeItem
                    ? {
                        slug: homeItem.slug,
                        title: getLocalizedDocTitle(homeItem.slug, homeItem.title),
                      }
                    : undefined
                }
                groups={secondaryGroups.map((group) => ({
                  groupKey: group.groupKey,
                  label: getLocalizedGroupLabel(group.groupKey, group.label),
                  items: group.items.map(localizeNavItem),
                }))}
              />
            </div>
          </div>

          <div className="docs-mobile-menu-separator docs-mobile-menu-separator--footer" aria-hidden="true" />

          <div className="docs-mobile-menu-footer">
            <button
              type="button"
              className="docs-mobile-menu-close"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label={messages.common.docsNavigation}
              title={messages.common.docsNavigation}
            >
              <X className="docs-source-icon" aria-hidden="true" />
            </button>

            <div className="docs-mobile-menu-controls">
              <LanguageSwitcher compact selectId="docs-lang-select-mobile" />
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </div>

      <div className="docs-shell">
        <DocsSidebarAccordion
          navTitle={resolvedSidebarNavTitle}
          activeSlug={activeSlug}
          defaultExpandedGroupKey={defaultExpandedGroupKey}
          basePath={sidebarBasePath}
          homeItem={
            homeItem
              ? {
                  slug: homeItem.slug,
                  title: getLocalizedDocTitle(homeItem.slug, homeItem.title),
                }
              : undefined
          }
          groups={secondaryGroups.map((group) => ({
            groupKey: group.groupKey,
            label: getLocalizedGroupLabel(group.groupKey, group.label),
            items: group.items.map(localizeNavItem),
          }))}
        />

        <article className="docs-main">
          <nav className="docs-mobile-toc" aria-label={resolvedRightTitle}>
            {resolvedRightItems.map((item) => (
              <a key={`mobile-toc-${item.href}-${item.label}`} href={item.href} className="docs-mobile-toc-link">
                {item.label}
              </a>
            ))}
          </nav>

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
          <div id="docs-rightbar-extra-slot" className="docs-rightbar-extra-slot" />
        </aside>
      </div>

    </section>
  );
}

