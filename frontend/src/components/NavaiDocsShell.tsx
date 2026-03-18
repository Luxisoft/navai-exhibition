'use client';

import Image from "@/platform/image";
import Link from "@/platform/link";
import { normalizePathname } from "@/platform/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import DocsSidebarAccordion from "@/components/DocsSidebarAccordion";
import { RightSidebarSkeleton, SidebarNavSkeleton } from "@/components/AppShellSkeletons";
import FirebaseGoogleAuthButton from "@/components/FirebaseGoogleAuthButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NavaiVoiceOrbDockClient from "@/components/NavaiVoiceOrbDockClient";
import PwaInstallButton from "@/components/PwaInstallButton";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { NAVAI_PANEL_HREF } from "@/lib/auth-redirect";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { stripLeadingDecorativeText } from "@/lib/decorative-text";
import { isScrollSpyNearBottom, resolveActiveHeadingIdFromScroll } from "@/lib/docs-scroll-spy";
import {
  getLocalizedInstallationGuide,
  isInteractiveInstallationGuideSlug,
  supportsInteractiveInstallationGuide,
  type InteractiveInstallationGuideSlug,
} from "@/lib/installation-api-guide";
import {
  isInteractiveLegalGuideSlug,
  supportsInteractiveLegalGuide,
} from "@/lib/legal-docs-guide";
import {
  getLocalizedLibrariesGuide,
  isInteractiveLibrariesGuideSlug,
  supportsInteractiveLibrariesGuide,
} from "@/lib/libraries-guide";
import { useNavaiMiniVoiceOrbDockProps } from "@/lib/navai-voice-orb";

const INSTALLATION_GUIDE_STACK_CHANGE_EVENT = "docs:installation-guide-stack-change";
const INSTALLATION_STEP_PREFIX_PATTERN =
  "(?:Paso|Step|Étape|Etape|Etapa|步骤|ステップ|Шаг|단계|चरण)";

type NavaiDocSlug =
  | "home"
  | "installation-api"
  | "installation-web"
  | "installation-mobile"
  | "legal-ai-evaluation-terms"
  | "legal-data-processing-policy"
  | "legal-data-and-ai-authorization"
  | "legal-privacy-policy"
  | "legal-checkout-flow"
  | "legal-compliance-checklist"
  | "legal-privacy-notice"
  | "playground-stores"
  | "voice-backend"
  | "voice-frontend"
  | "voice-mobile";

type NavaiDocGroupKey = "home" | "installation" | "legal" | "examples" | "libraries";

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
  badge?: string;
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

function normalizeHashHref(href: string) {
  if (!href.startsWith("#")) {
    return "";
  }

  try {
    const decodedId = decodeURIComponent(href.slice(1)).trim();
    return decodedId ? `#${decodedId}` : "";
  } catch {
    return href.trim();
  }
}

