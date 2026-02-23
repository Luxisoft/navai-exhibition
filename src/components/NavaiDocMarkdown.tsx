import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import type { NavaiDocPage } from "@/lib/navai-docs";
import {
  resolveReadmeImageSrc,
  resolveReadmeLinkHref,
  slugifyHeading,
} from "@/lib/navai-docs";

type NavaiDocMarkdownProps = {
  doc: NavaiDocPage;
};

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
  const headingCounts = new Map<string, number>();

  const createHeadingId = (title: string) => {
    const base = slugifyHeading(title);
    const seen = headingCounts.get(base) ?? 0;
    headingCounts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  return (
    <div className="docs-markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h2: ({ children }) => {
            const id = createHeadingId(extractNodeText(children));
            return <h2 id={id}>{children}</h2>;
          },
          h3: ({ children }) => {
            const id = createHeadingId(extractNodeText(children));
            return <h3 id={id}>{children}</h3>;
          },
          a: ({ href = "", children }) => {
            const resolvedHref = resolveReadmeLinkHref(href, doc.sourcePath);
            const isExternal =
              resolvedHref.startsWith("http://") || resolvedHref.startsWith("https://");
            return (
              <a
                href={resolvedHref}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noreferrer noopener" : undefined}
              >
                {children}
              </a>
            );
          },
          img: ({ src = "", alt = "" }) => {
            const safeSrc = typeof src === "string" ? src : "";
            const safeAlt = typeof alt === "string" ? alt : "";
            const resolvedSrc = resolveReadmeImageSrc(safeSrc, doc.sourcePath);
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={resolvedSrc} alt={safeAlt} loading="lazy" />;
          },
        }}
      >
        {doc.markdown}
      </ReactMarkdown>
    </div>
  );
}
