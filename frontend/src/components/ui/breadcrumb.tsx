import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

const Breadcrumb = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<"nav">>(
  ({ className, "aria-label": ariaLabel = "breadcrumb", ...props }, ref) => (
    <nav
      ref={ref}
      aria-label={ariaLabel}
      className={cn("w-full min-w-0 overflow-hidden", className)}
      {...props}
    />
  )
);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<"ol">>(
  ({ className, style, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        "m-0 flex w-full min-w-0 list-none flex-nowrap items-center gap-1.5 overflow-hidden p-0 whitespace-nowrap text-sm text-muted-foreground sm:gap-2.5",
        className
      )}
      style={{
        display: "flex",
        flexWrap: "nowrap",
        alignItems: "center",
        listStyle: "none",
        margin: 0,
        padding: 0,
        ...style,
      }}
      {...props}
    />
  )
);
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
  ({ className, style, ...props }, ref) => (
    <li
      ref={ref}
      className={cn("inline-flex min-w-0 max-w-full shrink-0 items-center gap-1.5", className)}
      style={{
        display: "inline-flex",
        flexWrap: "nowrap",
        alignItems: "center",
        minWidth: 0,
        ...style,
      }}
      {...props}
    />
  )
);
BreadcrumbItem.displayName = "BreadcrumbItem";

type BreadcrumbLinkProps = React.ComponentPropsWithoutRef<"a"> & {
  asChild?: boolean;
};

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "a";

    return (
      <Comp
        ref={ref}
        className={cn("truncate transition-colors hover:text-foreground", className)}
        {...props}
      />
    );
  }
);
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("truncate font-medium text-foreground", className)}
      {...props}
    />
  )
);
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = ({
  children,
  className,
  style,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("shrink-0 [&>svg]:size-3.5", className)}
    style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, ...style }}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
