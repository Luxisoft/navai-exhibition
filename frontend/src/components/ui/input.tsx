import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[0.62rem] border border-input bg-background/75 px-3 py-2 text-sm text-foreground shadow-sm transition-[border-color,box-shadow,background-color] outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/35",
        className
      )}
      {...props}
    />
  );
}

export { Input };
