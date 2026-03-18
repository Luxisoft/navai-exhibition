import { promises as fs } from "node:fs";
import path from "node:path";
import { stripLeadingDecorativeText } from "@/lib/decorative-text";
import { buildStableHeadingId, cleanHeadingText } from "@/lib/heading-id";
import { DEFAULT_LANGUAGE } from "@/lib/i18n/messages";
import {
  getDefaultInstallationGuide,
  getInstallationGuideSections,
  isInteractiveInstallationGuideSlug,
  type InteractiveInstallationGuideSlug,
} from "@/lib/installation-api-guide";
import {
  getLegalGuideSections,
  isInteractiveLegalGuideSlug,
  type InteractiveLegalGuideSlug,
} from "@/lib/legal-docs-guide";
import {
  getLibrariesGuideSections,
  getLibraryGuideSourceHref,
  isInteractiveLibrariesGuideSlug,
  type InteractiveLibrariesGuideSlug,
} from "@/lib/libraries-guide";
import { normalizeMarkdownBlockFormatting } from "@/lib/markdown-normalization";
import { resolveProjectRoot } from "@/lib/project-root";
import localizedMarkdownRaw from "@/content/navai-readmes/localized-markdown.json";

export type NavaiDocSlug =
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

export type NavaiDocGroupKey =
  | "home"
  | "installation"
  | "legal"
  | "examples"
  | "libraries";

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
      "Quick backend setup from zero with @navai/voice-backend, working endpoints, and first integration checks.",
    groupKey: "installation",
    sourcePath: "frontend/src/content/navai-readmes/installation-api.md",
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
    slug: "legal-ai-evaluation-terms",
    title: "AI Evaluation Terms",
    summary:
      "Contract terms for the online AI-assisted evaluation service, including access, payment, rules, and consumer protections.",
    groupKey: "legal",
    sourcePath: "legal/legal-ai-evaluation-terms",
    fileName: "legal-ai-evaluation-terms.md",
  },
  {
    slug: "legal-data-processing-policy",
    title: "Data Processing Policy",
    summary:
      "Policy that explains how personal data is collected, used, protected, retained, and answered within the service.",
    groupKey: "legal",
    sourcePath: "legal/legal-data-processing-policy",
    fileName: "legal-data-processing-policy.md",
  },
  {
    slug: "legal-data-and-ai-authorization",
    title: "Data And AI Authorization",
    summary:
      "Authorization text for personal data processing, AI usage, audio handling, and holder rights within the evaluation flow.",
    groupKey: "legal",
    sourcePath: "legal/legal-data-and-ai-authorization",
    fileName: "legal-data-and-ai-authorization.md",
  },
  {
    slug: "legal-privacy-policy",
    title: "Privacy Policy",
    summary:
      "Privacy rules for the website and platform, including scope, AI usage, sharing, cookies, security, and user rights.",
    groupKey: "legal",
    sourcePath: "legal/legal-privacy-policy",
    fileName: "legal-privacy-policy.md",
  },
  {
    slug: "legal-checkout-flow",
    title: "Checkout Legal Flow",
    summary:
      "Operational guide for purchase summary, mandatory checkboxes, immediate service start, disclaimers, and support flow.",
    groupKey: "legal",
    sourcePath: "legal/legal-checkout-flow",
    fileName: "legal-checkout-flow.md",
  },
  {
    slug: "legal-compliance-checklist",
    title: "Legal Compliance Checklist",
    summary:
      "Implementation checklist for web publication, checkout, data protection, taxation, AI transparency, and future prize mechanics.",
    groupKey: "legal",
    sourcePath: "legal/legal-compliance-checklist",
    fileName: "legal-compliance-checklist.md",
  },
  {
    slug: "legal-privacy-notice",
    title: "Privacy Notice",
    summary:
      "Short-form privacy notice to display at data collection time when the full policy cannot be shown immediately.",
    groupKey: "legal",
    sourcePath: "legal/legal-privacy-notice",
    fileName: "legal-privacy-notice.md",
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

const GROUP_ORDER: NavaiDocGroupKey[] = [
  "home",
  "installation",
  "legal",
  "examples",
  "libraries",
];
const GITHUB_BLOB_BASE = "https://github.com/Luxisoft/navai/blob/main";
type LocalizedMarkdownMap = Partial<Record<NavaiDocSlug, Partial<Record<typeof DEFAULT_LANGUAGE, string>>>>;

const LOCALIZED_MARKDOWN = localizedMarkdownRaw as LocalizedMarkdownMap;
const DEFAULT_INSTALLATION_GUIDE_SECTIONS: Record<InteractiveInstallationGuideSlug, NavaiDocSection[]> = {
  "installation-api": getInstallationGuideSections(getDefaultInstallationGuide("installation-api")),
  "installation-web": getInstallationGuideSections(getDefaultInstallationGuide("installation-web")),
  "installation-mobile": getInstallationGuideSections(getDefaultInstallationGuide("installation-mobile")),
};
const DEFAULT_LIBRARIES_GUIDE_SECTIONS: Record<
  InteractiveLibrariesGuideSlug,
  NavaiDocSection[]
> = {
  "voice-backend": getLibrariesGuideSections("voice-backend"),
  "voice-frontend": getLibrariesGuideSections("voice-frontend"),
  "voice-mobile": getLibrariesGuideSections("voice-mobile"),
};
const DEFAULT_LEGAL_GUIDE_SECTIONS: Record<InteractiveLegalGuideSlug, NavaiDocSection[]> = {
  "legal-ai-evaluation-terms": getLegalGuideSections("legal-ai-evaluation-terms"),
  "legal-data-processing-policy": getLegalGuideSections("legal-data-processing-policy"),
  "legal-data-and-ai-authorization": getLegalGuideSections("legal-data-and-ai-authorization"),
  "legal-privacy-policy": getLegalGuideSections("legal-privacy-policy"),
  "legal-checkout-flow": getLegalGuideSections("legal-checkout-flow"),
  "legal-compliance-checklist": getLegalGuideSections("legal-compliance-checklist"),
  "legal-privacy-notice": getLegalGuideSections("legal-privacy-notice"),
};

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
    const title = stripLeadingDecorativeText(cleanHeadingText(rawTitle));
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
  const absolutePath = path.join(
    resolveProjectRoot(),
    "frontend",
    "src",
    "content",
    "navai-readmes",
    fileName
  );
  return fs.readFile(absolutePath, "utf8");
}

