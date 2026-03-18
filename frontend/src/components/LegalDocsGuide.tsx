'use client';

import AutoHeight from "embla-carousel-auto-height";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Children, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import DocsCodeEditor, { extractCodeLanguageFromClassName } from "@/components/DocsCodeEditor";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n/provider";
import {
  getLocalizedLegalGuide,
  type InteractiveLegalGuideSlug,
} from "@/lib/legal-docs-guide";

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

function GuideMarkdown({ markdown }: { markdown: string }) {
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
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

type LegalDocsGuideProps = {
  slug: InteractiveLegalGuideSlug;
};

export default function LegalDocsGuide({ slug }: LegalDocsGuideProps) {
  const { language, messages } = useI18n();
  const guide = useMemo(
    () => getLocalizedLegalGuide(messages, slug, language),
    [language, messages, slug],
  );
  const [stepsApi, setStepsApi] = useState<CarouselApi>();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const hasInitializedStepSelectionRef = useRef(false);
  const stepsShellRef = useRef<HTMLDivElement | null>(null);
  const { currentDoc } = guide;

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

    const nextIndex = currentDoc.sections.findIndex((section) => section.id === nextId);
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
    if (!stepsApi || currentDoc.sections.length === 0) {
      return;
    }

    const nextHashId = getDecodedHashId();
    const nextIndex = currentDoc.sections.findIndex((section) => section.id === nextHashId);
    const targetIndex = nextIndex >= 0 ? nextIndex : 0;

    stepsApi.scrollTo(targetIndex, true);
    setActiveStepIndex(targetIndex);
  }, [currentDoc.sections, stepsApi]);

  useEffect(() => {
    hasInitializedStepSelectionRef.current = false;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("docs:refresh-right-items"));
    }
  }, [currentDoc.value]);

  useEffect(() => {
    if (!stepsApi || currentDoc.sections.length === 0 || typeof window === "undefined") {
      return;
    }

    const syncActiveStep = () => {
      const nextIndex = stepsApi.selectedScrollSnap();
      const nextSection = currentDoc.sections[nextIndex];

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
  }, [currentDoc.sections, stepsApi]);

  useEffect(() => {
    if (!stepsApi || currentDoc.sections.length === 0 || typeof window === "undefined") {
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
  }, [currentDoc.sections, stepsApi]);

  useEffect(() => {
    if (!stepsApi || currentDoc.sections.length === 0 || typeof window === "undefined") {
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
  }, [currentDoc.sections, stepsApi]);

  if (currentDoc.sections.length === 0) {
    return null;
  }

  const previousStepTitle = currentDoc.sections[activeStepIndex - 1]?.title ?? "";
  const nextStepTitle = currentDoc.sections[activeStepIndex + 1]?.title ?? "";
  const activeStepId = currentDoc.sections[activeStepIndex]?.id ?? "";

  return (
    <div
      className="docs-sections docs-interactive-guide docs-legal-guide"
      data-active-doc-section={activeStepId}
    >
      <section className="docs-section-block docs-libraries-guide-header">
        <h2>{currentDoc.label}</h2>
        <p>{currentDoc.summary}</p>

        {currentDoc.introMarkdown ? (
          <div className="docs-libraries-guide-intro">
            <GuideMarkdown markdown={currentDoc.introMarkdown} />
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
            {currentDoc.sections.map((section) => (
              <CarouselItem
                disableGutter
                key={`${currentDoc.value}-${section.id}`}
                className="docs-installation-steps-carousel-item"
              >
                <section className="docs-section-block docs-installation-step-card" aria-labelledby={section.id}>
                  <h2 id={section.id}>{section.title}</h2>
                  <div className="docs-installation-step-divider-wrap" aria-hidden="true">
                    <Separator className="docs-installation-step-divider" />
                  </div>
                  <div className="docs-libraries-guide-markdown">
                    <GuideMarkdown markdown={section.bodyMarkdown} />
                  </div>
                </section>
              </CarouselItem>
            ))}
          </CarouselContent>
          {currentDoc.sections.length > 1 ? (
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
                disabled={activeStepIndex >= currentDoc.sections.length - 1}
                onClick={() => stepsApi?.scrollNext()}
              >
                <ArrowRight aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </Carousel>

        {currentDoc.sections.length > 1 ? (
          <div className="docs-installation-steps-carousel-dots">
            {currentDoc.sections.map((section, index) => (
              <button
                key={`${currentDoc.value}-${section.id}-dot`}
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
