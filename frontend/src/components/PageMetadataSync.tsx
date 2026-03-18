'use client';

import { useEffect, useMemo } from "react";

import type { NavaiDocSlug } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/provider";
import { NAVAI_PANEL_HREF } from "@/lib/auth-redirect";
import { stripLeadingDecorativeText } from "@/lib/decorative-text";
import { normalizePathname, usePathname } from "@/platform/navigation";

const SITE_URL = "https://navai.luxisoft.com";
const BANNER_URL = `${SITE_URL}/navai_banner.webp`;
const LOGO_URL = `${SITE_URL}/navai_logo.webp`;

type PageMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
};

function setMetaContent(selector: string, content: string) {
  const meta = document.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    return;
  }
  if (meta.content !== content) {
    meta.content = content;
  }
}

function setCanonicalHref(canonicalUrl: string) {
  const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalLink) {
    return;
  }
  if (canonicalLink.href !== canonicalUrl) {
    canonicalLink.href = canonicalUrl;
  }
}

function resolvePageMetadata(options: {
  pathname: string;
  homeTagline: string;
  docsLabel: string;
  implementationLabel: string;
  implementationTitle: string;
  implementationDescription: string;
  panelTitle: string;
  panelDescription: string;
  docsDescription: string;
  docsEntries: Partial<Record<NavaiDocSlug, { title: string; summary: string }>>;
}) {
  const {
    pathname,
    homeTagline,
    docsLabel,
    implementationLabel,
    implementationTitle,
    implementationDescription,
    panelTitle,
    panelDescription,
    docsDescription,
    docsEntries,
  } = options;
  const resolvedHomeTagline = stripLeadingDecorativeText(homeTagline);
  const resolvedDocsLabel = stripLeadingDecorativeText(docsLabel);
  const resolvedImplementationLabel = stripLeadingDecorativeText(implementationLabel);
  const resolvedImplementationTitle = stripLeadingDecorativeText(implementationTitle);
  const resolvedImplementationDescription = stripLeadingDecorativeText(implementationDescription);
  const resolvedPanelTitle = stripLeadingDecorativeText(panelTitle);
  const resolvedPanelDescription = stripLeadingDecorativeText(panelDescription);
  const resolvedDocsDescription = stripLeadingDecorativeText(docsDescription);

  if (pathname === "/") {
    const title = `NAVAI | ${resolvedHomeTagline}`;
    const description = `${resolvedHomeTagline}. ${resolvedDocsLabel} | ${resolvedImplementationLabel}.`;
    return {
      title,
      description,
      canonicalUrl: new URL("/", SITE_URL).toString(),
    } satisfies PageMetadata;
  }

  if (pathname === "/request-implementation") {
    return {
      title: `NAVAI | ${resolvedImplementationTitle}`,
      description: resolvedImplementationDescription,
      canonicalUrl: new URL("/request-implementation", SITE_URL).toString(),
    } satisfies PageMetadata;
  }

  if (pathname === NAVAI_PANEL_HREF) {
    return {
      title: `NAVAI | ${resolvedPanelTitle}`,
      description: resolvedPanelDescription,
      canonicalUrl: new URL(NAVAI_PANEL_HREF, SITE_URL).toString(),
    } satisfies PageMetadata;
  }

  if (pathname === "/documentation" || pathname.startsWith("/documentation/")) {
    const slug = pathname === "/documentation" ? "home" : pathname.slice("/documentation/".length).trim() || "home";
    const localizedDoc = docsEntries[slug as NavaiDocSlug];

    return {
      title: localizedDoc
        ? `NAVAI | ${resolvedDocsLabel}: ${stripLeadingDecorativeText(localizedDoc.title)}`
        : `NAVAI | ${resolvedDocsLabel}`,
      description: localizedDoc?.summary ? stripLeadingDecorativeText(localizedDoc.summary) : resolvedDocsDescription,
      canonicalUrl: new URL(pathname, SITE_URL).toString(),
    } satisfies PageMetadata;
  }

  return null;
}

