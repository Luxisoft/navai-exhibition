import { NextRequest, NextResponse } from "next/server";

import { getLocalizedNavaiDocs } from "@/i18n/docs-catalog";
import { APP_MESSAGES, DEFAULT_LANGUAGE, type LanguageCode } from "@/i18n/messages";
import { getLocalizedWordpressPage } from "@/i18n/wordpress-page";
import { NAVAI_DOCS, getNavaiDocPageBySlug, type NavaiDocPage } from "@/lib/navai-docs";

type SearchScope = "documentation" | "implementation";

type SearchResult = {
  id: string;
  title: string;
  snippet: string;
  href: string;
  scope: SearchScope;
};

type RankedSearchResult = SearchResult & {
  score: number;
};

let docsCachePromise: Promise<NavaiDocPage[]> | null = null;

function isLanguageCode(value: string | null): value is LanguageCode {
  return Boolean(value && Object.prototype.hasOwnProperty.call(APP_MESSAGES, value));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAllTokens(text: string, tokens: string[]) {
  return tokens.every((token) => text.includes(token));
}

function scoreMatch(title: string, body: string, query: string, tokens: string[]) {
  let score = 0;

  if (title.includes(query)) {
    score += 18;
  }
  if (body.includes(query)) {
    score += 10;
  }

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 5;
    }
    if (body.includes(token)) {
      score += 3;
    }
  }

  return score;
}

