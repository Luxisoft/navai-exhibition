"use client";

import { useEffect, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

export type HomeUseCaseCard = {
  title: string;
  description: string;
  icon: string;
};

type HomeUseCasesCarouselProps = {
  cards: HomeUseCaseCard[];
};

export default function HomeUseCasesCarousel({ cards }: HomeUseCasesCarouselProps) {
  const autoplayPlugin = useRef(
    Autoplay({
      delay: 6000,
      stopOnInteraction: false,
    })
  );
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    const syncActiveIndex = () => {
      setActiveIndex(api.selectedScrollSnap());
    };

    syncActiveIndex();
    api.on("reInit", syncActiveIndex);
    api.on("select", syncActiveIndex);

    return () => {
      api.off("select", syncActiveIndex);
      api.off("reInit", syncActiveIndex);
    };
  }, [api]);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="docs-use-case-carousel-shell">
      <Carousel
        className="docs-use-case-carousel-root w-full"
        opts={{ align: "start", loop: true }}
        plugins={[autoplayPlugin.current]}
        setApi={setApi}
      >
        <CarouselContent disableGutter className="docs-use-case-carousel-track">
          {cards.map((card) => (
            <CarouselItem disableGutter key={`${card.title}-${card.icon}`} className="docs-use-case-carousel-item">
              <article className="docs-use-case-card">
                <div className="docs-use-case-card-head">
                  <span className="docs-use-case-card-icon" aria-hidden="true">
                    {card.icon}
                  </span>
                  <h4>{card.title}</h4>
                </div>
                {card.description ? <p>{card.description}</p> : null}
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {cards.length > 1 ? (
        <div className="docs-use-case-carousel-dots">
          {cards.map((card, index) => (
            <button
              key={`${card.title}-dot`}
              type="button"
              className={`docs-use-case-carousel-dot${index === activeIndex ? " is-active" : ""}`}
              aria-label={card.title}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => {
                api?.scrollTo(index);
                autoplayPlugin.current.reset();
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
