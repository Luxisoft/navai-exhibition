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

export function usePathname() {
  const [pathname, setPathname] = useState(readPathname);

  useEffect(() => {
    const sync = () => setPathname(readPathname());
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("popstate", sync);
    };
  }, []);

  return pathname;
}

export function useRouter() {
  return useMemo(
    () => ({
      push: (href: string) => {
        if (typeof window === "undefined") {
          return;
        }
        window.location.assign(href);
      },
      replace: (href: string) => {
        if (typeof window === "undefined") {
          return;
        }
        window.location.replace(href);
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
