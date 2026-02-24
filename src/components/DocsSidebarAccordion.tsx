'use client';

import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type NavaiDocGroupKey = "home" | "installation" | "demo" | "examples" | "libraries";

type DocsSidebarItem = {
  slug: string;
  title: string;
};

type DocsSidebarGroup = {
  groupKey: NavaiDocGroupKey;
  label: string;
  items: DocsSidebarItem[];
};

type DocsSidebarAccordionProps = {
  navTitle: string;
  homeItem?: DocsSidebarItem;
  groups: DocsSidebarGroup[];
  activeSlug?: string;
  onNavigate?: () => void;
};

export default function DocsSidebarAccordion({
  navTitle,
  homeItem,
  groups,
  activeSlug,
  onNavigate,
}: DocsSidebarAccordionProps) {
  const [expandedGroup, setExpandedGroup] = useState<NavaiDocGroupKey | null>(() => {
    const activeGroup = groups.find((group) => group.items.some((item) => item.slug === activeSlug))?.groupKey;
    const defaultGroup = groups.find((group) => group.groupKey === "demo")?.groupKey ?? groups[0]?.groupKey ?? null;
    return activeGroup ?? defaultGroup;
  });

  return (
    <aside className="docs-sidebar">
      <p className="docs-nav-title">{navTitle}</p>
      {homeItem ? (
        <div className="docs-nav-list">
          <Link
            href={`/documentation/${homeItem.slug}`}
            className={`docs-nav-item${activeSlug === homeItem.slug ? " is-active" : ""}`}
            onClick={onNavigate}
          >
            {homeItem.title}
          </Link>
        </div>
      ) : null}

      <div className="docs-nav-groups">
        {groups.map((group) => {
          const isOpen = expandedGroup === group.groupKey;
          const panelId = `docs-group-panel-${group.groupKey}`;

          return (
            <div key={group.groupKey} className={`docs-nav-group${isOpen ? " is-open" : ""}`}>
              <button
                type="button"
                className={`docs-group-toggle${isOpen ? " is-open" : ""}`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setExpandedGroup((current) => (current === group.groupKey ? null : group.groupKey))
                }
              >
                <span className="docs-group-title">{group.label}</span>
                {isOpen ? (
                  <ChevronUp className="docs-group-arrow" aria-hidden="true" />
                ) : (
                  <ChevronDown className="docs-group-arrow" aria-hidden="true" />
                )}
              </button>

              <div id={panelId} className={`docs-group-panel${isOpen ? " is-open" : ""}`} hidden={!isOpen}>
                {group.items.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/documentation/${doc.slug}`}
                    className={`docs-nav-item docs-nav-subitem${activeSlug === doc.slug ? " is-active" : ""}`}
                    onClick={onNavigate}
                  >
                    {doc.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
