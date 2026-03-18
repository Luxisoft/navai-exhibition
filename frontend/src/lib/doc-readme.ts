import type { NavaiDocSlug } from "@/lib/i18n/messages";

const GITHUB_BLOB_BASE = "https://github.com/Luxisoft/navai/blob/main";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/Luxisoft/navai/main";

const README_PATH_TO_SLUG = new Map<string, NavaiDocSlug>([
  ["README.md", "home"],
  ["README.es.md", "installation-api"],
  ["packages/voice-backend/README.md", "voice-backend"],
  ["packages/voice-frontend/README.md", "voice-frontend"],
  ["packages/voice-mobile/README.md", "voice-mobile"],
]);

function normalizeRepoPath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function canonicalizeReadmePath(value: string) {
  return value.replace(/README\.(en|es)\.md$/i, "README.md");
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
  const sourceDir = sourcePath.includes("/")
    ? sourcePath.slice(0, sourcePath.lastIndexOf("/"))
    : ".";
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

export function resolveReadmeImageSrc(src: string, sourcePath: string) {
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:")
  ) {
    return src;
  }

  const sourceDir = sourcePath.includes("/")
    ? sourcePath.slice(0, sourcePath.lastIndexOf("/"))
    : ".";
  const joined = src.startsWith("/")
    ? src.slice(1)
    : normalizeRepoPath(`${sourceDir}/${src}`);
  const resolvedPath = normalizeRepoPath(joined);

  return `${GITHUB_RAW_BASE}/${encodeURI(resolvedPath)}`;
}
