'use client';

import AutoHeight from "embla-carousel-auto-height";
import { ArrowLeft, ArrowRight, Download, Github } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import DocsCodeEditor from "@/components/DocsCodeEditor";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n/provider";
import type { InstallationGuideAction } from "@/lib/i18n/messages";
import {
  getLocalizedInstallationGuide,
  type InteractiveInstallationGuideSlug,
} from "@/lib/installation-api-guide";

const INSTALLATION_GUIDE_STACK_CHANGE_EVENT = "docs:installation-guide-stack-change";
const INSTALLATION_STEP_PREFIX_PATTERN =
  "(?:Paso|Step|Étape|Etape|Etapa|步骤|ステップ|Шаг|단계|चरण)";

function GuideCodeBlocks({
  blocks,
}: {
  blocks: Array<{ label: string; language: string; code: string }>;
}) {
  return (
    <div className="docs-installation-code-group">
      {blocks.map((block, index) => (
        <div
          key={`${block.label}-${block.language}-${index}`}
          className="docs-installation-code-block"
        >
          <p className="docs-installation-code-label">{block.label}</p>
          <DocsCodeEditor code={block.code} language={block.language} />
        </div>
      ))}
    </div>
  );
}

function GuideActions({
  actions,
}: {
  actions: InstallationGuideAction[];
}) {
  return (
    <div className="docs-cta-wrap docs-installation-links">
      {actions.map((action) => {
        const isExternal =
          action.href.startsWith("http://") || action.href.startsWith("https://");
        const Icon = action.icon === "download" ? Download : action.icon === "github" ? Github : null;

        return (
          <Button key={`${action.label}-${action.href}`} asChild variant="secondary">
            <a
              href={action.href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer noopener" : undefined}
            >
              {Icon ? <Icon aria-hidden="true" /> : null}
              <span>{action.label}</span>
            </a>
          </Button>
        );
      })}
    </div>
  );
}

function splitInstallationStepTitle(title: string) {
  const match = title.match(new RegExp(`^\\s*((${INSTALLATION_STEP_PREFIX_PATTERN}\\s*\\d+))\\s+(.+)$`, "u"));

  if (!match) {
    return null;
  }

  return {
    prefix: match[1]?.trim() ?? "",
    text: match[3]?.trim() ?? title.trim(),
  };
}

function renderInstallationStepTitle(title: string): ReactNode {
  const parts = splitInstallationStepTitle(title);

  if (!parts) {
    return title;
  }

  return (
    <span className="docs-installation-step-heading">
      <span className="docs-installation-step-prefix">{parts.prefix}</span>
      <span className="docs-installation-step-separator" aria-hidden="true" />
      <span className="docs-installation-step-text">{parts.text}</span>
    </span>
  );
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

type InstallationApiGuideProps = {
  slug?: InteractiveInstallationGuideSlug;
};

export default function InstallationApiGuide({
  slug = "installation-api",
}: InstallationApiGuideProps) {
  const { language, messages } = useI18n();
  const guide = useMemo(() => getLocalizedInstallationGuide(messages, slug, language), [language, messages, slug]);
  const defaultTab = guide.tabsSection.tabs[0];
  const [selectedTabValue, setSelectedTabValue] = useState(defaultTab?.value ?? "");
  const [stepsApi, setStepsApi] = useState<CarouselApi>();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const hasInitializedStepSelectionRef = useRef(false);
  const selectorSectionRef = useRef<HTMLElement | null>(null);
  const stepsShellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedTabValue(defaultTab?.value ?? "");
  }, [defaultTab?.value]);

  const activeTab = guide.tabsSection.tabs.find((tab) => tab.value === selectedTabValue) ?? defaultTab;

  useEffect(() => {
    if (typeof window === "undefined" || !selectedTabValue) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(INSTALLATION_GUIDE_STACK_CHANGE_EVENT, {
        detail: { value: selectedTabValue },
      })
    );
  }, [selectedTabValue]);

  const scrollToElement = (element: Element | null, behavior: ScrollBehavior = "smooth") => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.scrollIntoView({ block: "start", behavior });
  };

  const navigateToGuideSection = (nextId: string, behavior: ScrollBehavior = "smooth") => {
    if (!activeTab || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (nextId === guide.tabsSection.id) {
      window.dispatchEvent(
        new CustomEvent("docs:active-section-change", {
          detail: { id: guide.tabsSection.id },
        })
      );
      window.requestAnimationFrame(() => {
        scrollToElement(selectorSectionRef.current, behavior);
      });
      return;
    }

    if (!stepsApi) {
      return;
    }

    const nextIndex = activeTab.sections.findIndex((section) => section.id === nextId);
    if (nextIndex < 0) {
      return;
    }

    const finalizeNavigation = () => {
      setActiveStepIndex(nextIndex);
      window.dispatchEvent(
        new CustomEvent("docs:active-section-change", {
          detail: { id: nextId },
        })
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
    if (!stepsApi || !activeTab) {
      return;
    }

    const nextHashId = getDecodedHashId();
    const nextIndex = activeTab.sections.findIndex((section) => section.id === nextHashId);
    const targetIndex = nextIndex >= 0 ? nextIndex : 0;

    stepsApi.scrollTo(targetIndex, true);
    setActiveStepIndex(targetIndex);
  }, [activeTab, stepsApi]);

  useEffect(() => {
    hasInitializedStepSelectionRef.current = false;

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("docs:refresh-right-items"));
    }
  }, [activeTab?.value]);

  useEffect(() => {
    if (!stepsApi || !activeTab || typeof window === "undefined") {
      return;
    }

    const syncActiveStep = () => {
      const nextIndex = stepsApi.selectedScrollSnap();
      const nextSection = activeTab.sections[nextIndex];

      setActiveStepIndex(nextIndex);

      if (!nextSection) {
        return;
      }

      if (hasInitializedStepSelectionRef.current) {
        syncGuideHashId(nextSection.id);
        window.dispatchEvent(
          new CustomEvent("docs:active-section-change", {
            detail: { id: nextSection.id },
          })
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
  }, [activeTab, stepsApi]);

  useEffect(() => {
    if (!stepsApi || !activeTab || typeof window === "undefined" || typeof document === "undefined") {
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
  }, [activeTab, guide.tabsSection.id, stepsApi]);

  useEffect(() => {
    if (!stepsApi || !activeTab || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const handleSectionNavigation = (event: Event) => {
      const nextId =
        event instanceof CustomEvent && typeof event.detail?.id === "string" ? event.detail.id.trim() : "";

      if (!nextId) {
        return;
      }

      navigateToGuideSection(nextId, "smooth");
    };

    window.addEventListener("docs:navigate-to-section", handleSectionNavigation);
    return () => window.removeEventListener("docs:navigate-to-section", handleSectionNavigation);
  }, [activeTab, guide.tabsSection.id, stepsApi]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const availableTabValues = new Set(guide.tabsSection.tabs.map((tab) => tab.value));

    const handleStackChange = (event: Event) => {
      const nextValue =
        event instanceof CustomEvent && typeof event.detail?.value === "string" ? event.detail.value.trim() : "";

      if (!nextValue || !availableTabValues.has(nextValue) || nextValue === selectedTabValue) {
        return;
      }

      setSelectedTabValue(nextValue);
    };

    window.addEventListener(INSTALLATION_GUIDE_STACK_CHANGE_EVENT, handleStackChange);
    return () => window.removeEventListener(INSTALLATION_GUIDE_STACK_CHANGE_EVENT, handleStackChange);
  }, [guide.tabsSection.tabs, selectedTabValue]);

  if (!activeTab) {
    return null;
  }

  const activeStepId = activeTab.sections[activeStepIndex]?.id ?? "";
  const previousStepTitle = activeTab.sections[activeStepIndex - 1]?.title ?? "";
  const nextStepTitle = activeTab.sections[activeStepIndex + 1]?.title ?? "";

  return (
    <div
      className="docs-sections docs-interactive-guide docs-installation-guide"
      data-active-doc-section={activeStepId}
    >
      <section ref={selectorSectionRef} className="docs-section-block" aria-labelledby={guide.tabsSection.id}>
        <h2 id={guide.tabsSection.id}>{guide.tabsSection.title}</h2>
        {guide.tabsSection.description ? <p>{guide.tabsSection.description}</p> : null}

        {guide.tabsSection.bullets?.length ? (
          <ul>
            {guide.tabsSection.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}

        {guide.tabsSection.actions?.length ? <GuideActions actions={guide.tabsSection.actions} /> : null}

        <div className="docs-installation-tabs-wrap">
          <Tabs
            value={activeTab.value}
            onValueChange={(value) => setSelectedTabValue(value)}
            className="docs-installation-tabs"
          >
            <TabsList className="docs-installation-tabs-list">
              {guide.tabsSection.tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="docs-installation-tab-trigger">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </section>

      <div ref={stepsShellRef} className="docs-installation-steps-carousel-shell">
        <Carousel
          className="docs-installation-steps-carousel-root w-full max-w-full"
          opts={{ align: "start", loop: false }}
          plugins={[AutoHeight()]}
          setApi={setStepsApi}
        >
          <CarouselContent disableGutter className="docs-installation-steps-carousel-track">
            {activeTab.sections.map((section) => (
              <CarouselItem
                disableGutter
                key={`${activeTab.value}-${section.id}`}
                className="docs-installation-steps-carousel-item"
              >
                <section className="docs-section-block docs-installation-step-card" aria-labelledby={section.id}>
                  <h2 id={section.id}>{renderInstallationStepTitle(section.title)}</h2>
                  <div className="docs-installation-step-divider-wrap" aria-hidden="true">
                    <Separator className="docs-installation-step-divider" />
                  </div>
                  <p>{section.description}</p>

                  {section.bullets?.length ? (
                    <ul>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}

                  {section.codeBlocks?.length ? <GuideCodeBlocks blocks={section.codeBlocks} /> : null}

                  {section.actions?.length ? <GuideActions actions={section.actions} /> : null}

                  {slug === "installation-api" && section.id === "paso-7-conectar-web-o-mobile" ? (
                    <div className="docs-cta-wrap docs-installation-links">
                      <Button asChild variant="secondary">
                        <a href="/documentation/installation-web">{messages.common.docsInstallWeb}</a>
                      </Button>
                      <Button asChild variant="secondary">
                        <a href="/documentation/installation-mobile">{messages.common.docsInstallMobile}</a>
                      </Button>
                    </div>
                  ) : null}
                </section>
              </CarouselItem>
            ))}
          </CarouselContent>
          {activeTab.sections.length > 1 ? (
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
                disabled={activeStepIndex >= activeTab.sections.length - 1}
                onClick={() => stepsApi?.scrollNext()}
              >
                <ArrowRight aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </Carousel>

        {activeTab.sections.length > 1 ? (
          <div className="docs-installation-steps-carousel-dots">
            {activeTab.sections.map((section, index) => (
              <button
                key={`${activeTab.value}-${section.id}-dot`}
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
