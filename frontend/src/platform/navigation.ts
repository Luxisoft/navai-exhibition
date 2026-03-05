import { useEffect, useMemo, useState } from "react";

export function normalizePathname(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return "/";
  }

  const withoutQueryOrHash = trimmed.split(/[?#]/, 1)[0] || "/";
  if (withoutQueryOrHash === "/") {
    return "/";
  }

  return withoutQueryOrHash.endsWith("/") ? withoutQueryOrHash.slice(0, -1) : withoutQueryOrHash;
}

function readPathname() {
  if (typeof window === "undefined") {
    return "/";
  }
  return normalizePathname(window.location.pathname);
}

async function tryAstroNavigate(href: string, history: "push" | "replace") {
  try {
    const transitionsClient = await import("astro:transitions/client");
    await transitionsClient.navigate(href, { history });
    return { handled: true as const, error: null };
  } catch (error) {
    return { handled: false as const, error };
  }
}

let hasWarnedNavigationFallback = false;

function warnNavigationFallback(href: string, error: unknown) {
  if (hasWarnedNavigationFallback || typeof console === "undefined") {
    return;
  }

  hasWarnedNavigationFallback = true;
  const reason = error instanceof Error ? error.message : String(error ?? "");
  if (reason) {
    console.warn(
      "[NAVAI] Client-side navigation fallback to full reload. Voice session may reset between pages.",
      { href, reason }
    );
    return;
  }

  console.warn(
    "[NAVAI] Client-side navigation fallback to full reload. Voice session may reset between pages.",
    { href }
  );
}

export async function navigatePath(href: string, options?: { replace?: boolean }) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedHref = String(href ?? "").trim();
  if (!normalizedHref) {
    return;
  }

  const replace = options?.replace === true;
  const astroNavigationResult = await tryAstroNavigate(
    normalizedHref,
    replace ? "replace" : "push"
  );
  if (astroNavigationResult.handled) {
    return;
  }

  warnNavigationFallback(normalizedHref, astroNavigationResult.error);

  if (replace) {
    window.location.replace(normalizedHref);
    return;
  }
  window.location.assign(normalizedHref);
}

export function usePathname() {
  const [pathname, setPathname] = useState("/");

  useEffect(() => {
    const sync = () => setPathname(readPathname());
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("astro:after-swap", sync);
    window.addEventListener("astro:page-load", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("astro:after-swap", sync);
      window.removeEventListener("astro:page-load", sync);
    };
  }, []);

  return pathname;
}

export function useRouter() {
  return useMemo(
    () => ({
      push: (href: string) => {
        void navigatePath(href, { replace: false });
      },
      replace: (href: string) => {
        void navigatePath(href, { replace: true });
      },
      back: () => {
        if (typeof window === "undefined") {
          return;
        }
        window.history.back();
      },
      forward: () => {
        if (typeof window === "undefined") {
          return;
        }
        window.history.forward();
      },
      refresh: () => {
        if (typeof window === "undefined") {
          return;
        }
        window.location.reload();
      },
    }),
    []
  );
}
