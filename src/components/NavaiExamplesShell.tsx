'use client';

import { useMemo, type ReactNode } from "react";

import NavaiDocsShell from "@/components/NavaiDocsShell";
import { getLocalizedNavaiExamples } from "@/i18n/examples-catalog";
import { useI18n } from "@/i18n/provider";

type RightItem = {
  href: string;
  label: string;
  depth?: 2 | 3;
};

type NavaiExamplesShellProps = {
  activeSlug: string;
  badge: string;
  title: string;
  description: string;
  hideMainHeader?: boolean;
  sourceHref?: string;
  rightItems: RightItem[];
  children: ReactNode;
};

export default function NavaiExamplesShell({
  activeSlug,
  badge,
  title,
  description,
  hideMainHeader = false,
  sourceHref,
  rightItems,
  children,
}: NavaiExamplesShellProps) {
  const { language } = useI18n();
  const examples = useMemo(() => getLocalizedNavaiExamples(language), [language]);
  const localizedEntry = examples.entries[activeSlug];

  return (
    <NavaiDocsShell
      activeSlug={activeSlug}
      badge={badge}
      title={localizedEntry?.title ?? title}
      description={localizedEntry?.summary ?? description}
      homeItem={examples.homeItem}
      groups={examples.groups}
      hideMainHeader={hideMainHeader}
      sourceHref={sourceHref}
      rightItems={rightItems}
      sidebarBasePath="/example"
      topNavActive="examples"
      defaultExpandedGroupKey="ecommerce"
    >
      {children}
    </NavaiDocsShell>
  );
}
