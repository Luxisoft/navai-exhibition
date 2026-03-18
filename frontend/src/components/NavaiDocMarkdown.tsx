'use client';

import LibrariesGuide from "@/components/LibrariesGuide";
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import DocsCodeEditor, { extractCodeLanguageFromClassName } from "@/components/DocsCodeEditor";
import HomeUseCasesCarousel, { type HomeUseCaseCard } from "@/components/HomeUseCasesCarousel";
import InstallationApiGuide from "@/components/InstallationApiGuide";
import LegalDocsGuide from "@/components/LegalDocsGuide";
import localizedMarkdownRaw from "@/content/navai-readmes/localized-markdown.json";
import { resolveReadmeImageSrc, resolveReadmeLinkHref } from "@/lib/doc-readme";
import type { LanguageCode } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/provider";
import { isInteractiveLibrariesGuideSlug, supportsInteractiveLibrariesGuide } from "@/lib/libraries-guide";
import { isInteractiveLegalGuideSlug, supportsInteractiveLegalGuide } from "@/lib/legal-docs-guide";
import { stripLeadingDecorativeMarkdownText, stripLeadingDecorativeText } from "@/lib/decorative-text";
import { buildStableHeadingId, cleanHeadingText } from "@/lib/heading-id";
import {
  isInteractiveInstallationGuideSlug,
  supportsInteractiveInstallationGuide,
} from "@/lib/installation-api-guide";
import { normalizeMarkdownBlockFormatting } from "@/lib/markdown-normalization";

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

type NavaiDocPage = {
  slug: NavaiDocSlug;
  sourcePath: string;
  markdown: string;
};

type NavaiDocMarkdownProps = {
  doc: NavaiDocPage;
};

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

function normalizeHeadingText(value: string) {
  return stripLeadingDecorativeText(cleanHeadingText(value));
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
  const title = normalizeHeadingText(rawTitle);
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
  const cards: HomeUseCaseCard[] = [];

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

function serializeHomeUseCaseCards(cards: HomeUseCaseCard[]) {
  return encodeURIComponent(JSON.stringify(cards));
}

function parseSerializedHomeUseCaseCards(value: string | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(decodeURIComponent(value));
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.title !== "string" ||
        typeof item.description !== "string" ||
        typeof item.icon !== "string"
      ) {
        return [];
      }

      return [
        {
          title: item.title,
          description: item.description,
          icon: item.icon,
        },
      ];
    });
  } catch {
    return [];
  }
}

function renderHomeUseCaseCardsSection(headingLine: string, bodyLines: string[]) {
  const cards = parseHomeUseCaseCards(bodyLines);
  if (cards.length === 0) {
    return [headingLine, ...bodyLines];
  }

  return [
    headingLine,
    "",
    `<div class="docs-use-case-carousel" data-cards="${escapeHtml(serializeHomeUseCaseCards(cards))}"></div>`,
  ];
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

function normalizeHomeHeroTitle(value: string) {
  return stripLeadingDecorativeText(cleanHeadingText(value)).replace(/^NAVAI\s*(?:[:\-—–]\s*)?/iu, "").trim();
}

export default function NavaiDocMarkdown({ doc }: NavaiDocMarkdownProps) {
  const { language, messages } = useI18n();

  if (isInteractiveInstallationGuideSlug(doc.slug) && supportsInteractiveInstallationGuide(language)) {
    return (
      <div className="docs-markdown-body">
        <InstallationApiGuide slug={doc.slug} />
      </div>
    );
  }

  if (isInteractiveLibrariesGuideSlug(doc.slug) && supportsInteractiveLibrariesGuide(language)) {
    return (
      <div className="docs-markdown-body">
        <LibrariesGuide slug={doc.slug} />
      </div>
    );
  }

  if (isInteractiveLegalGuideSlug(doc.slug) && supportsInteractiveLegalGuide(language)) {
    return (
      <div className="docs-markdown-body">
        <LegalDocsGuide slug={doc.slug} />
      </div>
    );
  }

  const localizedMarkdown = LOCALIZED_MARKDOWN[doc.slug]?.[language as Exclude<LanguageCode, "en">];
  const rawMarkdownContent = localizedMarkdown ?? doc.markdown;
  const compactedHomeIntroMarkdown =
    doc.slug === "home" ? compactHomeIntroParagraph(rawMarkdownContent, language) : rawMarkdownContent;
  const normalizedMarkdownContent = normalizeMarkdownBlockFormatting(compactedHomeIntroMarkdown);
  const homeAdjustedMarkdown =
    doc.slug === "home" ? transformHomeMarkdown(normalizedMarkdownContent) : normalizedMarkdownContent;
  const sanitizedMarkdownContent = stripLeadingDecorativeMarkdownText(homeAdjustedMarkdown);
  const markdownContent = sanitizedMarkdownContent;
  const installLinksByHref: Record<string, string> = {
    "/documentation/installation-api": messages.common.docsInstallApi,
    "/documentation/installation-web": messages.common.docsInstallWeb,
    "/documentation/installation-mobile": messages.common.docsInstallMobile,
  };

  return (
    <div className={`docs-markdown-body${doc.slug === "home" ? " is-root-doc" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          div: ({ children, className, ...props }) => {
            const divProps = props as {
              "data-cards"?: string;
              dataCards?: string;
            };
            const isUseCaseCarouselContainer =
              doc.slug === "home" &&
              typeof className === "string" &&
              className.split(/\s+/).includes("docs-use-case-carousel");

            if (isUseCaseCarouselContainer) {
              const cards = parseSerializedHomeUseCaseCards(divProps["data-cards"] ?? divProps.dataCards);
              return <HomeUseCasesCarousel cards={cards} />;
            }

            const isInstallLinksContainer =
              doc.slug === "home" &&
              typeof className === "string" &&
              className.split(/\s+/).includes("docs-install-links");

            if (!isInstallLinksContainer) {
              return <div className={className}>{children}</div>;
            }
            return <div className={className}>{children}</div>;
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
            const title = normalizeHeadingText(extractNodeText(children));
            const id = buildStableHeadingId({
              title,
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
            const title = normalizeHeadingText(extractNodeText(children));
            const id = buildStableHeadingId({
              title,
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