export default function PageMetadataSync() {
  const { language, messages } = useI18n();
  const pathname = usePathname();
  const normalizedPathname = useMemo(() => normalizePathname(pathname), [pathname]);
  const effectivePathname = useMemo(() => {
    if (typeof window === "undefined") {
      return normalizedPathname;
    }

    const runtimePathname = normalizePathname(window.location.pathname);
      return normalizedPathname === "/" && runtimePathname !== "/" ? runtimePathname : normalizedPathname;
  }, [normalizedPathname]);
  const localizedDocs = messages.docsCatalog;

  const pageMetadata = useMemo(
    () =>
      resolvePageMetadata({
        pathname: effectivePathname,
        homeTagline: messages.home.tagline,
        docsLabel: messages.common.documentation,
        implementationLabel: messages.common.requestImplementation,
        implementationTitle: messages.implementationPage.title,
        implementationDescription: messages.implementationPage.description,
        panelTitle: messages.panelPage.title,
        panelDescription: messages.panelPage.description,
        docsDescription: messages.docsPage.description,
        docsEntries: localizedDocs.entries,
      }),
    [
      effectivePathname,
      messages.home.tagline,
      messages.common.documentation,
      messages.common.requestImplementation,
      messages.implementationPage.title,
      messages.implementationPage.description,
      messages.panelPage.title,
      messages.panelPage.description,
      messages.docsPage.description,
      localizedDocs.entries,
    ]
  );

  const primaryNavItems = useMemo(
    () => [
      {
        name: stripLeadingDecorativeText(messages.common.documentation),
        url: new URL("/documentation/home", SITE_URL).toString(),
      },
      {
        name: stripLeadingDecorativeText(messages.common.requestImplementation),
        url: new URL("/request-implementation", SITE_URL).toString(),
      },
    ],
    [messages.common.documentation, messages.common.requestImplementation]
  );

  const structuredDataJson = useMemo(() => {
    if (!pageMetadata) {
      return null;
    }

    const entries: Array<Record<string, unknown>> = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "NAVAI",
        url: SITE_URL,
        logo: LOGO_URL,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "NAVAI",
        url: SITE_URL,
        inLanguage: language,
        description: pageMetadata.description,
        publisher: {
          "@type": "Organization",
          name: "NAVAI",
          url: SITE_URL,
          logo: LOGO_URL,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/documentation/home?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "NAVAI main sections",
        itemListElement: primaryNavItems.map((item, index) => ({
          "@type": "SiteNavigationElement",
          position: index + 1,
          name: item.name,
          url: item.url,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: pageMetadata.title,
        description: pageMetadata.description,
        url: pageMetadata.canonicalUrl,
        isPartOf: {
          "@type": "WebSite",
          name: "NAVAI",
          url: SITE_URL,
        },
      },
    ];

    return JSON.stringify(entries);
  }, [language, pageMetadata, primaryNavItems]);

  useEffect(() => {
    if (!pageMetadata) {
      return;
    }

    document.title = pageMetadata.title;
    setMetaContent('meta[name="description"]', pageMetadata.description);
    setMetaContent('meta[property="og:url"]', pageMetadata.canonicalUrl);
    setMetaContent('meta[property="og:title"]', pageMetadata.title);
    setMetaContent('meta[property="og:description"]', pageMetadata.description);
    setMetaContent('meta[property="og:image"]', BANNER_URL);
    setMetaContent('meta[name="twitter:title"]', pageMetadata.title);
    setMetaContent('meta[name="twitter:description"]', pageMetadata.description);
    setMetaContent('meta[name="twitter:image"]', BANNER_URL);
    setCanonicalHref(pageMetadata.canonicalUrl);
  }, [pageMetadata]);

  useEffect(() => {
    if (!structuredDataJson) {
      return;
    }

    const script = document.querySelector<HTMLScriptElement>("#navai-structured-data[data-navai-structured-data]");
    if (!script) {
      return;
    }

    if (script.textContent !== structuredDataJson) {
      script.textContent = structuredDataJson;
    }
  }, [structuredDataJson]);

  return null;
}
