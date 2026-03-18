import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";

import { resolveProjectRoot } from "../lib/project-root";

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

type NavaiDocMeta = {
  slug: string;
  title: string;
  summary: string;
  fileName: string;
};

type NavaiDocSection = {
  id: string;
  title: string;
  depth: 2 | 3;
};

type NavaiDocPage = NavaiDocMeta & {
  markdown: string;
  sections: NavaiDocSection[];
};

const NAVAI_DOCS: NavaiDocMeta[] = [
  {
    slug: "home",
    title: "Home",
    summary: "Project overview, framework coverage, supported platforms, and architecture baseline.",
    fileName: "root.md",
  },
  {
    slug: "installation-api",
    title: "Installation API",
    summary: "Backend setup with @navai/voice-backend and Express route registration.",
    fileName: "installation-api.md",
  },
  {
    slug: "installation-web",
    title: "Installation Web",
    summary: "Frontend setup with @navai/voice-frontend and route wiring.",
    fileName: "installation-web.md",
  },
  {
    slug: "installation-mobile",
    title: "Installation Mobile",
    summary: "Mobile setup with @navai/voice-mobile and runtime configuration.",
    fileName: "installation-mobile.md",
  },
  {
    slug: "voice-backend",
    title: "@navai/voice-backend",
    summary: "Backend contract for realtime routes, function loading and environment rules.",
    fileName: "voice-backend.md",
  },
  {
    slug: "voice-frontend",
    title: "@navai/voice-frontend",
    summary: "Web runtime for voice agents, route navigation and backend bridge.",
    fileName: "voice-frontend.md",
  },
  {
    slug: "voice-mobile",
    title: "@navai/voice-mobile",
    summary: "Mobile runtime for React Native voice agents with WebRTC transport.",
    fileName: "voice-mobile.md",
  },
];

let docsCachePromise: Promise<NavaiDocPage[]> | null = null;

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
  if (title.includes(query)) score += 18;
  if (body.includes(query)) score += 10;
  for (const token of tokens) {
    if (title.includes(token)) score += 5;
    if (body.includes(token)) score += 3;
  }
  return score;
}

function makeSnippet(rawText: string, query: string) {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (!text) return "";

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

function cleanHeadingText(raw: string) {
  return raw
    .replace(/[#*_`~]/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .trim();
}

function headingToId(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractSections(markdown: string): NavaiDocSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: NavaiDocSection[] = [];

  for (const line of lines) {
    const match = line.match(/^(##|###)\s+(.+)$/);
    if (!match) continue;

    const depth = match[1].length as 2 | 3;
    const title = cleanHeadingText(match[2]);
    if (!title) continue;
    sections.push({
      id: headingToId(title),
      title,
      depth,
    });
  }

  return sections;
}

function getDocsPrefix(language: string | null) {
  const lang = (language ?? "").toLowerCase();
  if (lang.startsWith("es")) return "Documentacion";
  if (lang.startsWith("fr")) return "Documentation";
  if (lang.startsWith("pt")) return "Documentacao";
  return "Documentation";
}

function resolveReadmesDir() {
  const projectRoot = resolveProjectRoot();
  const candidates = [
    path.join(projectRoot, "backend", "src", "content", "navai-readmes"),
    path.join(projectRoot, "src", "content", "navai-readmes"),
  ];
  return candidates;
}

async function loadDocsPages(): Promise<NavaiDocPage[]> {
  const readmeDirCandidates = resolveReadmesDir();
  const pages: NavaiDocPage[] = [];

  for (const meta of NAVAI_DOCS) {
    let markdown = `# ${meta.title}\n\n${meta.summary}`;

    for (const dir of readmeDirCandidates) {
      const candidate = path.join(dir, meta.fileName);
      try {
        markdown = await fs.readFile(candidate, "utf8");
        break;
      } catch {
        // keep fallback markdown
      }
    }

    pages.push({
      ...meta,
      markdown,
      sections: extractSections(markdown),
    });
  }

  return pages;
}

async function getDocsCache() {
  if (!docsCachePromise) {
    docsCachePromise = loadDocsPages().catch(() => []);
  }
  return docsCachePromise;
}

function buildImplementationSearchEntries(query: string, tokens: string[]) {
  const title = "Request Implementation";
  const description =
    "Implementation services, technical scope, pricing model, and WhatsApp contact.";
  const sections = [
    { id: "what-you-get", title: "Technical Scope", description: "Architecture and integration planning." },
    { id: "pricing-note", title: "Pricing Model", description: "Pricing criteria based on route count, complexity and tools." },
    { id: "contacto", title: "Contact", description: "WhatsApp channel to coordinate implementation with Luxisoft." },
  ];
  const entries: RankedSearchResult[] = [];
  const pageBody = normalizeText(`${title} ${description} ${sections.map((s) => s.description).join(" ")}`);
  const pageTitle = normalizeText(title);

  if (containsAllTokens(`${pageTitle} ${pageBody}`, tokens)) {
    entries.push({
      id: "impl-page",
      href: "/request-implementation",
      scope: "implementation",
      title,
      snippet: makeSnippet(description, query),
      score: scoreMatch(pageTitle, pageBody, query, tokens),
    });
  }

  for (const section of sections) {
    const sectionText = normalizeText(`${section.title} ${section.description}`);
    if (!containsAllTokens(sectionText, tokens)) continue;
    entries.push({
      id: `impl-${section.id}`,
      href: `/request-implementation#${section.id}`,
      scope: "implementation",
      title: section.title,
      snippet: makeSnippet(section.description, query),
      score: scoreMatch(normalizeText(section.title), sectionText, query, tokens),
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

export async function getDocsSearch(request: Request, response: Response) {
  const queryRaw = String(request.query.q ?? "").trim();
  const languageRaw = typeof request.query.lang === "string" ? request.query.lang : null;

  if (queryRaw.length < 2) {
    return response.json({ results: [] as SearchResult[] });
  }

  const query = normalizeText(queryRaw);
  const tokens = query.split(/\s+/).filter(Boolean);
  const ranked: RankedSearchResult[] = [];
  const docsPrefix = getDocsPrefix(languageRaw);
  const docs = await getDocsCache();

  for (const doc of docs) {
    const localizedTitle = `${docsPrefix}: ${doc.title}`;
    const plainText = stripMarkdown(doc.markdown);
    const pageBodyRaw = `${doc.summary} ${plainText}`;
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
      const sectionBody = normalizeText(`${section.title} ${doc.title} ${doc.summary}`);
      if (!containsAllTokens(sectionBody, tokens)) continue;

      ranked.push({
        id: `doc-section-${doc.slug}-${section.id}`,
        href: `/documentation/${doc.slug}#${section.id}`,
        scope: "documentation",
        title: `${doc.title} / ${section.title}`,
        snippet: doc.summary,
        score: scoreMatch(normalizeText(section.title), sectionBody, query, tokens),
      });
    }
  }

  ranked.push(...buildImplementationSearchEntries(queryRaw, tokens));

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

  return response.json({ results });
}