function emitDocsSectionNavigation(href: string) {
  const normalizedHref = normalizeHashHref(href);
  const id = normalizedHref.replace(/^#/, "");

  if (!id || typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("docs:navigate-to-section", {
      detail: { id },
    })
  );
}

function isInteractiveGuideHref(href: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const id = normalizeHashHref(href).replace(/^#/, "");
  if (!id) {
    return false;
  }

  const targetElement = document.getElementById(id);
  return Boolean(targetElement?.closest(".docs-interactive-guide"));
}

function resolveActiveInstallationGuideHref() {
  if (typeof document === "undefined") {
    return "";
  }

  const activeSectionId = document
    .querySelector<HTMLElement>(".docs-installation-guide")
    ?.dataset.activeDocSection?.trim();

  return activeSectionId ? `#${activeSectionId}` : "";
}

function formatInstallationGuideTocLabel(title: string) {
  const cleanedTitle = stripLeadingDecorativeText(title).replace(/\s+/g, " ").trim();
  const match = cleanedTitle.match(new RegExp(`^\\s*((${INSTALLATION_STEP_PREFIX_PATTERN}\\s*\\d+))\\s+(.+)$`, "u"));

  if (!match) {
    return cleanedTitle;
  }

  const prefix = match[1]?.trim() ?? "";
  const text = match[3]?.trim() ?? cleanedTitle;
  return `${prefix}. ${text}`;
}

function isDocGroupKey(value: string): value is NavaiDocGroupKey {
  return (
    value === "home" ||
    value === "installation" ||
    value === "legal" ||
    value === "examples" ||
    value === "libraries"
  );
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
  const { isInitializing, user } = useFirebaseAuth();
  const localizedDocs = messages.docsCatalog;
  const interactiveInstallationGuideEnabled =
    Boolean(activeSlug && isInteractiveInstallationGuideSlug(activeSlug)) && supportsInteractiveInstallationGuide(language);
  const interactiveLegalGuideEnabled =
    Boolean(activeSlug && isInteractiveLegalGuideSlug(activeSlug)) && supportsInteractiveLegalGuide(language);
  const interactiveLibrariesGuideEnabled =
    Boolean(activeSlug && isInteractiveLibrariesGuideSlug(activeSlug)) &&
    supportsInteractiveLibrariesGuide(language);
  const interactiveGuideEnabled =
    interactiveInstallationGuideEnabled || interactiveLegalGuideEnabled || interactiveLibrariesGuideEnabled;
  const installationGuideSlug =
    activeSlug && isInteractiveInstallationGuideSlug(activeSlug)
      ? (activeSlug as InteractiveInstallationGuideSlug)
      : null;
  const installationGuide = interactiveInstallationGuideEnabled && installationGuideSlug
    ? getLocalizedInstallationGuide(messages, installationGuideSlug, language)
    : null;
  const librariesGuide =
    interactiveLibrariesGuideEnabled && activeSlug && isInteractiveLibrariesGuideSlug(activeSlug)
      ? getLocalizedLibrariesGuide(messages, activeSlug, language)
      : null;
  const [resolvedRightItems, setResolvedRightItems] = useState<RightItem[]>(() =>
    rightItems.map((item) => ({ ...item, label: stripLeadingDecorativeText(item.label) }))
  );
  const [activeRightHref, setActiveRightHref] = useState<string>(() => normalizeHashHref(rightItems[0]?.href ?? ""));
  const [activeInstallationGuideStackValue, setActiveInstallationGuideStackValue] = useState<string>(
    () => installationGuide?.tabsSection.tabs[0]?.value ?? ""
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const topbarMiniDockProps = useNavaiMiniVoiceOrbDockProps({
    className: "navai-mini-dock--in-topbar-mobile",
  });
  const rightItemsSignature = useMemo(
    () => rightItems.map((item) => `${item.href}|${item.depth ?? 2}|${item.label}`).join("||"),
    [rightItems]
  );
  const installationGuideStackOptions = installationGuide?.tabsSection.tabs ?? [];
  const installationGuideStackHref = installationGuide ? `#${installationGuide.tabsSection.id}` : "";
  const effectiveRightItems = useMemo<RightItem[]>(() => {
    if (interactiveLibrariesGuideEnabled && librariesGuide) {
      return librariesGuide.currentTab.sections.map((section) => ({
        href: `#${section.id}`,
        label: section.title,
        depth: 2 as const,
      }));
    }

    if (!interactiveInstallationGuideEnabled || !installationGuide) {
      return resolvedRightItems;
    }

    const activeGuideTab =
      installationGuide.tabsSection.tabs.find((tab) => tab.value === activeInstallationGuideStackValue) ??
      installationGuide.tabsSection.tabs[0];

    return [
      {
        href: `#${installationGuide.tabsSection.id}`,
        label: stripLeadingDecorativeText(installationGuide.tabsSection.title),
        depth: 2 as const,
      },
      ...(activeGuideTab?.sections ?? []).map((section) => ({
        href: `#${section.id}`,
        label: formatInstallationGuideTocLabel(section.title),
        depth: 2 as const,
      })),
    ];
  }, [
    activeInstallationGuideStackValue,
    installationGuide,
    interactiveInstallationGuideEnabled,
    interactiveLibrariesGuideEnabled,
    librariesGuide,
    resolvedRightItems,
  ]);
  const rightHashHrefs = useMemo(
    () =>
      effectiveRightItems
        .map((item) => normalizeHashHref(item.href))
        .filter((href): href is string => Boolean(href)),
    [effectiveRightItems]
  );
  const rightHashHrefSet = useMemo(() => new Set(rightHashHrefs), [rightHashHrefs]);
  const shouldShowInstallationGuideStackSelector =
    interactiveInstallationGuideEnabled && installationGuideStackOptions.length > 0;
  const desktopRightItems = useMemo(
    () =>
      shouldShowInstallationGuideStackSelector
        ? effectiveRightItems.filter((item) => normalizeHashHref(item.href) !== installationGuideStackHref)
        : effectiveRightItems,
    [effectiveRightItems, installationGuideStackHref, shouldShowInstallationGuideStackSelector]
  );
  const hasRightRailContent = desktopRightItems.length > 0;

  const secondaryGroups = groups.filter((group) => group.groupKey !== "home" && group.groupKey !== "examples");
  const localizedDocEntry = activeSlug ? localizedDocs.entries[activeSlug as NavaiDocSlug] : undefined;
  const getLocalizedDocTitle = (slug: string, fallbackTitle: string) =>
    stripLeadingDecorativeText(localizedDocs.entries[slug as NavaiDocSlug]?.title ?? fallbackTitle);
  const getLocalizedGroupLabel = (groupKey: string, fallbackLabel?: string) =>
    stripLeadingDecorativeText(localizedDocs.groupLabels[groupKey as NavaiDocGroupKey] ?? fallbackLabel ?? groupKey);
  const localizeNavItem = (item: DocsNavGroup["items"][number]) => ({
    slug: item.slug,
    title: getLocalizedDocTitle(item.slug, item.title),
    children: item.children?.map((child) => ({
      slug: child.slug,
      title: getLocalizedDocTitle(child.slug, child.title),
    })),
  });

  const displayTitle = stripLeadingDecorativeText(activeSlug ? (localizedDocEntry?.title ?? title) : title);
  const displayDescription = stripLeadingDecorativeText(
    activeSlug ? (localizedDocEntry?.summary ?? description) : description
  );

  const displayBadge = badge
    ? stripLeadingDecorativeText(
        isDocGroupKey(badge) ? (localizedDocs.groupLabels[badge] ?? badge) : badge
      )
    : "";
  const resolvedSourceLabel = stripLeadingDecorativeText(sourceLabel ?? messages.common.docsOpenReadmeGithub);
  const resolvedRightTitle = stripLeadingDecorativeText(rightTitle ?? messages.common.docsOnThisPage);
  const resolvedSidebarNavTitle = stripLeadingDecorativeText(sidebarNavTitle ?? messages.common.docsSidebarTitle);
  const normalizedSidebarBasePath = normalizePathname(sidebarBasePath);
  const isDocumentationTabActive = normalizedSidebarBasePath.startsWith("/documentation");
  const isPanelTabActive = normalizedSidebarBasePath.startsWith(NAVAI_PANEL_HREF);
  const showChromeSkeletons = isInitializing;
  const isTopbarLinkDisabled = (href: string) =>
    showChromeSkeletons && normalizePathname(href) === NAVAI_PANEL_HREF;

  useEffect(() => {
    setResolvedRightItems(rightItems.map((item) => ({ ...item, label: stripLeadingDecorativeText(item.label) })));
  }, [rightItems]);

  useEffect(() => {
    if (!shouldShowInstallationGuideStackSelector) {
      setActiveInstallationGuideStackValue("");
      return;
    }

    const availableValues = new Set(installationGuideStackOptions.map((tab) => tab.value));
    const fallbackValue = installationGuideStackOptions[0]?.value ?? "";

    setActiveInstallationGuideStackValue((current) => (current && availableValues.has(current) ? current : fallbackValue));
  }, [installationGuideStackOptions, shouldShowInstallationGuideStackSelector]);

  useEffect(() => {
    if (rightHashHrefs.length === 0) {
      setActiveRightHref("");
      return;
    }

    setActiveRightHref((current) => (rightHashHrefSet.has(current) ? current : rightHashHrefs[0]));
  }, [rightHashHrefs, rightHashHrefSet]);

  useEffect(() => {
    if (interactiveGuideEnabled) {
      return;
    }

    const syncRightItemsFromHeadings = () => {
      const headingElements = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".docs-main .docs-markdown-body h2[id], .docs-main .docs-markdown-body h3[id]"
        )
      );

      if (headingElements.length === 0) {
        return;
      }

      const nextItems = headingElements.map((heading) => {
        const label = stripLeadingDecorativeText(heading.textContent?.trim() || heading.id);
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
    };

    const scheduleSync = () => {
      window.requestAnimationFrame(syncRightItemsFromHeadings);
    };

    const raf = window.requestAnimationFrame(syncRightItemsFromHeadings);
    window.addEventListener("docs:refresh-right-items", scheduleSync);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("docs:refresh-right-items", scheduleSync);
    };
  }, [activeSlug, interactiveGuideEnabled, language, rightItemsSignature]);

  useEffect(() => {
    if (rightHashHrefs.length === 0 || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const resolveHashHref = (hashValue: string) => normalizeHashHref(hashValue);
    const hrefToId = (href: string) => normalizeHashHref(href).replace(/^#/, "");

    const setFromHash = () => {
      const hashHref = resolveHashHref(window.location.hash);
      if (!hashHref || !rightHashHrefSet.has(hashHref)) {
        return false;
      }

      setActiveRightHref((current) => (current === hashHref ? current : hashHref));
      return true;
    };

    const setFromScroll = () => {
      if (interactiveInstallationGuideEnabled && isScrollSpyNearBottom(window, document)) {
        const activeInstallationGuideHref = resolveActiveInstallationGuideHref();
        if (activeInstallationGuideHref && rightHashHrefSet.has(activeInstallationGuideHref)) {
          setActiveRightHref((current) =>
            current === activeInstallationGuideHref ? current : activeInstallationGuideHref
          );
          return;
        }
      }

      if (interactiveGuideEnabled) {
        return;
      }

      const headingElements = rightHashHrefs
        .map((href) => document.getElementById(hrefToId(href)))
        .filter((element): element is HTMLElement => Boolean(element));

      if (headingElements.length === 0) {
        return;
      }

      const nextActiveId = resolveActiveHeadingIdFromScroll(headingElements, window, document);
      const nextHref = `#${nextActiveId}`;
      setActiveRightHref((current) => (current === nextHref ? current : nextHref));
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
  }, [interactiveGuideEnabled, interactiveInstallationGuideEnabled, rightHashHrefs, rightHashHrefSet]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleActiveSectionChange = (event: Event) => {
      const nextId =
        event instanceof CustomEvent && typeof event.detail?.id === "string" ? event.detail.id.trim() : "";

      if (!nextId) {
        return;
      }

      const nextHref = `#${nextId}`;
      if (!rightHashHrefSet.has(nextHref)) {
        return;
      }

      setActiveRightHref((current) => (current === nextHref ? current : nextHref));
    };

    window.addEventListener("docs:active-section-change", handleActiveSectionChange);
    return () => window.removeEventListener("docs:active-section-change", handleActiveSectionChange);
  }, [rightHashHrefSet]);

  useEffect(() => {
    if (!shouldShowInstallationGuideStackSelector || typeof window === "undefined") {
      return;
    }

    const availableValues = new Set(installationGuideStackOptions.map((tab) => tab.value));

    const handleStackChange = (event: Event) => {
      const nextValue =
        event instanceof CustomEvent && typeof event.detail?.value === "string" ? event.detail.value.trim() : "";

      if (!nextValue || !availableValues.has(nextValue)) {
        return;
      }

      setActiveInstallationGuideStackValue((current) => (current === nextValue ? current : nextValue));
    };

    window.addEventListener(INSTALLATION_GUIDE_STACK_CHANGE_EVENT, handleStackChange);
    return () => window.removeEventListener(INSTALLATION_GUIDE_STACK_CHANGE_EVENT, handleStackChange);
  }, [installationGuideStackOptions, shouldShowInstallationGuideStackSelector]);

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

  const handleInstallationGuideStackChange = (nextValue: string) => {
    if (!nextValue || typeof window === "undefined") {
      return;
    }

    setActiveInstallationGuideStackValue((current) => (current === nextValue ? current : nextValue));
    window.dispatchEvent(
      new CustomEvent(INSTALLATION_GUIDE_STACK_CHANGE_EVENT, {
        detail: { value: nextValue },
      })
    );
  };

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
            <Link
              href={NAVAI_PANEL_HREF}
              className={`docs-top-tab${isPanelTabActive ? " is-active" : ""}${
                isTopbarLinkDisabled(NAVAI_PANEL_HREF) ? " is-disabled" : ""
              }`}
              aria-disabled={isTopbarLinkDisabled(NAVAI_PANEL_HREF) ? true : undefined}
              tabIndex={isTopbarLinkDisabled(NAVAI_PANEL_HREF) ? -1 : undefined}
              onClick={(event) => {
                if (isTopbarLinkDisabled(NAVAI_PANEL_HREF)) {
                  event.preventDefault();
                }
              }}
            >
              {messages.common.navaiPanel}
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

          <div className="docs-topbar-mini-orb">
            <NavaiVoiceOrbDockClient {...topbarMiniDockProps} />
          </div>

          <div className={`docs-topbar-controls${showChromeSkeletons ? " is-loading" : ""}`}>
            <FirebaseGoogleAuthButton compact showUserMenu />
            <PwaInstallButton compact disabled={showChromeSkeletons} />
            {!user ? (
              <>
                <LanguageSwitcher compact selectId="docs-lang-select" disabled={showChromeSkeletons} />
                <ThemeSwitcher disabled={showChromeSkeletons} />
              </>
            ) : null}
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
                href={NAVAI_PANEL_HREF}
                className={`docs-top-tab${isPanelTabActive ? " is-active" : ""}${
                  isTopbarLinkDisabled(NAVAI_PANEL_HREF) ? " is-disabled" : ""
                }`}
                aria-disabled={isTopbarLinkDisabled(NAVAI_PANEL_HREF) ? true : undefined}
                tabIndex={isTopbarLinkDisabled(NAVAI_PANEL_HREF) ? -1 : undefined}
                onClick={(event) => {
                  if (isTopbarLinkDisabled(NAVAI_PANEL_HREF)) {
                    event.preventDefault();
                    return;
                  }
                  setIsMobileMenuOpen(false);
                }}
              >
                {messages.common.navaiPanel}
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

            <div className={`docs-mobile-menu-controls${showChromeSkeletons ? " is-loading" : ""}`}>
              <FirebaseGoogleAuthButton compact />
              <PwaInstallButton compact disabled={showChromeSkeletons} />
              <LanguageSwitcher
                compact
                selectId="docs-lang-select-mobile"
                disabled={showChromeSkeletons}
              />
              <ThemeSwitcher disabled={showChromeSkeletons} />
            </div>
          </div>
        </div>
      </div>

      <div className={`docs-shell${hasRightRailContent ? "" : " docs-shell--without-rightbar"}`}>
        {showChromeSkeletons ? (
          <aside className="docs-sidebar">
            <SidebarNavSkeleton withToc={false} />
          </aside>
        ) : (
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
        )}

        <article className="docs-main">
          {effectiveRightItems.length > 0 ? (
            <nav className="docs-mobile-toc" aria-label={resolvedRightTitle}>
              {effectiveRightItems.map((item) => (
                <a
                  key={`mobile-toc-${item.href}-${item.label}`}
                  href={item.href}
                  className={`docs-mobile-toc-link${normalizeHashHref(item.href) === activeRightHref ? " is-active" : ""}`}
                  onClick={(event) => {
                    setActiveRightHref(normalizeHashHref(item.href));
                    if (isInteractiveGuideHref(item.href)) {
                      event.preventDefault();
                      emitDocsSectionNavigation(item.href);

                      const normalizedHref = normalizeHashHref(item.href);
                      const nextUrl = `${window.location.pathname}${window.location.search}${normalizedHref}`;
                      window.history.pushState(null, "", nextUrl);
                    }
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          ) : null}

          {!hideMainHeader ? (
            <header className="docs-header">
              {displayBadge ? <p className="docs-badge">{displayBadge}</p> : null}
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

        {showChromeSkeletons ? (
          <aside className="docs-rightbar">
            <RightSidebarSkeleton lines={5} />
          </aside>
        ) : hasRightRailContent ? (
          <aside className="docs-rightbar">
            <p className="docs-sidebar-title">{resolvedRightTitle}</p>
            {shouldShowInstallationGuideStackSelector && installationGuide ? (
              <div
                className={`docs-rightbar-stack-field${
                  activeRightHref === installationGuideStackHref ? " is-active" : ""
                }`}
              >
                <label className="docs-rightbar-stack-label" htmlFor="docs-installation-stack-select">
                  {stripLeadingDecorativeText(installationGuide.tabsSection.title)}
                </label>
                <select
                  id="docs-installation-stack-select"
                  className="docs-rightbar-stack-select"
                  value={activeInstallationGuideStackValue}
                  onChange={(event) => handleInstallationGuideStackChange(event.target.value)}
                >
                  {installationGuideStackOptions.map((tab) => (
                    <option key={tab.value} value={tab.value}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <nav className="docs-toc">
              {desktopRightItems.map((item) => (
                <a
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={`docs-toc-link${normalizeHashHref(item.href) === activeRightHref ? " is-active" : ""}${
                    item.depth === 3 ? " is-subitem" : ""
                  }`}
                  onClick={(event) => {
                    setActiveRightHref(normalizeHashHref(item.href));
                    if (isInteractiveGuideHref(item.href)) {
                      event.preventDefault();
                      emitDocsSectionNavigation(item.href);

                      const normalizedHref = normalizeHashHref(item.href);
                      const nextUrl = `${window.location.pathname}${window.location.search}${normalizedHref}`;
                      window.history.pushState(null, "", nextUrl);
                    }
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div id="docs-rightbar-extra-slot" className="docs-rightbar-extra-slot" />
          </aside>
        ) : null}
      </div>

    </section>
  );
}

