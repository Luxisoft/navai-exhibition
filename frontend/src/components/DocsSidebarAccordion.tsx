'use client';

import Link from "@/platform/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type DocsSidebarGroupKey = string;

type DocsSidebarItem = {
  slug: string;
  title: string;
  children?: DocsSidebarItem[];
};

type DocsSidebarGroup = {
  groupKey: DocsSidebarGroupKey;
  label: string;
  items: DocsSidebarItem[];
};

type DocsSidebarAccordionProps = {
  navTitle: string;
  homeItem?: DocsSidebarItem;
  groups: DocsSidebarGroup[];
  activeSlug?: string;
  onNavigate?: () => void;
  defaultExpandedGroupKey?: string;
  basePath?: string;
};

export default function DocsSidebarAccordion({
  navTitle,
  homeItem,
  groups,
  activeSlug,
  onNavigate,
  defaultExpandedGroupKey: _defaultExpandedGroupKey,
  basePath = "/documentation",
}: DocsSidebarAccordionProps) {
  const itemContainsActive = (item: DocsSidebarItem): boolean =>
    item.slug === activeSlug || Boolean(item.children?.some((child) => itemContainsActive(child)));

  const [expandedGroup, setExpandedGroup] = useState<DocsSidebarGroupKey | null>(() => {
    const activeGroup = groups.find((group) => group.items.some((item) => itemContainsActive(item)))?.groupKey;
    return activeGroup ?? null;
  });
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      groups
        .flatMap((group) => group.items)
        .filter((item) => item.children && item.children.length > 0)
        .map((item) => [item.slug, itemContainsActive(item)])
    )
  );

  return (
    <aside className="docs-sidebar">
      <p className="docs-nav-title">{navTitle}</p>
      {homeItem ? (
        <div className="docs-nav-list">
          <Link
            href={`${basePath}/${homeItem.slug}`}
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
                {group.items.map((doc) => {
                  const hasChildren = Boolean(doc.children?.length);
                  if (!hasChildren) {
                    return (
                      <Link
                        key={doc.slug}
                        href={`${basePath}/${doc.slug}`}
                        className={`docs-nav-item docs-nav-subitem${activeSlug === doc.slug ? " is-active" : ""}`}
                        onClick={onNavigate}
                      >
                        {doc.title}
                      </Link>
                    );
                  }

                  const branchOpen = expandedBranches[doc.slug] ?? false;
                  const branchPanelId = `docs-branch-panel-${group.groupKey}-${doc.slug}`;
                  const branchActive = itemContainsActive(doc);

                  return (
                    <div key={doc.slug} className={`docs-nav-branch${branchOpen ? " is-open" : ""}`}>
                      <div className={`docs-nav-branch-row${branchActive ? " is-active" : ""}`}>
                        <Link
                          href={`${basePath}/${doc.slug}`}
                          className={`docs-nav-item docs-nav-subitem docs-nav-branch-link${activeSlug === doc.slug ? " is-active" : ""}`}
                          onClick={onNavigate}
                        >
                          {doc.title}
                        </Link>
                        <button
                          type="button"
                          className="docs-nav-branch-toggle"
                          aria-expanded={branchOpen}
                          aria-controls={branchPanelId}
                          onClick={() =>
                            setExpandedBranches((current) => ({ ...current, [doc.slug]: !branchOpen }))
                          }
                        >
                          {branchOpen ? (
                            <ChevronUp className="docs-group-arrow" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="docs-group-arrow" aria-hidden="true" />
                          )}
                        </button>
                      </div>

                      <div
                        id={branchPanelId}
                        className={`docs-nav-subpanel${branchOpen ? " is-open" : ""}`}
                        hidden={!branchOpen}
                      >
                        {doc.children?.map((child) => (
                          <Link
                            key={child.slug}
                            href={`${basePath}/${child.slug}`}
                            className={`docs-nav-item docs-nav-subitem docs-nav-subsubitem${
                              activeSlug === child.slug ? " is-active" : ""
                            }`}
                            onClick={onNavigate}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

