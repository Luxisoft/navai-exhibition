'use client';

import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type DocsSidebarItem = {
  slug: string;
  title: string;
};

type DocsSidebarGroup = {
  group: string;
  items: DocsSidebarItem[];
};

type DocsSidebarAccordionProps = {
  navTitle?: string;
  homeItem?: DocsSidebarItem;
  groups: DocsSidebarGroup[];
  activeSlug?: string;
};

export default function DocsSidebarAccordion({
  navTitle = "Documentation",
  homeItem,
  groups,
  activeSlug,
}: DocsSidebarAccordionProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    const activeGroup = groups.find((group) => group.items.some((item) => item.slug === activeSlug))?.group;
    const defaultGroup = groups.find((group) => group.group === "Demo")?.group ?? groups[0]?.group ?? null;
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
          >
            {homeItem.title}
          </Link>
        </div>
      ) : null}

      <div className="docs-nav-groups">
        {groups.map((group) => {
          const isOpen = expandedGroup === group.group;
          const panelId = `docs-group-panel-${group.group.toLowerCase().replace(/\s+/g, "-")}`;

          return (
            <div key={group.group} className={`docs-nav-group${isOpen ? " is-open" : ""}`}>
              <button
                type="button"
                className={`docs-group-toggle${isOpen ? " is-open" : ""}`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setExpandedGroup((current) => (current === group.group ? null : group.group))
                }
              >
                <span className="docs-group-title">{group.group}</span>
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
