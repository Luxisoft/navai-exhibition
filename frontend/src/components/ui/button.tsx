import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.65rem] text-sm font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary/25 bg-linear-to-b from-primary/10 to-primary/20 text-primary shadow-sm hover:-translate-y-px hover:border-primary/40 hover:from-primary/15 hover:to-primary/25 dark:border-white/10 dark:bg-[#1c1c1d] dark:bg-none dark:text-[#f5f5f5] dark:hover:bg-[#2f2f30] dark:hover:border-white/15",
        secondary:
          "border border-border/70 bg-card/75 text-card-foreground shadow-sm hover:-translate-y-px hover:bg-accent/80 dark:bg-[#1c1c1d] dark:text-[#f5f5f5] dark:hover:bg-[#2f2f30] dark:border-white/10",
        outline:
          "border border-border/70 bg-background/65 text-foreground shadow-sm hover:-translate-y-px hover:bg-accent/75 dark:bg-[#1c1c1d] dark:text-[#f5f5f5] dark:hover:bg-[#2f2f30] dark:border-white/10",
        ghost: "text-foreground hover:bg-accent/70 dark:text-[#f5f5f5] dark:hover:bg-[#2f2f30]",
        link: "h-auto rounded-none border-0 bg-transparent p-0 text-primary shadow-none hover:underline",
        success:
          "border border-emerald-500/30 bg-linear-to-b from-emerald-50 to-emerald-100 text-emerald-700 shadow-sm hover:-translate-y-px hover:border-emerald-500/45 hover:from-emerald-100 hover:to-emerald-200 dark:border-emerald-400/30 dark:from-emerald-950/45 dark:to-emerald-900/55 dark:text-emerald-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3.5",
        lg: "h-11 px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
