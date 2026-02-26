import { promises as fs } from "node:fs";
import path from "node:path";
import { buildStableHeadingId, cleanHeadingText } from "@/lib/heading-id";

export type NavaiDocSlug =
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

export type NavaiDocGroupKey = "home" | "installation" | "demo" | "examples" | "libraries";

export type NavaiDocMeta = {
  slug: NavaiDocSlug;
  title: string;
  summary: string;
  groupKey: NavaiDocGroupKey;
  sourcePath: string;
  fileName: string;
};

export type NavaiDocSection = {
  id: string;
  title: string;
  depth: 2 | 3;
};

export type NavaiDocPage = NavaiDocMeta & {
  markdown: string;
  sections: NavaiDocSection[];
};

export const NAVAI_DOCS: NavaiDocMeta[] = [
  {
    slug: "home",
    title: "Home",
    summary: "Project overview, framework coverage, supported platforms, and architecture baseline.",
    groupKey: "home",
    sourcePath: "README.md",
    fileName: "root.md",
  },
  {
    slug: "installation-api",
    title: "API",
    summary:
      "Backend setup with @navai/voice-backend, minimal environment variables, and Express route registration.",
    groupKey: "installation",
    sourcePath: "README.es.md",
    fileName: "installation-api.md",
  },
  {
    slug: "installation-web",
    title: "Web",
    summary:
      "Frontend setup with @navai/voice-frontend, NAVAI environment variables, and base navigation wiring.",
    groupKey: "installation",
    sourcePath: "README.es.md",
    fileName: "installation-web.md",
  },
  {
    slug: "installation-mobile",
    title: "Mobile",
    summary:
      "Mobile setup with @navai/voice-mobile, NAVAI environment variables, and module loader generation.",
    groupKey: "installation",
    sourcePath: "README.es.md",
    fileName: "installation-mobile.md",
  },
  {
    slug: "installation-wordpress",
    title: "WordPress",
    summary: "WordPress plugin setup, required NAVAI endpoints, and integration checklist.",
    groupKey: "installation",
    sourcePath: "src/content/navai-readmes/installation-wordpress.md",
    fileName: "installation-wordpress.md",
  },
  {
    slug: "playground-api",
    title: "API",
    summary: "Express demo backend: client_secret creation, function registry, and backend tool execution.",
    groupKey: "demo",
    sourcePath: "apps/playground-api/README.md",
    fileName: "playground-api.md",
  },
  {
    slug: "playground-web",
    title: "Web",
    summary: "Reference React frontend for voice navigation, dynamic function loading, and realtime flow.",
    groupKey: "demo",
    sourcePath: "apps/playground-web/README.md",
    fileName: "playground-web.md",
  },
  {
    slug: "playground-mobile",
    title: "Mobile",
    summary: "React Native/Expo reference with VoiceNavigator, local tools, and NAVAI backend integration.",
    groupKey: "demo",
    sourcePath: "apps/playground-mobile/README.md",
    fileName: "playground-mobile.md",
  },
  {
    slug: "playground-stores",
    title: "Tiendas",
    summary:
      "Interactive ecommerce demo with read-only SQLite seed data, localStorage user products, purchase simulation, and NAVAI reports.",
    groupKey: "examples",
    sourcePath: "navai-exhibition/playground-stores.md",
    fileName: "playground-stores.md",
  },
  {
    slug: "voice-backend",
    title: "@navai/voice-backend",
    summary: "Official backend contract: realtime routes, dynamic function loading, and environment rules.",
    groupKey: "libraries",
    sourcePath: "packages/voice-backend/README.md",
    fileName: "voice-backend.md",
  },
  {
    slug: "voice-frontend",
    title: "@navai/voice-frontend",
    summary:
      "Official web runtime for voice agents with navigation, local tools, and backend function bridge.",
    groupKey: "libraries",
    sourcePath: "packages/voice-frontend/README.md",
    fileName: "voice-frontend.md",
  },
  {
    slug: "voice-mobile",
    title: "@navai/voice-mobile",
    summary:
      "Official mobile runtime for React Native voice agents with WebRTC transport and session orchestration.",
    groupKey: "libraries",
    sourcePath: "packages/voice-mobile/README.md",
    fileName: "voice-mobile.md",
  },
];

const GROUP_ORDER: NavaiDocGroupKey[] = ["home", "installation", "demo", "examples", "libraries"];
const GITHUB_BLOB_BASE = "https://github.com/Luxisoft/navai/blob/main";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/Luxisoft/navai/main";

const README_PATH_TO_SLUG = new Map<string, NavaiDocSlug>(
  NAVAI_DOCS.map((item) => [item.sourcePath, item.slug])
);

function normalizeRepoPath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function canonicalizeReadmePath(value: string) {
  return value.replace(/README\.(en|es)\.md$/i, "README.md");
}

function extractSections(markdown: string): NavaiDocSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: NavaiDocSection[] = [];
  
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^(##|###)\s+(.+)$/);
    if (!match) {
      continue;
    }
    const [, hashes, rawTitle] = match;
    const depth = hashes.length as 2 | 3;
    const title = cleanHeadingText(rawTitle);
    const id = buildStableHeadingId({
      title,
      line: index + 1,
      column: 1,
    });

    sections.push({ id, title, depth });
  }

  return sections;
}

async function readDocMarkdown(fileName: string) {
  const absolutePath = path.join(process.cwd(), "src", "content", "navai-readmes", fileName);
  return fs.readFile(absolutePath, "utf8");
}

export function getNavaiDocsGrouped() {
  return GROUP_ORDER.map((groupKey) => ({
    groupKey,
    items: NAVAI_DOCS.filter((doc) => doc.groupKey === groupKey),
  }));
}

export function getNavaiDocMetaBySlug(slug: string) {
  return NAVAI_DOCS.find((doc) => doc.slug === slug) ?? null;
}

export async function getNavaiDocPageBySlug(slug: string): Promise<NavaiDocPage | null> {
  const meta = getNavaiDocMetaBySlug(slug);
  if (!meta) {
    return null;
  }

  const markdown = await readDocMarkdown(meta.fileName);
  const sections = extractSections(markdown);

  return {
    ...meta,
    markdown,
    sections,
  };
}

export function resolveReadmeLinkHref(href: string, sourcePath: string) {
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
  const sourceDir = path.posix.dirname(sourcePath);
  const resolvedPath = normalizeRepoPath(
    rawPath.startsWith("/")
      ? rawPath.slice(1)
      : path.posix.normalize(path.posix.join(sourceDir, rawPath))
  );
  const canonicalPath = canonicalizeReadmePath(resolvedPath);
  const maybeSlug = README_PATH_TO_SLUG.get(canonicalPath);
  const hash = rawHash ? `#${rawHash}` : "";

  if (maybeSlug) {
    return `/documentation/${maybeSlug}${hash}`;
  }

  return `${GITHUB_BLOB_BASE}/${encodeURI(resolvedPath)}${hash}`;
}

export function resolveReadmeImageSrc(src: string, sourcePath: string) {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }

  const sourceDir = path.posix.dirname(sourcePath);
  const resolvedPath = normalizeRepoPath(
    src.startsWith("/")
      ? src.slice(1)
      : path.posix.normalize(path.posix.join(sourceDir, src))
  );

  return `${GITHUB_RAW_BASE}/${encodeURI(resolvedPath)}`;
}

export function getNavaiDocSourceUrl(sourcePath: string) {
  return `${GITHUB_BLOB_BASE}/${encodeURI(sourcePath)}`;
}
