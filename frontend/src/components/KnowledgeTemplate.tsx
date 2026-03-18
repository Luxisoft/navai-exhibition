'use client';

import Link from "@/platform/link";
import Image from "@/platform/image";
import { normalizePathname, usePathname } from "@/platform/navigation";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import DocsCodeEditor, { inferCodeLanguageFromContent } from "@/components/DocsCodeEditor";
import { RightSidebarSkeleton, SidebarNavSkeleton } from "@/components/AppShellSkeletons";
import FirebaseGoogleAuthButton from "@/components/FirebaseGoogleAuthButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NavaiVoiceOrbDockClient from "@/components/NavaiVoiceOrbDockClient";
import PwaInstallButton from "@/components/PwaInstallButton";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { NAVAI_PANEL_HREF, REQUEST_IMPLEMENTATION_HREF } from "@/lib/auth-redirect";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import type { LocalizedPlan, LocalizedSection } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/provider";
import { stripLeadingDecorativeText } from "@/lib/decorative-text";
import { resolveActiveHeadingIdFromScroll } from "@/lib/docs-scroll-spy";
import { useNavaiMiniVoiceOrbDockProps } from "@/lib/navai-voice-orb";

type TopNavSection = "documentation" | "request-implementation" | "navai-panel";

const CONTACT_COMMAND_EVENT = "navai:implementation-contact-command";

type KnowledgeTemplateProps = {
  badge?: string;
  title: string;
  description: string;
  sidebarTitle: string;
  sections: LocalizedSection[];
  sourceLabel: string;
  sourceHref: string;
  sidebarPageLinks?: Array<{ href: string; label: string }>;
  sidebarPageGroups?: Array<{
    id: string;
    label?: string;
    links: Array<{ href: string; label: string }>;
  }>;
  showRightSidebarSourceLink?: boolean;
  plansTitle?: string;
  plans?: LocalizedPlan[];
  ctaLabel?: string;
  ctaHref?: string;
  contactSectionId?: string;
  contactSectionTitle?: string;
  contactSectionDescription?: string;
  contactForm?: ReactNode;
  customSectionsContent?: ReactNode;
  activeTopNav?: TopNavSection;
  rightSidebarContent?: ReactNode;
  showRightSidebarToc?: boolean;
  shellClassName?: string;
};

