import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | URL;
  children?: ReactNode;
};

export default function Link({ href, children, ...props }: LinkProps) {
  const resolvedHref = typeof href === "string" ? href : href.toString();
  return (
    <a href={resolvedHref} {...props}>
      {children}
    </a>
  );
}
