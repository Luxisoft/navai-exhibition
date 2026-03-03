import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from "react";

type DynamicLoader<P> = () => Promise<{ default: ComponentType<P> } | ComponentType<P>>;

type DynamicOptions = {
  ssr?: boolean;
  loading?: ComponentType<Record<string, never>>;
};

export default function dynamic<P extends object>(
  loader: DynamicLoader<P>,
  options: DynamicOptions = {}
): ComponentType<P> {
  const { ssr = true, loading: LoadingComponent } = options;

  const LazyComponent = lazy(async () => {
    const loaded = await loader();
    if (typeof loaded === "function") {
      return { default: loaded };
    }
    return loaded;
  });

  function DynamicComponent(props: P) {
    const [isClientReadyForNoSSR, setIsClientReadyForNoSSR] = useState(ssr);

    useEffect(() => {
      if (!ssr) {
        setIsClientReadyForNoSSR(true);
      }
    }, [ssr]);

    // Keep first render as null for no-SSR components so server/client HTML matches during hydration.
    if (!isClientReadyForNoSSR) {
      return null;
    }

    const fallback: ReactNode = LoadingComponent ? <LoadingComponent /> : null;
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  DynamicComponent.displayName = "DynamicComponent";
  return DynamicComponent;
}