export default function KnowledgeTemplate({
  badge,
  title,
  description,
  sidebarTitle,
  sections,
  sourceLabel,
  sourceHref,
  sidebarPageLinks,
  sidebarPageGroups,
  showRightSidebarSourceLink = true,
  plansTitle,
  plans,
  ctaLabel,
  ctaHref,
  contactSectionId,
  contactSectionTitle,
  contactSectionDescription,
  contactForm,
  customSectionsContent,
  activeTopNav,
  rightSidebarContent,
  showRightSidebarToc = true,
  shellClassName,
}: KnowledgeTemplateProps) {
  const { messages } = useI18n();
  const { isInitializing, user } = useFirebaseAuth();
  const pathname = usePathname();
  const normalizedPathname = normalizePathname(pathname);
  const displayBadge = useMemo(
    () => (badge ? stripLeadingDecorativeText(badge) : ""),
    [badge]
  );
  const displayTitle = useMemo(() => stripLeadingDecorativeText(title), [title]);
  const displayDescription = useMemo(() => stripLeadingDecorativeText(description), [description]);
  const displaySidebarTitle = useMemo(() => stripLeadingDecorativeText(sidebarTitle), [sidebarTitle]);
  const displayPlansTitle = useMemo(
    () => (plansTitle ? stripLeadingDecorativeText(plansTitle) : undefined),
    [plansTitle]
  );
  const displayContactSectionTitle = useMemo(
    () => (contactSectionTitle ? stripLeadingDecorativeText(contactSectionTitle) : undefined),
    [contactSectionTitle]
  );
  const displayContactSectionDescription = useMemo(
    () => (contactSectionDescription ? stripLeadingDecorativeText(contactSectionDescription) : undefined),
    [contactSectionDescription]
  );
  const resolvedPlansHeading = useMemo(
    () => displayPlansTitle ?? stripLeadingDecorativeText(messages.common.plansLabel),
    [displayPlansTitle, messages.common.plansLabel]
  );
  const displaySections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        title: stripLeadingDecorativeText(section.title),
        description: stripLeadingDecorativeText(section.description),
        bullets: section.bullets?.map((bullet) => stripLeadingDecorativeText(bullet)),
      })),
    [sections]
  );

  const pageLinks = [
    { href: "/documentation/home", label: messages.common.documentation },
    user
      ? { href: NAVAI_PANEL_HREF, label: messages.common.navaiPanel }
      : { href: REQUEST_IMPLEMENTATION_HREF, label: messages.common.requestImplementation },
  ];
  const topbarLinks = useMemo(
    () => [
      { href: "/documentation/home", label: messages.common.documentation },
      { href: NAVAI_PANEL_HREF, label: messages.common.navaiPanel },
    ],
    [messages.common.documentation, messages.common.navaiPanel]
  );
  const resolvedSidebarPageLinks = sidebarPageLinks ?? pageLinks;
  const resolvedSidebarGroups = useMemo(
    () =>
      sidebarPageGroups && sidebarPageGroups.length > 0
        ? sidebarPageGroups
        : [
            {
              id: "default",
              links: resolvedSidebarPageLinks,
            },
          ],
    [resolvedSidebarPageLinks, sidebarPageGroups]
  );
  const resolvePageLinkSection = (href: string): TopNavSection => {
    const normalizedHref = normalizePathname(href);
    if (normalizedHref === "/documentation/home" || normalizedHref.startsWith("/documentation/")) {
      return "documentation";
    }
    if (normalizedHref === NAVAI_PANEL_HREF || normalizedHref.startsWith(`${NAVAI_PANEL_HREF}/`)) {
      return "navai-panel";
    }
    return "request-implementation";
  };
  const isTopbarLinkActive = (href: string) => {
    if (activeTopNav) {
      return resolvePageLinkSection(href) === resolvePageLinkSection(normalizedPathname);
    }

    const normalizedHref = normalizePathname(href);
    if (normalizedHref === "/documentation/home") {
      return normalizedPathname.startsWith("/documentation");
    }
    if (normalizedHref === NAVAI_PANEL_HREF) {
      return normalizedPathname === NAVAI_PANEL_HREF || normalizedPathname.startsWith(`${NAVAI_PANEL_HREF}/`);
    }
    return normalizedPathname === normalizedHref;
  };
  const isTopbarLinkDisabled = (href: string) =>
    showChromeSkeletons && normalizePathname(href) === NAVAI_PANEL_HREF;

  const isSidebarLinkActive = (href: string) => {
    const [pathPart, hashPart = ""] = href.split("#");
    if (hashPart) {
      return normalizePathname(pathPart) === normalizedPathname && activeHash === `#${hashPart}`;
    }

    const normalizedHref = normalizePathname(href);
    return normalizedPathname === normalizedHref;
  };

  const tocItems = useMemo(
    () => [
      ...displaySections.map((section) => ({ id: section.id, label: section.title })),
      ...(plans && plans.length > 0
        ? [{ id: "plans", label: resolvedPlansHeading }]
        : []),
      ...(contactForm && contactSectionId && displayContactSectionTitle
        ? [{ id: contactSectionId, label: displayContactSectionTitle }]
        : []),
    ],
    [
      contactForm,
      contactSectionId,
      displayContactSectionTitle,
      displayPlansTitle,
      displaySections,
      resolvedPlansHeading,
      messages.common.plansLabel,
      plans,
    ]
  );
  const tocIds = useMemo(() => tocItems.map((item) => item.id), [tocItems]);
  const tocIdSet = useMemo(() => new Set(tocIds), [tocIds]);
  const [activeTocId, setActiveTocId] = useState<string>(tocIds[0] ?? "");
  const [activeHash, setActiveHash] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const topbarMiniDockProps = useNavaiMiniVoiceOrbDockProps({
    className: "navai-mini-dock--in-topbar-mobile",
  });
  const hasSidebarToc = displaySidebarTitle.length > 0 && tocItems.length > 0;
  const showChromeSkeletons = isInitializing;
  const hasRightSidebar = Boolean(
    showRightSidebarToc || rightSidebarContent || showRightSidebarSourceLink,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncHash = () => {
      setActiveHash(window.location.hash || "");
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

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

      const nextActiveId = resolveActiveHeadingIdFromScroll(sectionElements, window, document);
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
    window.addEventListener("resize", syncActiveSection);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("resize", syncActiveSection);
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
            {topbarLinks.map((item) => {
              const isActive = isTopbarLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`docs-top-tab${isActive ? " is-active" : ""}${
                    isTopbarLinkDisabled(item.href) ? " is-disabled" : ""
                  }`}
                  aria-disabled={isTopbarLinkDisabled(item.href) ? true : undefined}
                  tabIndex={isTopbarLinkDisabled(item.href) ? -1 : undefined}
                  onClick={(event) => {
                    if (isTopbarLinkDisabled(item.href)) {
                      event.preventDefault();
                    }
                  }}
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

          <div className="docs-topbar-mini-orb">
            <NavaiVoiceOrbDockClient {...topbarMiniDockProps} />
          </div>

          <div className={`docs-topbar-controls${showChromeSkeletons ? " is-loading" : ""}`}>
            <FirebaseGoogleAuthButton compact showUserMenu />
            <PwaInstallButton compact disabled={showChromeSkeletons} />
            {!user ? (
              <>
                <LanguageSwitcher
                  compact
                  selectId="knowledge-lang-select"
                  disabled={showChromeSkeletons}
                />
                <ThemeSwitcher disabled={showChromeSkeletons} />
              </>
            ) : null}
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
              {topbarLinks.map((item) => {
                const isActive = isTopbarLinkActive(item.href);
                return (
                  <Link
                    key={`mobile-${item.href}`}
                    href={item.href}
                    className={`docs-top-tab${isActive ? " is-active" : ""}${
                      isTopbarLinkDisabled(item.href) ? " is-disabled" : ""
                    }`}
                    aria-disabled={isTopbarLinkDisabled(item.href) ? true : undefined}
                    tabIndex={isTopbarLinkDisabled(item.href) ? -1 : undefined}
                    onClick={(event) => {
                      if (isTopbarLinkDisabled(item.href)) {
                        event.preventDefault();
                        return;
                      }
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {hasSidebarToc ? <div className="docs-mobile-menu-separator" aria-hidden="true" /> : null}

            {hasSidebarToc ? (
              <nav className="docs-mobile-menu-submenus" aria-label={displaySidebarTitle}>
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
            ) : null}
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

            <div className={`docs-mobile-menu-controls${showChromeSkeletons ? " is-loading" : ""}`}>
              <FirebaseGoogleAuthButton compact />
              <PwaInstallButton compact disabled={showChromeSkeletons} />
              <LanguageSwitcher
                compact
                selectId="knowledge-lang-select-mobile"
                disabled={showChromeSkeletons}
              />
              <ThemeSwitcher disabled={showChromeSkeletons} />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`docs-shell${hasRightSidebar ? "" : " docs-shell--without-rightbar"}${
          shellClassName ? ` ${shellClassName}` : ""
        }`}
      >
        <aside className="docs-sidebar">
          {showChromeSkeletons ? (
            <SidebarNavSkeleton withToc={hasSidebarToc} />
          ) : (
            <>
              <p className="docs-nav-title">{messages.common.docsNavigation}</p>
              <div className="docs-nav-groups">
                {resolvedSidebarGroups.map((group, groupIndex) => (
                  <div key={group.id} className="docs-nav-group">
                    {groupIndex > 0 ? (
                      <div className="docs-nav-separator" aria-hidden="true" />
                    ) : null}
                    {group.label ? (
                      <p className="docs-nav-group-label">{group.label}</p>
                    ) : null}
                    <div className="docs-nav-list">
                      {group.links.map((item) => {
                        const isActive = isSidebarLinkActive(item.href);
                        return (
                          <div key={item.href} className="docs-nav-entry">
                            <Link
                              href={item.href}
                              className={`docs-nav-item${isActive ? " is-active" : ""}`}
                            >
                              {item.label}
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {hasSidebarToc ? <p className="docs-sidebar-title">{displaySidebarTitle}</p> : null}
              {hasSidebarToc ? (
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
              ) : null}
            </>
          )}
        </aside>

        <article className="docs-main">
          {tocItems.length > 0 ? (
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
          ) : null}

          <header className="docs-header">
            {displayBadge ? <p className="docs-badge">{displayBadge}</p> : null}
            <h1>{displayTitle}</h1>
            <p>{displayDescription}</p>
          </header>

          <div className="docs-sections">
            {customSectionsContent ?? (
              <>
                {displaySections.map((section) => (
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
                      <DocsCodeEditor
                        code={section.code}
                        language={inferCodeLanguageFromContent(section.code)}
                      />
                    ) : null}
                  </section>
                ))}

                {plans?.length ? (
                  <section id="plans" className="docs-section-block">
                    <h2>{resolvedPlansHeading}</h2>
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
                    <Button asChild size="lg">
                      <Link href={ctaHref}>{ctaLabel}</Link>
                    </Button>
                  </div>
                ) : null}

                {contactForm && contactSectionId && displayContactSectionTitle ? (
                  <section id={contactSectionId} className="docs-section-block">
                    <h2>{displayContactSectionTitle}</h2>
                    {displayContactSectionDescription ? <p>{displayContactSectionDescription}</p> : null}
                    {contactForm}
                  </section>
                ) : null}
              </>
            )}
          </div>
        </article>

        {hasRightSidebar ? (
          <aside className="docs-rightbar">
            {showChromeSkeletons ? (
              <RightSidebarSkeleton lines={5} cards={rightSidebarContent ? 2 : 0} />
            ) : showRightSidebarToc ? (
              <>
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
              </>
            ) : null}

            {rightSidebarContent ? (
              <div className="docs-rightbar-extra-slot">{rightSidebarContent}</div>
            ) : null}

            {showRightSidebarSourceLink ? (
              <a
                className="docs-source-link"
                href={sourceHref}
                target="_blank"
                rel="noreferrer noopener"
              >
                {sourceLabel}
              </a>
            ) : null}
          </aside>
        ) : null}
      </div>

    </section>
  );
}

