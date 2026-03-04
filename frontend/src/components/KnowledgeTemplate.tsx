'use client';

import Link from "@/platform/link";
import Image from "@/platform/image";
import { normalizePathname, usePathname } from "@/platform/navigation";
import { Github, Menu, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import NavaiMiniVoiceDock from "@/components/NavaiMiniVoiceDock";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import type { LocalizedPlan, LocalizedSection } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { getLocalizedWordpressPage } from "@/i18n/wordpress-page";

type TopNavSection = "documentation" | "request-implementation" | "wordpress";

const CONTACT_COMMAND_EVENT = "navai:implementation-contact-command";

type KnowledgeTemplateProps = {
  badge: string;
  title: string;
  description: string;
  sidebarTitle: string;
  sections: LocalizedSection[];
  sourceLabel: string;
  sourceHref: string;
  plansTitle?: string;
  plans?: LocalizedPlan[];
  ctaLabel?: string;
  ctaHref?: string;
  contactSectionId?: string;
  contactSectionTitle?: string;
  contactSectionDescription?: string;
  contactForm?: ReactNode;
  activeTopNav?: TopNavSection;
};

export default function KnowledgeTemplate({
  badge,
  title,
  description,
  sidebarTitle,
  sections,
  sourceLabel,
  sourceHref,
  plansTitle,
  plans,
  ctaLabel,
  ctaHref,
  contactSectionId,
  contactSectionTitle,
  contactSectionDescription,
  contactForm,
  activeTopNav,
}: KnowledgeTemplateProps) {
  const { language, messages } = useI18n();
  const pathname = usePathname();
  const normalizedPathname = normalizePathname(pathname);
  const wordpressPage = getLocalizedWordpressPage(language);

  const pageLinks = [
    { href: "/documentation/home", label: messages.common.documentation },
    { href: "/request-implementation", label: messages.common.requestImplementation },
    { href: "/wordpress", label: wordpressPage.navigationLabel },
  ];
  const resolvePageLinkSection = (href: string): TopNavSection => {
    const normalizedHref = normalizePathname(href);
    if (normalizedHref === "/documentation/home") {
      return "documentation";
    }
    if (normalizedHref === "/request-implementation") {
      return "request-implementation";
    }
    return "wordpress";
  };
  const isPageLinkActive = (href: string) => {
    if (activeTopNav) {
      return resolvePageLinkSection(href) === activeTopNav;
    }

    const normalizedHref = normalizePathname(href);
    if (normalizedHref === "/documentation/home") {
      return normalizedPathname.startsWith("/documentation");
    }
    return normalizedPathname === normalizedHref;
  };

  const tocItems = useMemo(
    () => [
      ...sections.map((section) => ({ id: section.id, label: section.title })),
      ...(plans && plans.length > 0 ? [{ id: "plans", label: plansTitle ?? messages.common.plansLabel }] : []),
      ...(contactForm && contactSectionId && contactSectionTitle
        ? [{ id: contactSectionId, label: contactSectionTitle }]
        : []),
    ],
    [
      contactForm,
      contactSectionId,
      contactSectionTitle,
      messages.common.plansLabel,
      plans,
      plansTitle,
      sections,
    ]
  );
  const tocIds = useMemo(() => tocItems.map((item) => item.id), [tocItems]);
  const tocIdSet = useMemo(() => new Set(tocIds), [tocIds]);
  const [activeTocId, setActiveTocId] = useState<string>(tocIds[0] ?? "");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (tocIds.length === 0) {
      setActiveTocId("");
      return;
    }

    setActiveTocId((current) => (tocIdSet.has(current) ? current : tocIds[0]));
  }, [tocIdSet, tocIds]);

  useEffect(() => {
    if (tocIds.length === 0 || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const resolveHashId = (hashValue: string) =>
      decodeURIComponent(hashValue.replace(/^#/, "").trim());

    const setFromHash = () => {
      const hashId = resolveHashId(window.location.hash);
      if (!hashId || !tocIdSet.has(hashId)) {
        return false;
      }

      setActiveTocId((current) => (current === hashId ? current : hashId));
      return true;
    };

    const setFromScroll = () => {
      const sectionElements = tocIds
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => Boolean(element));
      if (sectionElements.length === 0) {
        return;
      }

      const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const isNearBottom = window.scrollY >= maxScrollY - 8;

      let nextActiveId = sectionElements[0].id;
      if (isNearBottom) {
        nextActiveId = sectionElements[sectionElements.length - 1].id;
      } else {
        const markerOffset = Math.min(220, Math.max(120, Math.round(window.innerHeight * 0.28)));
        const markerY = window.scrollY + markerOffset;
        for (const element of sectionElements) {
          if (element.offsetTop <= markerY) {
            nextActiveId = element.id;
          } else {
            break;
          }
        }
      }

      setActiveTocId((current) => (current === nextActiveId ? current : nextActiveId));
    };

    const syncActiveSection = () => {
      if (!setFromHash()) {
        setFromScroll();
      }
    };

    let rafId = 0;
    const onScroll = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        setFromScroll();
        rafId = 0;
      });
    };

    const onHashChange = () => {
      setFromHash();
    };

    syncActiveSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", onHashChange);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [normalizedPathname, tocIds, tocIdSet]);

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

  const handleTocClick = useCallback(
    (sectionId: string) => {
      setActiveTocId(sectionId);

      if (typeof window === "undefined" || !contactSectionId || sectionId !== contactSectionId) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent(CONTACT_COMMAND_EVENT, {
          detail: { action: "open", scroll: false, focusName: false },
        })
      );
    },
    [contactSectionId]
  );

  return (
    <section className="docs-layout docs-layout--drawer-nav">
      <header className="docs-topbar">
        <div className="docs-topbar-left">
          <Link href="/" className="docs-brand" aria-label={messages.common.homeLinkAria}>
            <Image src="/navai_banner.webp" alt={messages.common.bannerAlt} width={140} height={50} priority />
          </Link>

          <nav className="docs-top-tabs">
            {pageLinks.map((item) => {
              const isActive = isPageLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`docs-top-tab${isActive ? " is-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="docs-topbar-actions">
          <button
            type="button"
            className="docs-mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="knowledge-mobile-menu"
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
            href={sourceHref}
            target="_blank"
            rel="noreferrer noopener"
            className="docs-source-btn"
            aria-label={messages.common.githubRepository}
            title={messages.common.githubRepository}
          >
            <Github className="docs-source-icon" aria-hidden="true" />
          </a>
          <div className="docs-topbar-controls">
            <LanguageSwitcher compact selectId="knowledge-lang-select" />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div id="knowledge-mobile-menu" className={`docs-mobile-menu${isMobileMenuOpen ? " is-open" : ""}`}>
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
            <nav className="docs-top-tabs docs-mobile-top-tabs docs-mobile-menu-main-links" aria-label={messages.common.docsNavigation}>
              {pageLinks.map((item) => {
                const isActive = isPageLinkActive(item.href);
                return (
                  <Link
                    key={`mobile-${item.href}`}
                    href={item.href}
                    className={`docs-top-tab${isActive ? " is-active" : ""}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="docs-mobile-menu-separator" aria-hidden="true" />

            <nav className="docs-mobile-menu-submenus" aria-label={sidebarTitle}>
              {tocItems.map((item) => (
                <a
                  key={`mobile-drawer-${item.id}`}
                  href={`#${item.id}`}
                  className={`docs-nav-item docs-mobile-submenu-link${activeTocId === item.id ? " is-active" : ""}`}
                  onClick={() => {
                    handleTocClick(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
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
              <LanguageSwitcher compact selectId="knowledge-lang-select-mobile" />
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </div>

      <div className="docs-shell">
        <aside className="docs-sidebar">
          <p className="docs-nav-title">{messages.common.docsNavigation}</p>
          <div className="docs-nav-list">
            {pageLinks.map((item) => {
              const isActive = isPageLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`docs-nav-item${isActive ? " is-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <p className="docs-sidebar-title">{sidebarTitle}</p>
          <nav className="docs-toc">
            {tocItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`docs-toc-link${activeTocId === item.id ? " is-active" : ""}`}
                onClick={() => handleTocClick(item.id)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="docs-main">
          <nav className="docs-mobile-toc" aria-label={messages.common.docsOnThisPage}>
            {tocItems.map((item) => (
              <a
                key={`mobile-toc-${item.id}`}
                href={`#${item.id}`}
                className={`docs-mobile-toc-link${activeTocId === item.id ? " is-active" : ""}`}
                onClick={() => handleTocClick(item.id)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <header className="docs-header">
            <p className="docs-badge">{badge}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>

          <div className="docs-sections">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="docs-section-block">
                <h2>{section.title}</h2>
                <p>{section.description}</p>

                {section.bullets?.length ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}

                {section.code ? (
                  <pre>
                    <code>{section.code}</code>
                  </pre>
                ) : null}
              </section>
            ))}

            {plans?.length ? (
              <section id="plans" className="docs-section-block">
                <h2>{plansTitle}</h2>
                <div className="plans-grid">
                  {plans.map((plan) => (
                    <article key={`${plan.name}-${plan.menuRange}`} className="plan-card">
                      <p className="plan-name">{plan.name}</p>
                      <p className="plan-range">{plan.menuRange}</p>
                      <p className="plan-price">{plan.price}</p>
                      <p className="plan-time">{plan.timeline}</p>
                      <ul>
                        {plan.highlights.map((highlight) => (
                          <li key={highlight}>{highlight}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {ctaLabel && ctaHref ? (
              <div className="docs-cta-wrap">
                <Link href={ctaHref} className="docs-cta-btn">
                  {ctaLabel}
                </Link>
              </div>
            ) : null}

            {contactForm && contactSectionId && contactSectionTitle ? (
              <section id={contactSectionId} className="docs-section-block">
                <h2>{contactSectionTitle}</h2>
                {contactSectionDescription ? <p>{contactSectionDescription}</p> : null}
                {contactForm}
              </section>
            ) : null}
          </div>
        </article>

        <aside className="docs-rightbar">
          <p className="docs-sidebar-title">{messages.common.docsOnThisPage}</p>
          <nav className="docs-toc">
            {tocItems.map((item) => (
              <a
                key={`${item.id}-right`}
                href={`#${item.id}`}
                className={`docs-toc-link${activeTocId === item.id ? " is-active" : ""}`}
                onClick={() => handleTocClick(item.id)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a className="docs-source-link" href={sourceHref} target="_blank" rel="noreferrer noopener">
            {sourceLabel}
          </a>
        </aside>
      </div>

    </section>
  );
}

