import { useEffect, useMemo, useState } from "react";

const PATH_CHANGE_EVENT = "navai:path-change";

function emitPathChange() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(PATH_CHANGE_EVENT));
}

function readPathname() {
  if (typeof window === "undefined") {
    return "/";
  }
  return window.location.pathname;
}

export function usePathname() {
  const [pathname, setPathname] = useState(readPathname);

  useEffect(() => {
    const sync = () => setPathname(readPathname());
    window.addEventListener("popstate", sync);
    window.addEventListener(PATH_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(PATH_CHANGE_EVENT, sync);
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

export function redirect(href: string) {
  if (typeof window !== "undefined") {
    window.location.assign(href);
    return;
  }
  throw new Error(`redirect(${href}) is only available during browser navigation.`);
}

export function notFound(): never {
  throw new Error("notFound() can only be handled by server-side route code.");
}