export function getNavaiDocsGrouped() {
  return GROUP_ORDER.map((groupKey) => ({
    groupKey,
    items: NAVAI_DOCS.filter((doc) => doc.groupKey === groupKey),
  }));
}

function getNavaiDocMetaBySlug(slug: string) {
  return NAVAI_DOCS.find((doc) => doc.slug === slug) ?? null;
}

export async function getNavaiDocPageBySlug(slug: string): Promise<NavaiDocPage | null> {
  const meta = getNavaiDocMetaBySlug(slug);
  if (!meta) {
    return null;
  }

  const markdown = isInteractiveLegalGuideSlug(meta.slug) ? "" : await readDocMarkdown(meta.fileName);
  const localizedMarkdown = isInteractiveLegalGuideSlug(meta.slug)
    ? undefined
    : LOCALIZED_MARKDOWN[meta.slug]?.[DEFAULT_LANGUAGE];
  const sections =
    isInteractiveInstallationGuideSlug(meta.slug)
      ? DEFAULT_INSTALLATION_GUIDE_SECTIONS[meta.slug]
      : isInteractiveLegalGuideSlug(meta.slug)
      ? DEFAULT_LEGAL_GUIDE_SECTIONS[meta.slug]
      : isInteractiveLibrariesGuideSlug(meta.slug)
      ? DEFAULT_LIBRARIES_GUIDE_SECTIONS[meta.slug]
      : extractSections(
          meta.slug === "home"
            ? markdown
            : normalizeMarkdownBlockFormatting(localizedMarkdown ?? markdown)
        );

  return {
    ...meta,
    markdown,
    sections,
  };
}

export function getNavaiDocSourceUrl(slug: NavaiDocSlug, sourcePath: string) {
  if (isInteractiveLibrariesGuideSlug(slug)) {
    return getLibraryGuideSourceHref(slug);
  }

  return `${GITHUB_BLOB_BASE}/${encodeURI(sourcePath)}`;
}
