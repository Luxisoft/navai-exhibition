"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import EmblaCarousel, {
  type EmblaCarouselType,
  type EmblaOptionsType,
  type EmblaPluginType,
} from "embla-carousel";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CarouselApi = EmblaCarouselType | undefined;
type CarouselOptions = EmblaOptionsType | undefined;
type CarouselPlugin = EmblaPluginType[] | undefined;

type CarouselProps = ComponentProps<"div"> & {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextValue = {
  carouselRef: (instance: HTMLDivElement | null) => void;
  api: CarouselApi;
  opts?: CarouselOptions;
  orientation: "horizontal" | "vertical";
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

const CarouselContext = createContext<CarouselContextValue | null>(null);

function useCarousel() {
  const context = useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: CarouselProps) {
  return (
    <CarouselClient
      orientation={orientation}
      opts={opts}
      setApi={setApi}
      plugins={plugins}
      className={className}
      {...props}
    >
      {children}
    </CarouselClient>
  );
}

function CarouselClient({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: CarouselProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pluginsRef = useRef<CarouselPlugin>(plugins);
  const [api, setInternalApi] = useState<CarouselApi>(undefined);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const axis: NonNullable<EmblaOptionsType["axis"]> = orientation === "horizontal" ? "x" : "y";
  const optionsKey = JSON.stringify({
    ...(opts ?? {}),
    axis,
  });
  const normalizedOptions = useMemo(
    () => ({
      ...(opts ?? {}),
      axis,
    }),
    [axis, optionsKey]
  );

  useEffect(() => {
    pluginsRef.current = plugins;
  }, [plugins]);

  const carouselRef = useCallback((instance: HTMLDivElement | null) => {
    viewportRef.current = instance;
  }, []);

  const onSelect = useCallback((nextApi: CarouselApi) => {
    if (!nextApi) {
      return;
    }

    setCanScrollPrev(nextApi.canScrollPrev());
    setCanScrollNext(nextApi.canScrollNext());
  }, []);

  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollPrev();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollNext, scrollPrev]
  );

  useEffect(() => {
    if (!setApi) {
      return;
    }

    setApi(api);
  }, [api, setApi]);

  useEffect(() => {
    const viewportNode = viewportRef.current;
    if (!viewportNode) {
      return;
    }

    const emblaApi = EmblaCarousel(
      viewportNode,
      normalizedOptions,
      pluginsRef.current
    );

    setInternalApi(emblaApi);
    onSelect(emblaApi);

    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.destroy();
    };
  }, [normalizedOptions, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        opts,
        orientation,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

type CarouselContentProps = ComponentProps<"div"> & {
  disableGutter?: boolean;
};

const CarouselContent = forwardRef<HTMLDivElement, CarouselContentProps>(
  ({ className, disableGutter = false, ...props }, ref) => {
    const { carouselRef, orientation } = useCarousel();

    return (
      <div ref={carouselRef} className="overflow-hidden">
        <div
          ref={ref}
          className={cn(
            "flex",
            orientation === "horizontal"
              ? disableGutter
                ? ""
                : "-ml-4"
              : disableGutter
                ? "flex-col"
                : "-mt-4 flex-col",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CarouselContent.displayName = "CarouselContent";

type CarouselItemProps = ComponentProps<"div"> & {
  disableGutter?: boolean;
};

const CarouselItem = forwardRef<HTMLDivElement, CarouselItemProps>(
  ({ className, disableGutter = false, ...props }, ref) => {
    const { orientation } = useCarousel();

    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={cn(
          "min-w-0 shrink-0 grow-0 basis-full",
          orientation === "horizontal"
            ? disableGutter
              ? ""
              : "pl-4"
            : disableGutter
              ? ""
              : "pt-4",
          className
        )}
        {...props}
      />
    );
  }
);
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = forwardRef<HTMLButtonElement, ComponentProps<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel();

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute size-8 rounded-full",
          orientation === "horizontal"
            ? "-left-12 top-1/2 -translate-y-1/2"
            : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
          className
        )}
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        {...props}
      >
        <ArrowLeft />
      </Button>
    );
  }
);
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = forwardRef<HTMLButtonElement, ComponentProps<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { orientation, scrollNext, canScrollNext } = useCarousel();

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute size-8 rounded-full",
          orientation === "horizontal"
            ? "-right-12 top-1/2 -translate-y-1/2"
            : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
          className
        )}
        disabled={!canScrollNext}
        onClick={scrollNext}
        {...props}
      >
        <ArrowRight />
      </Button>
    );
  }
);
CarouselNext.displayName = "CarouselNext";

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
  type CarouselOptions,
  type CarouselPlugin,
};
