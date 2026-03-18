'use client';

import AutoHeight from "embla-carousel-auto-height";
import Link from "@/platform/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Children, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import DocsCodeEditor, { extractCodeLanguageFromClassName } from "@/components/DocsCodeEditor";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { resolveReadmeImageSrc, resolveReadmeLinkHref } from "@/lib/doc-readme";
import { useI18n } from "@/lib/i18n/provider";
import {
  getLocalizedLibrariesGuide,
  type InteractiveLibrariesGuideSlug,
} from "@/lib/libraries-guide";

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

function getDecodedHashId() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return decodeURIComponent(window.location.hash.replace(/^#/, "").trim());
  } catch {
    return window.location.hash.replace(/^#/, "").trim();
  }
}

function syncGuideHashId(nextId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedId = nextId.trim();
  if (!normalizedId) {
    return;
  }

  const nextHash = `#${encodeURIComponent(normalizedId)}`;
  if (window.location.hash === nextHash) {
    return;
  }

  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

function GuideMarkdown({
  markdown,
  sourcePath,
}: {
  markdown: string;
  sourcePath: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
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
        table: ({ children, className }) => (
          <div className="docs-table-wrap">
            <table className={className}>{children}</table>
          </div>
        ),
        a: ({ href = "", children, className }) => {
          const resolvedHref = resolveReadmeLinkHref(href, sourcePath);
          const isExternal =
            resolvedHref.startsWith("http://") || resolvedHref.startsWith("https://");

          return (
            <a
              className={className}
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
          const resolvedSrc = resolveReadmeImageSrc(safeSrc, sourcePath);
          return <img src={resolvedSrc} alt={safeAlt} loading="lazy" />;
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

type LibrariesGuideProps = {
  slug: InteractiveLibrariesGuideSlug;
};

export default function LibrariesGuide({ slug }: LibrariesGuideProps) {
  const { language, messages } = useI18n();
  const guide = useMemo(
    () => getLocalizedLibrariesGuide(messages, slug, language),
    [language, messages, slug],
  );
  const [stepsApi, setStepsApi] = useState<CarouselApi>();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const hasInitializedStepSelectionRef = useRef(false);
  const stepsShellRef = useRef<HTMLDivElement | null>(null);
  const { currentTab } = guide;

  const scrollToElement = (element: Element | null, behavior: ScrollBehavior = "smooth") => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.scrollIntoView({ block: "start", behavior });
  };

  const navigateToGuideSection = (nextId: string, behavior: ScrollBehavior = "smooth") => {
    if (!stepsApi || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const nextIndex = currentTab.sections.findIndex((section) => section.id === nextId);
    if (nextIndex < 0) {
      return;
    }

    const finalizeNavigation = () => {
      setActiveStepIndex(nextIndex);
      window.dispatchEvent(
        new CustomEvent("docs:active-section-change", {
          detail: { id: nextId },
        }),
      );

      window.requestAnimationFrame(() => {
        const targetHeading = document.getElementById(nextId);
        scrollToElement(targetHeading ?? stepsShellRef.current, behavior);
      });
    };

    if (stepsApi.selectedScrollSnap() === nextIndex) {
      finalizeNavigation();
      return;
    }

    const handleSettle = () => {
      stepsApi.off("settle", handleSettle);
      finalizeNavigation();
    };

    stepsApi.on("settle", handleSettle);
    stepsApi.scrollTo(nextIndex);
  };

  useEffect(() => {
    if (!stepsApi || currentTab.sections.length === 0) {
      return;
    }

    const nextHashId = getDecodedHashId();
    const nextIndex = currentTab.sections.findIndex((section) => section.id === nextHashId);
    const targetIndex = nextIndex >= 0 ? nextIndex : 0;

    stepsApi.scrollTo(targetIndex, true);
    setActiveStepIndex(targetIndex);
  }, [currentTab.sections, stepsApi]);

  useEffect(() => {
    hasInitializedStepSelectionRef.current = false;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("docs:refresh-right-items"));
    }
  }, [currentTab.value]);

  useEffect(() => {
    if (!stepsApi || currentTab.sections.length === 0 || typeof window === "undefined") {
      return;
    }

    const syncActiveStep = () => {
      const nextIndex = stepsApi.selectedScrollSnap();
      const nextSection = currentTab.sections[nextIndex];

      setActiveStepIndex(nextIndex);

      if (!nextSection) {
        return;
      }

      if (hasInitializedStepSelectionRef.current) {
        syncGuideHashId(nextSection.id);
        window.dispatchEvent(
          new CustomEvent("docs:active-section-change", {
            detail: { id: nextSection.id },
          }),
        );
      } else {
        hasInitializedStepSelectionRef.current = true;
      }
    };

    syncActiveStep();
    stepsApi.on("reInit", syncActiveStep);
    stepsApi.on("select", syncActiveStep);

    return () => {
      stepsApi.off("select", syncActiveStep);
      stepsApi.off("reInit", syncActiveStep);
    };
  }, [currentTab.sections, stepsApi]);

  useEffect(() => {
    if (!stepsApi || currentTab.sections.length === 0 || typeof window === "undefined") {
      return;
    }

    const syncFromHash = () => {
      const nextHashId = getDecodedHashId();
      if (!nextHashId) {
        return;
      }

      navigateToGuideSection(nextHashId, "smooth");
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [currentTab.sections, stepsApi]);

  useEffect(() => {
    if (!stepsApi || currentTab.sections.length === 0 || typeof window === "undefined") {
      return;
    }

    const handleSectionNavigation = (event: Event) => {
      const nextId =
        event instanceof CustomEvent && typeof event.detail?.id === "string"
          ? event.detail.id.trim()
          : "";

      if (!nextId) {
        return;
      }

      navigateToGuideSection(nextId, "smooth");
    };

    window.addEventListener("docs:navigate-to-section", handleSectionNavigation);
    return () =>
      window.removeEventListener("docs:navigate-to-section", handleSectionNavigation);
  }, [currentTab.sections, stepsApi]);

  if (currentTab.sections.length === 0) {
    return null;
  }

  const previousStepTitle = currentTab.sections[activeStepIndex - 1]?.title ?? "";
  const nextStepTitle = currentTab.sections[activeStepIndex + 1]?.title ?? "";
  const activeStepId = currentTab.sections[activeStepIndex]?.id ?? "";

  return (
    <div
      className="docs-sections docs-interactive-guide docs-libraries-guide"
      data-active-doc-section={activeStepId}
    >
      <section className="docs-section-block docs-libraries-guide-header">
        <h2>{guide.title}</h2>
        <p>{guide.description}</p>

        <div className="docs-installation-tabs-wrap">
          <nav className="docs-installation-tabs" aria-label={guide.title}>
            <div className="docs-installation-tabs-list">
              {guide.tabs.map((tab) => (
                <Link
                  key={tab.value}
                  href={tab.href}
                  className="docs-installation-tab-trigger"
                  data-state={tab.value === currentTab.value ? "active" : "inactive"}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        {currentTab.introMarkdown ? (
          <div className="docs-libraries-guide-intro">
            <GuideMarkdown markdown={currentTab.introMarkdown} sourcePath={currentTab.sourcePath} />
          </div>
        ) : null}
      </section>

      <div ref={stepsShellRef} className="docs-installation-steps-carousel-shell">
        <Carousel
          className="docs-installation-steps-carousel-root w-full max-w-full"
          opts={{ align: "start", loop: false }}
          plugins={[AutoHeight()]}
          setApi={setStepsApi}
        >
          <CarouselContent disableGutter className="docs-installation-steps-carousel-track">
            {currentTab.sections.map((section) => (
              <CarouselItem
                disableGutter
                key={`${currentTab.value}-${section.id}`}
                className="docs-installation-steps-carousel-item"
              >
                <section className="docs-section-block docs-installation-step-card" aria-labelledby={section.id}>
                  <h2 id={section.id}>{section.title}</h2>
                  <div className="docs-installation-step-divider-wrap" aria-hidden="true">
                    <Separator className="docs-installation-step-divider" />
                  </div>
                  <div className="docs-libraries-guide-markdown">
                    <GuideMarkdown markdown={section.bodyMarkdown} sourcePath={currentTab.sourcePath} />
                  </div>
                </section>
              </CarouselItem>
            ))}
          </CarouselContent>
          {currentTab.sections.length > 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="docs-installation-steps-carousel-arrow docs-installation-steps-carousel-arrow--prev"
                aria-label={previousStepTitle}
                title={previousStepTitle}
                disabled={activeStepIndex === 0}
                onClick={() => stepsApi?.scrollPrev()}
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="docs-installation-steps-carousel-arrow docs-installation-steps-carousel-arrow--next"
                aria-label={nextStepTitle}
                title={nextStepTitle}
                disabled={activeStepIndex >= currentTab.sections.length - 1}
                onClick={() => stepsApi?.scrollNext()}
              >
                <ArrowRight aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </Carousel>

        {currentTab.sections.length > 1 ? (
          <div className="docs-installation-steps-carousel-dots">
            {currentTab.sections.map((section, index) => (
              <button
                key={`${currentTab.value}-${section.id}-dot`}
                type="button"
                className={`docs-installation-steps-carousel-dot${index === activeStepIndex ? " is-active" : ""}`}
                aria-label={section.title}
                aria-current={index === activeStepIndex ? "true" : undefined}
                onClick={() => stepsApi?.scrollTo(index)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
