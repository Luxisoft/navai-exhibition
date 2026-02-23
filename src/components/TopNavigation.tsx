'use client';

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import GooeyNav from "@/components/GooeyNav";
import { useI18n } from "@/i18n/provider";

export default function TopNavigation() {
  const { messages } = useI18n();
  const pathname = usePathname();
  const navItems = useMemo(
    () => [
      { label: messages.common.home, href: "/" },
      { label: messages.common.documentation, href: "/documentation" },
      { label: messages.common.requestImplementation, href: "/request-implementation" },
    ],
    [messages.common.documentation, messages.common.home, messages.common.requestImplementation]
  );

  const activeIndex = useMemo(() => {
    const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    const index = navItems.findIndex((item) => item.href === normalizedPath);
    return index >= 0 ? index : 0;
  }, [navItems, pathname]);

  return (
    <header className="top-nav-wrapper">
      <div className="top-nav-shell">
        <GooeyNav
          key={`${pathname}-${activeIndex}`}
          items={navItems}
          particleCount={15}
          particleDistances={[90, 10]}
          particleR={100}
          initialActiveIndex={activeIndex}
          animationTime={600}
          timeVariance={300}
          colors={[1, 2, 3, 1, 2, 3, 1, 4]}
        />
      </div>
    </header>
  );
}
