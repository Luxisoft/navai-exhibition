import { useEffect, useMemo, useState } from "react";

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