function makeSnippet(rawText: string, query: string) {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryIndex = lowerText.indexOf(lowerQuery);

  if (queryIndex < 0) {
    return text.length > 170 ? `${text.slice(0, 167)}...` : text;
  }

  const start = Math.max(0, queryIndex - 70);
  const end = Math.min(text.length, queryIndex + 100);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

async function getDocsCache() {
  if (!docsCachePromise) {
    docsCachePromise = Promise.all(
      NAVAI_DOCS.filter((doc) => doc.slug !== "playground-stores").map((doc) => getNavaiDocPageBySlug(doc.slug))
    ).then((pages) =>
      pages.filter((page): page is NavaiDocPage => Boolean(page))
    );
  }

  return docsCachePromise;
}

function buildImplementationSearchEntries(language: LanguageCode, query: string, tokens: string[]) {
  const messages = APP_MESSAGES[language];
  const implementation = messages.implementationPage;
  const entries: RankedSearchResult[] = [];

  const pageBody = normalizeText(
    [
      implementation.title,
      implementation.description,
      ...implementation.sections.map((section) => section.title),
      ...implementation.sections.map((section) => section.description),
      ...implementation.sections.flatMap((section) => section.bullets ?? []),
      implementation.plansTitle,
      ...implementation.plans.map((plan) => plan.name),
      ...implementation.plans.map((plan) => plan.menuRange),
      ...implementation.plans.map((plan) => plan.timeline),
      ...implementation.plans.map((plan) => plan.price),
      ...implementation.plans.flatMap((plan) => plan.highlights),
      implementation.whatsappButtonLabel,
      implementation.whatsappPrefill,
      implementation.contactSectionTitle,
      implementation.contactSectionDescription,
      implementation.contactNameLabel,
      implementation.contactEmailLabel,
      implementation.contactCompanyLabel,
      implementation.contactWhatsappLabel,
      implementation.contactMessageLabel,
      implementation.contactNameRequiredMessage,
      implementation.contactEmailRequiredMessage,
      implementation.contactEmailInvalidMessage,
      implementation.contactMessageRequiredMessage,
      implementation.contactCaptchaRequiredMessage,
      implementation.contactCaptchaNotReadyMessage,
      implementation.contactCaptchaConfigMessage,
      implementation.contactSendingLabel,
      implementation.contactSuccessMessage,
      implementation.contactErrorMessage,
      implementation.contactSubmitLabel,
      implementation.contactDisclaimer,
    ].join(" ")
  );

  const pageTitle = normalizeText(implementation.title);

  if (containsAllTokens(`${pageTitle} ${pageBody}`, tokens)) {
    entries.push({
      id: "impl-page",
      href: "/request-implementation",
      scope: "implementation",
      title: implementation.title,
      snippet: makeSnippet(implementation.description, query),
      score: scoreMatch(pageTitle, pageBody, query, tokens),
    });
  }

  for (const section of implementation.sections) {
    const sectionBodyRaw = [section.description, ...(section.bullets ?? [])].join(" ");
    const sectionText = normalizeText(`${section.title} ${sectionBodyRaw}`);
    const sectionTitle = normalizeText(section.title);

    if (!containsAllTokens(sectionText, tokens)) {
      continue;
    }

    entries.push({
      id: `impl-section-${section.id}`,
      href: `/request-implementation#${section.id}`,
      scope: "implementation",
      title: section.title,
      snippet: makeSnippet(sectionBodyRaw, query),
      score: scoreMatch(sectionTitle, sectionText, query, tokens),
    });
  }

  if (containsAllTokens(normalizeText(implementation.plansTitle), tokens)) {
    entries.push({
      id: "impl-plans",
      href: "/request-implementation#plans",
      scope: "implementation",
      title: implementation.plansTitle,
      snippet: makeSnippet(
        implementation.plans
          .map((plan) => `${plan.name} ${plan.menuRange} ${plan.price}`)
          .join(" "),
        query
      ),
      score: scoreMatch(
        normalizeText(implementation.plansTitle),
        normalizeText(implementation.plans.map((plan) => `${plan.name} ${plan.menuRange} ${plan.price}`).join(" ")),
        query,
        tokens
      ),
    });
  }

  return entries;
}

function buildWordpressSearchEntries(language: LanguageCode, query: string, tokens: string[]) {
  const wordpress = getLocalizedWordpressPage(language);
  const entries: RankedSearchResult[] = [];

  const pageBodyRaw = [
    wordpress.title,
    wordpress.description,
    ...wordpress.sections.map((section) => section.title),
    ...wordpress.sections.map((section) => section.description),
    ...wordpress.sections.flatMap((section) => section.bullets ?? []),
  ].join(" ");

  const pageTitle = normalizeText(wordpress.title);
  const pageBody = normalizeText(pageBodyRaw);

  if (containsAllTokens(`${pageTitle} ${pageBody}`, tokens)) {
    entries.push({
      id: "wordpress-page",
      href: "/wordpress",
      scope: "documentation",
      title: wordpress.title,
      snippet: makeSnippet(wordpress.description, query),
      score: scoreMatch(pageTitle, pageBody, normalizeText(query), tokens),
    });
  }

  for (const section of wordpress.sections) {
    const sectionBodyRaw = [section.description, ...(section.bullets ?? [])].join(" ");
    const sectionText = normalizeText(`${section.title} ${sectionBodyRaw}`);
    const sectionTitle = normalizeText(section.title);

    if (!containsAllTokens(sectionText, tokens)) {
      continue;
    }

    entries.push({
      id: `wordpress-section-${section.id}`,
      href: `/wordpress#${section.id}`,
      scope: "documentation",
      title: section.title,
      snippet: makeSnippet(sectionBodyRaw, query),
      score: scoreMatch(sectionTitle, sectionText, normalizeText(query), tokens),
    });
  }

  return entries;
}

function dedupeResults(results: RankedSearchResult[]) {
  const byKey = new Map<string, RankedSearchResult>();

  for (const item of results) {
    const key = `${item.href}::${item.title}`;
    const previous = byKey.get(key);
    if (!previous || previous.score < item.score) {
      byKey.set(key, item);
    }
  }

  return [...byKey.values()];
}

export async function GET(request: NextRequest) {
  const queryRaw = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const languageRaw = request.nextUrl.searchParams.get("lang");
  const language = isLanguageCode(languageRaw) ? languageRaw : DEFAULT_LANGUAGE;

  if (queryRaw.length < 2) {
    return NextResponse.json({ results: [] as SearchResult[] });
  }

  const query = normalizeText(queryRaw);
  const tokens = query.split(/\s+/).filter(Boolean);
  const ranked: RankedSearchResult[] = [];

  const docs = await getDocsCache();
  const docsPrefix = APP_MESSAGES[language].common.documentation;
  const localizedDocs = getLocalizedNavaiDocs(language);

  for (const doc of docs) {
    const localizedMeta = localizedDocs.entries[doc.slug];
    const localizedDocTitle = localizedMeta?.title ?? doc.title;
    const localizedDocSummary = localizedMeta?.summary ?? doc.summary;
    const localizedTitle = `${docsPrefix}: ${localizedDocTitle}`;
    const plainText = stripMarkdown(doc.markdown);
    const pageBodyRaw = `${localizedDocSummary} ${plainText}`;
    const pageText = normalizeText(`${localizedTitle} ${pageBodyRaw}`);
    const pageTitle = normalizeText(localizedTitle);

    if (containsAllTokens(pageText, tokens)) {
      ranked.push({
        id: `doc-page-${doc.slug}`,
        href: `/documentation/${doc.slug}`,
        scope: "documentation",
        title: localizedTitle,
        snippet: makeSnippet(pageBodyRaw, queryRaw),
        score: scoreMatch(pageTitle, pageText, query, tokens),
      });
    }

    for (const section of doc.sections) {
      const sectionBody = normalizeText(`${section.title} ${localizedDocTitle} ${localizedDocSummary}`);
      if (!containsAllTokens(sectionBody, tokens)) {
        continue;
      }

      ranked.push({
        id: `doc-section-${doc.slug}-${section.id}`,
        href: `/documentation/${doc.slug}#${section.id}`,
        scope: "documentation",
        title: `${localizedDocTitle} / ${section.title}`,
        snippet: localizedDocSummary,
        score: scoreMatch(normalizeText(section.title), sectionBody, query, tokens),
      });
    }
  }

  ranked.push(...buildImplementationSearchEntries(language, queryRaw, tokens));
  ranked.push(...buildWordpressSearchEntries(language, queryRaw, tokens));

  const results = dedupeResults(ranked)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map((item) => ({
      id: item.id,
      title: item.title,
      snippet: item.snippet,
      href: item.href,
      scope: item.scope,
    }));

  return NextResponse.json({ results });
}
