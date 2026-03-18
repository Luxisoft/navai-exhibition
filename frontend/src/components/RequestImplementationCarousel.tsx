'use client';

import AutoHeight from "embla-carousel-auto-height";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import type { LocalizedSection } from "@/lib/i18n/messages";

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

function syncCarouselHashId(nextId: string) {
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
  window.dispatchEvent(new Event("hashchange"));
}

type RequestImplementationCarouselProps = {
  sections: LocalizedSection[];
};

export default function RequestImplementationCarousel({
  sections,
}: RequestImplementationCarouselProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const hasInitializedSlideSelectionRef = useRef(false);
  const carouselShellRef = useRef<HTMLDivElement | null>(null);

  const navigateToSlide = (
    nextId: string,
    behavior: ScrollBehavior = "smooth",
  ) => {
    if (
      !carouselApi ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }

    const nextIndex = sections.findIndex((section) => section.id === nextId);
    if (nextIndex < 0) {
      return;
    }

    const finalizeNavigation = () => {
      setActiveSlideIndex(nextIndex);
      window.requestAnimationFrame(() => {
        const targetHeading = document.getElementById(nextId);
        (targetHeading ?? carouselShellRef.current)?.scrollIntoView({
          block: "start",
          behavior,
        });
      });
    };

    if (carouselApi.selectedScrollSnap() === nextIndex) {
      finalizeNavigation();
      return;
    }

    const handleSettle = () => {
      carouselApi.off("settle", handleSettle);
      finalizeNavigation();
    };

    carouselApi.on("settle", handleSettle);
    carouselApi.scrollTo(nextIndex);
  };

  useEffect(() => {
    if (!carouselApi || sections.length === 0) {
      return;
    }

    const nextHashId = getDecodedHashId();
    const nextIndex = sections.findIndex((section) => section.id === nextHashId);
    const targetIndex = nextIndex >= 0 ? nextIndex : 0;

    carouselApi.scrollTo(targetIndex, true);
    setActiveSlideIndex(targetIndex);
  }, [carouselApi, sections]);

  useEffect(() => {
    hasInitializedSlideSelectionRef.current = false;
  }, [sections]);

  useEffect(() => {
    if (!carouselApi || sections.length === 0 || typeof window === "undefined") {
      return;
    }

    const syncActiveSlide = () => {
      const nextIndex = carouselApi.selectedScrollSnap();
      const nextSection = sections[nextIndex];

      setActiveSlideIndex(nextIndex);

      if (!nextSection) {
        return;
      }

      if (hasInitializedSlideSelectionRef.current) {
        syncCarouselHashId(nextSection.id);
      } else {
        hasInitializedSlideSelectionRef.current = true;
      }
    };

    syncActiveSlide();
    carouselApi.on("reInit", syncActiveSlide);
    carouselApi.on("select", syncActiveSlide);

    return () => {
      carouselApi.off("select", syncActiveSlide);
      carouselApi.off("reInit", syncActiveSlide);
    };
  }, [carouselApi, sections]);

  useEffect(() => {
    if (
      !carouselApi ||
      sections.length === 0 ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }

    const syncFromHash = () => {
      const nextHashId = getDecodedHashId();
      if (!nextHashId) {
        return;
      }

      navigateToSlide(nextHashId, "smooth");
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [carouselApi, sections]);

  if (sections.length === 0) {
    return null;
  }

  const previousSlideTitle = sections[activeSlideIndex - 1]?.title ?? "";
  const nextSlideTitle = sections[activeSlideIndex + 1]?.title ?? "";

  return (
    <div
      ref={carouselShellRef}
      className="docs-installation-steps-carousel-shell impl-request-carousel-shell"
    >
      <Carousel
        className="docs-installation-steps-carousel-root w-full max-w-full"
        opts={{ align: "start", loop: false }}
        plugins={[AutoHeight()]}
        setApi={setCarouselApi}
      >
        <CarouselContent disableGutter className="docs-installation-steps-carousel-track">
          {sections.map((section) => {
            const hasBullets = Boolean(section.bullets?.length);

            return (
              <CarouselItem
                disableGutter
                key={section.id}
                className="docs-installation-steps-carousel-item"
              >
                <section
                  id={section.id}
                  className={`docs-section-block docs-installation-step-card impl-request-slide-card${
                    hasBullets ? "" : " impl-request-slide-card--copy"
                  }`}
                  aria-labelledby={`${section.id}-title`}
                >
                  {hasBullets && section.description ? (
                    <p className="impl-request-slide-kicker">{section.description}</p>
                  ) : null}

                  <h2 id={`${section.id}-title`}>{section.title}</h2>

                  <div className="docs-installation-step-divider-wrap" aria-hidden="true">
                    <Separator className="docs-installation-step-divider" />
                  </div>

                  {!hasBullets && section.description ? (
                    <p className="impl-request-slide-copy">{section.description}</p>
                  ) : null}

                  {section.bullets?.length ? (
                    <ul>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {sections.length > 1 ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="docs-installation-steps-carousel-arrow docs-installation-steps-carousel-arrow--prev"
              aria-label={previousSlideTitle}
              title={previousSlideTitle}
              disabled={activeSlideIndex === 0}
              onClick={() => carouselApi?.scrollPrev()}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="docs-installation-steps-carousel-arrow docs-installation-steps-carousel-arrow--next"
              aria-label={nextSlideTitle}
              title={nextSlideTitle}
              disabled={activeSlideIndex >= sections.length - 1}
              onClick={() => carouselApi?.scrollNext()}
            >
              <ArrowRight aria-hidden="true" />
            </Button>
          </>
        ) : null}
      </Carousel>

      {sections.length > 1 ? (
        <div className="docs-installation-steps-carousel-dots">
          {sections.map((section, index) => (
            <button
              key={`${section.id}-dot`}
              type="button"
              className={`docs-installation-steps-carousel-dot${
                index === activeSlideIndex ? " is-active" : ""
              }`}
              aria-label={section.title}
              aria-current={index === activeSlideIndex ? "true" : undefined}
              onClick={() => carouselApi?.scrollTo(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
