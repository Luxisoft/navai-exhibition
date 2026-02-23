import { promises as fs } from "node:fs";
import path from "node:path";

export type NavaiDocSlug =
  | "root-readme"
  | "installation-api"
  | "installation-web"
  | "installation-mobile"
  | "playground-api"
  | "playground-web"
  | "playground-mobile"
  | "voice-backend"
  | "voice-frontend"
  | "voice-mobile";

export type NavaiDocGroup = "Inicio" | "Instalacion" | "Demo" | "Librerias";

export type NavaiDocMeta = {
  slug: NavaiDocSlug;
  title: string;
  summary: string;
  group: NavaiDocGroup;
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
    slug: "root-readme",
    title: "Inicio",
    summary:
      "Vista general de NAVAI, cobertura de frameworks, plataformas y arquitectura general del proyecto.",
    group: "Inicio",
    sourcePath: "README.md",
    fileName: "root.md",
  },
  {
    slug: "installation-api",
    title: "API",
    summary:
      "Instalacion backend con @navai/voice-backend: dependencias, variables minimas y registro de rutas Express.",
    group: "Instalacion",
    sourcePath: "README.es.md",
    fileName: "installation-api.md",
  },
  {
    slug: "installation-web",
    title: "Web",
    summary:
      "Instalacion frontend con @navai/voice-frontend: dependencias, variables NAVAI_ y estructura base de navegacion.",
    group: "Instalacion",
    sourcePath: "README.es.md",
    fileName: "installation-web.md",
  },
  {
    slug: "installation-mobile",
    title: "Mobile",
    summary:
      "Instalacion mobile con @navai/voice-mobile: dependencias, variables NAVAI_ y generacion de module loaders.",
    group: "Instalacion",
    sourcePath: "README.es.md",
    fileName: "installation-mobile.md",
  },
  {
    slug: "playground-api",
    title: "API",
    summary:
      "Backend de ejemplo con Express: client_secret, registro de funciones y ejecucion de tools backend.",
    group: "Demo",
    sourcePath: "apps/playground-api/README.md",
    fileName: "playground-api.md",
  },
  {
    slug: "playground-web",
    title: "Web",
    summary:
      "Frontend React de referencia para navegacion por voz, carga dinamica de funciones y flujo realtime.",
    group: "Demo",
    sourcePath: "apps/playground-web/README.md",
    fileName: "playground-web.md",
  },
  {
    slug: "playground-mobile",
    title: "Mobile",
    summary:
      "Implementacion React Native/Expo con VoiceNavigator, tools locales y backend NAVAI en entorno mobile.",
    group: "Demo",
    sourcePath: "apps/playground-mobile/README.md",
    fileName: "playground-mobile.md",
  },
  {
    slug: "voice-backend",
    title: "@navai/voice-backend",
    summary:
      "Contrato backend oficial: rutas realtime, carga dinamica de funciones y politicas de entorno.",
    group: "Librerias",
    sourcePath: "packages/voice-backend/README.md",
    fileName: "voice-backend.md",
  },
  {
    slug: "voice-frontend",
    title: "@navai/voice-frontend",
    summary:
      "Runtime web oficial para agentes de voz con navegacion, tools locales y puente de tools backend.",
    group: "Librerias",
    sourcePath: "packages/voice-frontend/README.md",
    fileName: "voice-frontend.md",
  },
  {
    slug: "voice-mobile",
    title: "@navai/voice-mobile",
    summary:
      "Stack mobile oficial para agentes de voz en React Native con transporte WebRTC y session orchestration.",
    group: "Librerias",
    sourcePath: "packages/voice-mobile/README.md",
    fileName: "voice-mobile.md",
  },
];

const GROUP_ORDER: NavaiDocGroup[] = ["Inicio", "Instalacion", "Demo", "Librerias"];
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

export function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function cleanHeadingText(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}

function extractSections(markdown: string): NavaiDocSection[] {
  const lines = markdown.split(/\r?\n/);
  const slugCounts = new Map<string, number>();
  const sections: NavaiDocSection[] = [];

  for (const line of lines) {
    const match = line.match(/^(##|###)\s+(.+)$/);
    if (!match) {
      continue;
    }

    const depth = match[1].length as 2 | 3;
    const title = cleanHeadingText(match[2]);
    const baseId = slugifyHeading(title);
    const seen = slugCounts.get(baseId) ?? 0;
    slugCounts.set(baseId, seen + 1);
    const id = seen === 0 ? baseId : `${baseId}-${seen + 1}`;

    sections.push({ id, title, depth });
  }

  return sections;
}

async function readDocMarkdown(fileName: string) {
  const absolutePath = path.join(process.cwd(), "src", "content", "navai-readmes", fileName);
  return fs.readFile(absolutePath, "utf8");
}

export function getNavaiDocsGrouped() {
  return GROUP_ORDER.map((group) => ({
    group,
    items: NAVAI_DOCS.filter((doc) => doc.group === group),
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
