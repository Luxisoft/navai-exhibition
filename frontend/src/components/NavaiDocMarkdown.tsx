'use client';

import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import DocsCodeEditor, { extractCodeLanguageFromClassName } from "@/components/DocsCodeEditor";
import localizedMarkdownRaw from "@/content/navai-readmes/localized-markdown.json";
import type { LanguageCode } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { stripLeadingDecorativeMarkdownText, stripLeadingDecorativeText } from "@/lib/decorative-text";
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

const HOME_USE_CASES_HEADING_ICON = "🚀";
const HOME_REMOVED_HEADING_ICONS = ["📦", "🧩", "📱"];
const HOME_USE_CASE_CARD_ICONS = ["💼", "🛒", "🤝", "🚚", "🏥", "🏦", "⚙️", "🧭"];
const HOME_ACCESSIBILITY_ICON = "♿";
const HOME_ACCESSIBILITY_KEYWORDS = [
  "accesibilidad",
  "discapacidad visual",
  "deficiencia visual",
  "accessibility",
  "visual impairment",
  "low vision",
  "blind",
];
const HOME_HERO_TITLE_PREFIX_PATTERN = /^\s*(?:🦉\s*)?NAVAI\s*(?:[:\-—–]\s*)?/iu;

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanInlineMarkdown(value: string) {
  return value.replace(/\*\*/g, "").replace(/`/g, "").trim();
}

function normalizeUseCaseText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeUseCaseKeywordText(value: string) {
  return normalizeUseCaseText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function resolveUseCaseCardIcon(title: string, fallbackIndex: number) {
  const normalizedTitle = normalizeUseCaseKeywordText(title);
  const matchesAccessibilityCase = HOME_ACCESSIBILITY_KEYWORDS.some((keyword) =>
    normalizedTitle.includes(normalizeUseCaseKeywordText(keyword))
  );

  if (matchesAccessibilityCase) {
    return HOME_ACCESSIBILITY_ICON;
  }

  return HOME_USE_CASE_CARD_ICONS[fallbackIndex % HOME_USE_CASE_CARD_ICONS.length];
}

function summarizeUseCaseTitle(title: string) {
  const withoutCommonQualifiers = normalizeUseCaseText(
    title
      .replace(/\([^)]{2,60}\)/g, "")
      .replace(/\[[^\]]{2,60}\]/g, "")
  );
  const baseTitle = withoutCommonQualifiers || normalizeUseCaseText(title);
  const separators = [" - ", " / ", ", "];

  for (const separator of separators) {
    const separatorIndex = baseTitle.indexOf(separator);
    if (separatorIndex > 10 && separatorIndex <= 46) {
      return baseTitle.slice(0, separatorIndex).trim();
    }
  }

  return baseTitle;
}

function summarizeUseCaseDescription(description: string) {
  const normalizedDescription = normalizeUseCaseText(description);
  if (!normalizedDescription) {
    return "";
  }

  const sentenceMatch = normalizedDescription.match(/^(.+?[.!?。！？])(?:\s|$)/u);
  return (sentenceMatch ? sentenceMatch[1] : normalizedDescription).trim();
}

function isMarkdownHeadingLevel3(line: string) {
  return /^###\s+/.test(line.trim());
}

function renderMarkdownHeadingLineAsHtml(headingLine: string, lineNumber: number) {
  const headingMatch = headingLine.match(/^\s*(#{2,6})\s+(.+)$/u);
  if (!headingMatch) {
    return headingLine;
  }

  const [, hashes, rawTitle] = headingMatch;
  const depth = Math.min(6, Math.max(2, hashes.length));
  const title = cleanHeadingText(rawTitle);
  const id = buildStableHeadingId({
    title,
    line: lineNumber,
    column: 1,
  });

  return `<h${depth} id="${escapeHtml(id)}">${escapeHtml(title)}</h${depth}>`;
}

function splitUseCaseTitleAndDescription(bulletContent: string) {
  const cleaned = cleanInlineMarkdown(bulletContent);
  const separatorMatch = cleaned.match(/^(.+?)\s*[:：]\s*(.+)$/u);

  if (!separatorMatch) {
    return {
      title: cleaned,
      description: "",
    };
  }

  return {
    title: separatorMatch[1]?.trim() ?? cleaned,
    description: separatorMatch[2]?.trim() ?? "",
  };
}

function parseHomeUseCaseCards(bodyLines: string[]) {
  const cards: Array<{ title: string; description: string; icon: string }> = [];

  for (const rawLine of bodyLines) {
    const line = rawLine.trim();
    if (!line.startsWith("- ")) {
      continue;
    }

    const bulletContent = line.slice(2).trim();
    const { title, description } = splitUseCaseTitleAndDescription(bulletContent);

    if (!title) {
      continue;
    }

    const summarizedTitle = summarizeUseCaseTitle(title);
    const summarizedDescription = summarizeUseCaseDescription(description);

    cards.push({
      title: summarizedTitle,
      description: summarizedDescription,
      icon: resolveUseCaseCardIcon(summarizedTitle, cards.length),
    });
  }

  return cards;
}

function renderHomeUseCaseCardsSection(headingLine: string, bodyLines: string[]) {
  const cards = parseHomeUseCaseCards(bodyLines);
  if (cards.length === 0) {
    return [headingLine, ...bodyLines];
  }

  const sectionLines: string[] = [headingLine, "", '<div class="docs-use-case-grid">'];

  for (const card of cards) {
    sectionLines.push(
      '  <article class="docs-use-case-card">',
      '    <div class="docs-use-case-card-head">',
      `      <span class="docs-use-case-card-icon" aria-hidden="true">${card.icon}</span>`,
      `      <h4>${escapeHtml(card.title)}</h4>`,
      "    </div>"
    );

    if (card.description) {
      sectionLines.push(`    <p>${escapeHtml(card.description)}</p>`);
    }

    sectionLines.push("  </article>");
  }

  sectionLines.push("</div>");
  return sectionLines;
}

function transformHomeMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const headingIndexes: number[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (isMarkdownHeadingLevel3(lines[index])) {
      headingIndexes.push(index);
    }
  }

  if (headingIndexes.length === 0) {
    return markdown;
  }

  const transformed: string[] = [];
  let cursor = 0;

  for (let index = 0; index < headingIndexes.length; index += 1) {
    const headingStart = headingIndexes[index];
    const nextHeadingStart = headingIndexes[index + 1] ?? lines.length;
    const headingLine = lines[headingStart];
    const headingLineHtml = renderMarkdownHeadingLineAsHtml(headingLine, headingStart + 1);
    const bodyLines = lines.slice(headingStart + 1, nextHeadingStart);

    transformed.push(...lines.slice(cursor, headingStart));

    const shouldRemoveSection = HOME_REMOVED_HEADING_ICONS.some((icon) => headingLine.includes(icon));
    if (shouldRemoveSection) {
      cursor = nextHeadingStart;
      continue;
    }

    if (headingLine.includes(HOME_USE_CASES_HEADING_ICON)) {
      transformed.push('<div class="docs-home-section-separator" aria-hidden="true"></div>');
      transformed.push(...renderHomeUseCaseCardsSection(headingLineHtml, bodyLines));
    } else {
      transformed.push(headingLineHtml, ...bodyLines);
    }

    cursor = nextHeadingStart;
  }

  if (cursor < lines.length) {
    transformed.push(...lines.slice(cursor));
  }

  return transformed.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function compactHomeIntroParagraph(markdown: string, language: LanguageCode) {
  if (language !== "es") {
    return markdown;
  }

  const lines = markdown.split(/\r?\n/);
  const horizontalRuleIndex = lines.findIndex((line) => line.trim() === "---");
  const installLinksIndex = lines.findIndex((line) => line.includes('class="docs-install-links"'));

  if (horizontalRuleIndex === -1 || installLinksIndex === -1 || installLinksIndex <= horizontalRuleIndex) {
    return markdown;
  }

  const compactIntroText =
    "🎙️🤖 NAVAI permite controlar aplicaciones con voz natural para navegar y ejecutar funciones en tiempo real, mejorando además la accesibilidad web y móvil con interacción manos libres.";

  const updatedLines = [
    ...lines.slice(0, horizontalRuleIndex + 1),
    "",
    compactIntroText,
    "",
    ...lines.slice(installLinksIndex),
  ];

  return updatedLines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function normalizeMarkdownBlockFormatting(markdown: string) {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/```(?=#{2,6}\s)/g, "```\n")
    .replace(/([^\n])```([a-zA-Z0-9_+-]+)/g, "$1\n```$2");
}

function stripMarkdownHeadingMarkers(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  let insideCodeFence = false;

  const cleanedLines = lines.map((line) => {
    if (/^\s*```/.test(line)) {
      insideCodeFence = !insideCodeFence;
      return line;
    }

    if (insideCodeFence) {
      return line;
    }

    return line.replace(/^(\s*)#{2,6}\s+/, "$1");
  });

  return cleanedLines.join("\n");
}

function normalizeHomeHeroTitle(value: string) {
  return stripLeadingDecorativeText(cleanHeadingText(value)).replace(/^NAVAI\s*(?:[:\-—–]\s*)?/iu, "").trim();
}

export default function NavaiDocMarkdown({ doc }: NavaiDocMarkdownProps) {
  const { language, messages } = useI18n();
  const localizedMarkdown = LOCALIZED_MARKDOWN[doc.slug]?.[language as Exclude<LanguageCode, "en">];
  const rawMarkdownContent = localizedMarkdown ?? doc.markdown;
  const compactedHomeIntroMarkdown =
    doc.slug === "home" ? compactHomeIntroParagraph(rawMarkdownContent, language) : rawMarkdownContent;
  const normalizedMarkdownContent = normalizeMarkdownBlockFormatting(compactedHomeIntroMarkdown);
  const homeAdjustedMarkdown =
    doc.slug === "home" ? transformHomeMarkdown(normalizedMarkdownContent) : normalizedMarkdownContent;
  const sanitizedMarkdownContent = stripLeadingDecorativeMarkdownText(homeAdjustedMarkdown);
  const markdownContent = stripMarkdownHeadingMarkers(sanitizedMarkdownContent);
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
          pre: ({ children }) => {
            const childNodes = Children.toArray(children);
            const codeNode = childNodes.find((child) => isValidElement(child));

            if (!isValidElement<{ children?: ReactNode; className?: string }>(codeNode)) {
              return <pre>{children}</pre>;
            }

            const rawCode = extractNodeText(codeNode.props.children).replace(/\n$/, "");
            const language = extractCodeLanguageFromClassName(codeNode.props.className);
            return <DocsCodeEditor code={rawCode} language={language} />;
          },
          table: ({ children, className }) => {
            return (
              <div className="docs-table-wrap">
                <table className={className}>{children}</table>
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
          h1: ({ children, className }) => {
            if (doc.slug !== "home") {
              return <h1 className={className}>{children}</h1>;
            }

            return <h1 className={className}>{normalizeHomeHeroTitle(extractNodeText(children))}</h1>;
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
