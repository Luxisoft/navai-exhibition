'use client';

import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import localizedMarkdownRaw from "@/content/navai-readmes/localized-markdown.json";
import type { LanguageCode } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { buildStableHeadingId, cleanHeadingText } from "@/lib/heading-id";

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

type NavaiDocPage = {
  slug: NavaiDocSlug;
  sourcePath: string;
  markdown: string;
};

type NavaiDocMarkdownProps = {
  doc: NavaiDocPage;
};

const GITHUB_BLOB_BASE = "https://github.com/Luxisoft/navai/blob/main";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/Luxisoft/navai/main";
const WORDPRESS_INSTALL_DOC_HREF = "/documentation/installation-wordpress";
const WORDPRESS_INSTALL_LABEL_BY_LANGUAGE: Record<LanguageCode, string> = {
  en: "WordPress Plugin",
  es: "Plugin para wordpress",
  fr: "Plugin WordPress",
  pt: "Plugin para WordPress",
  zh: "WordPress 插件",
  ja: "WordPress プラグイン",
  ru: "Плагин WordPress",
  ko: "워드프레스 플러그인",
  hi: "WordPress प्लगइन",
};

const README_PATH_TO_SLUG = new Map<string, NavaiDocSlug>([
  ["README.md", "home"],
  ["README.es.md", "installation-api"],
  ["apps/playground-api/README.md", "playground-api"],
  ["apps/playground-web/README.md", "playground-web"],
  ["apps/playground-mobile/README.md", "playground-mobile"],
  ["packages/voice-backend/README.md", "voice-backend"],
  ["packages/voice-frontend/README.md", "voice-frontend"],
  ["packages/voice-mobile/README.md", "voice-mobile"],
]);

type LocalizedMarkdownMap = Partial<
  Record<NavaiDocSlug, Partial<Record<Exclude<LanguageCode, "en">, string>>>
>;

const LOCALIZED_MARKDOWN = localizedMarkdownRaw as LocalizedMarkdownMap;

function normalizeRepoPath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function canonicalizeReadmePath(value: string) {
  return value.replace(/README\.(en|es)\.md$/i, "README.md");
}

function resolveReadmeLinkHref(href: string, sourcePath: string) {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("/") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  ) {
    return href;
  }

  const [rawPath, rawHash] = href.split("#");
  const sourceDir = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : ".";
  const joined = rawPath.startsWith("/")
    ? rawPath.slice(1)
    : normalizeRepoPath(`${sourceDir}/${rawPath}`);
  const resolvedPath = normalizeRepoPath(joined);
  const canonicalPath = canonicalizeReadmePath(resolvedPath);
  const maybeSlug = README_PATH_TO_SLUG.get(canonicalPath);
  const hash = rawHash ? `#${rawHash}` : "";

  if (maybeSlug) {
    return `/documentation/${maybeSlug}${hash}`;
  }

  return `${GITHUB_BLOB_BASE}/${encodeURI(resolvedPath)}${hash}`;
}

function resolveReadmeImageSrc(src: string, sourcePath: string) {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }

  const sourceDir = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : ".";
  const joined = src.startsWith("/") ? src.slice(1) : normalizeRepoPath(`${sourceDir}/${src}`);
  const resolvedPath = normalizeRepoPath(joined);

  return `${GITHUB_RAW_BASE}/${encodeURI(resolvedPath)}`;
}

function extractNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => extractNodeText(child)).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractNodeText(node.props.children);
  }

  return "";
}

export default function NavaiDocMarkdown({ doc }: NavaiDocMarkdownProps) {
  const { language, messages } = useI18n();
  const localizedMarkdown = LOCALIZED_MARKDOWN[doc.slug]?.[language as Exclude<LanguageCode, "en">];
  const markdownContent = localizedMarkdown ?? doc.markdown;
  const wordpressInstallLabel = WORDPRESS_INSTALL_LABEL_BY_LANGUAGE[language] ?? WORDPRESS_INSTALL_LABEL_BY_LANGUAGE.en;

  const installLinksByHref: Record<string, string> = {
    "/documentation/installation-api": messages.common.docsInstallApi,
    "/documentation/installation-web": messages.common.docsInstallWeb,
    "/documentation/installation-mobile": messages.common.docsInstallMobile,
    [WORDPRESS_INSTALL_DOC_HREF]: wordpressInstallLabel,
  };

  return (
    <div className={`docs-markdown-body${doc.slug === "home" ? " is-root-doc" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          div: ({ children, className }) => {
            const isInstallLinksContainer =
              doc.slug === "home" &&
              typeof className === "string" &&
              className.split(/\s+/).includes("docs-install-links");

            if (!isInstallLinksContainer) {
              return <div className={className}>{children}</div>;
            }

            const childNodes = Children.toArray(children);
            const hasWordPressLink = childNodes.some(
              (child) =>
                isValidElement<{ href?: string }>(child) &&
                typeof child.props.href === "string" &&
                child.props.href === WORDPRESS_INSTALL_DOC_HREF
            );

            return (
              <div className={className}>
                {children}
                {!hasWordPressLink ? (
                  <a className="docs-install-link" href={WORDPRESS_INSTALL_DOC_HREF}>
                    {wordpressInstallLabel}
                  </a>
                ) : null}
              </div>
            );
          },
          h2: ({ children, node }) => {
            const id = buildStableHeadingId({
              title: cleanHeadingText(extractNodeText(children)),
              offset: node?.position?.start?.offset ?? null,
              line: node?.position?.start?.line ?? null,
              column: node?.position?.start?.column ?? null,
            });
            return <h2 id={id}>{children}</h2>;
          },
          h3: ({ children, node }) => {
            const id = buildStableHeadingId({
              title: cleanHeadingText(extractNodeText(children)),
              offset: node?.position?.start?.offset ?? null,
              line: node?.position?.start?.line ?? null,
              column: node?.position?.start?.column ?? null,
            });
            return <h3 id={id}>{children}</h3>;
          },
          a: ({ href = "", children, className }) => {
            const resolvedHref = resolveReadmeLinkHref(href, doc.sourcePath);
            const isExternal =
              resolvedHref.startsWith("http://") || resolvedHref.startsWith("https://");

            const isInstallLink = typeof className === "string" && className.includes("docs-install-link");
            const installLabel =
              doc.slug === "home" && isInstallLink ? installLinksByHref[resolvedHref] : undefined;

            return (
              <a
                className={className}
                href={resolvedHref}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noreferrer noopener" : undefined}
              >
                {installLabel ?? children}
              </a>
            );
          },
          img: ({ src = "", alt = "" }) => {
            const safeSrc = typeof src === "string" ? src : "";
            const safeAlt = typeof alt === "string" ? alt : "";
            const resolvedSrc = resolveReadmeImageSrc(safeSrc, doc.sourcePath);
            return <img src={resolvedSrc} alt={safeAlt} loading="lazy" />;
          },
        }}
      >
        {markdownContent}
      </ReactMarkdown>
    </div>
  );
}
