import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import { navigatePath } from "@/platform/navigation";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | URL;
  children?: ReactNode;
};

export default function Link({ href, children, ...props }: LinkProps) {
  const resolvedHref = typeof href === "string" ? href : href.toString();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    props.onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    if (props.target && props.target !== "_self") {
      return;
    }

    if (props.download) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    let parsedHref: URL;
    try {
      parsedHref = new URL(resolvedHref, window.location.href);
    } catch {
      return;
    }

    if (parsedHref.origin !== window.location.origin) {
      return;
    }

    const normalizedHref = `${parsedHref.pathname}${parsedHref.search}${parsedHref.hash}`;
    if (normalizedHref.length === 0) {
      return;
    }

    event.preventDefault();
    void navigatePath(normalizedHref);
  };

  return (
    <a href={resolvedHref} {...props} onClick={handleClick}>
      {children}
    </a>
  );
}
