"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function TopbarControlsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("docs-topbar-controls docs-topbar-controls--skeleton", className)}
      aria-hidden="true"
    >
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-10 w-32 rounded-xl" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
  );
}

export function MiniVoiceOrbSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn("navai-mini-orb-skeleton", compact && "is-compact")}
      aria-hidden="true"
    >
      <Skeleton
        className={cn(
          "rounded-full",
          compact ? "h-[2.7rem] w-[2.7rem]" : "h-[3.15rem] w-[3.15rem]",
        )}
      />
    </div>
  );
}

export function SidebarNavSkeleton({ withToc = false }: { withToc?: boolean }) {
  return (
    <div className="docs-skeleton-sidebar" aria-hidden="true">
      <Skeleton className="h-3 w-24 rounded-full" />
      <div className="docs-skeleton-sidebar-list">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={`nav-${index}`} className="h-10 w-full rounded-xl" />
        ))}
      </div>
      {withToc ? (
        <>
          <Skeleton className="h-3 w-20 rounded-full" />
          <div className="docs-skeleton-sidebar-list">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`toc-${index}`} className="h-4 w-full rounded-full" />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function RightSidebarSkeleton({ lines = 4, cards = 0 }: { lines?: number; cards?: number }) {
  return (
    <div className="docs-skeleton-rightbar" aria-hidden="true">
      <Skeleton className="h-3 w-28 rounded-full" />
      <div className="docs-skeleton-sidebar-list">
        {cards > 0
          ? Array.from({ length: cards }).map((_, index) => (
              <Skeleton key={`card-${index}`} className="h-24 w-full rounded-2xl" />
            ))
          : Array.from({ length: lines }).map((_, index) => (
              <Skeleton key={`line-${index}`} className="h-4 w-full rounded-full" />
            ))}
      </div>
    </div>
  );
}

export function PanelContentSkeleton() {
  return (
    <article className="navai-panel-layout" aria-hidden="true">
      <section className="docs-section-block navai-panel-card navai-panel-card--loading-skeleton">
        <div className="navai-skeleton-stack">
          <Skeleton className="h-10 w-56 rounded-xl" />
          <Skeleton className="h-5 w-full max-w-2xl rounded-full" />
          <Skeleton className="h-5 w-1/2 max-w-xl rounded-full" />
        </div>

        <div className="navai-skeleton-actions-row">
          <Skeleton className="h-11 w-40 rounded-xl" />
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>

        <div className="navai-skeleton-table-card">
          <div className="navai-skeleton-table-toolbar">
            <Skeleton className="h-11 flex-1 max-w-md rounded-xl" />
            <div className="navai-skeleton-inline-actions">
              <Skeleton className="h-11 w-36 rounded-xl" />
              <Skeleton className="h-11 w-28 rounded-xl" />
            </div>
          </div>
          <div className="navai-skeleton-table-head">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={`head-${index}`}
                className={`h-4 rounded-full ${
                  index === 0 ? "w-20" : index === 1 ? "w-24" : index === 2 ? "w-28" : "w-20"
                }`}
              />
            ))}
          </div>
          <div className="navai-skeleton-table-body">
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <div key={`row-${rowIndex}`} className="navai-skeleton-table-row">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <div className="navai-skeleton-table-actions-cell">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}

export function PanelSidebarCardsSkeleton() {
  return (
    <section className="navai-panel-sidebar-section" aria-hidden="true">
      <div className="navai-panel-sidebar-header">
        <div className="navai-panel-sidebar-copy">
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <div className="navai-support-ticket-items">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`sidebar-${index}`} className="navai-support-ticket-item">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function DomainListLoadingSkeleton() {
  return (
    <div className="navai-panel-domain-list" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={`domain-${index}`} className="navai-panel-domain-item">
          <Skeleton className="h-6 w-32 rounded-full" />
          <div className="navai-panel-sidebar-item-meta-row">
            <Skeleton className="h-4 w-24 rounded-full" />
            <div className="navai-panel-domain-card-actions">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PublicExperienceLoadingSkeleton() {
  return (
    <div className="navai-public-experience-shell navai-public-experience-shell--loading" aria-hidden="true">
      <Skeleton className="h-24 w-72 rounded-[2rem]" />
      <Skeleton className="h-6 w-[28rem] max-w-full rounded-full" />
      <Skeleton className="h-6 w-[22rem] max-w-full rounded-full" />
      <Skeleton className="h-40 w-40 rounded-full" />
      <Skeleton className="h-12 w-56 rounded-full" />
    </div>
  );
}

export function ChartPanelSkeleton() {
  return (
    <div className="navai-panel-chart-shell navai-panel-chart-shell--compact navai-panel-chart-shell--skeleton" aria-hidden="true">
      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  );
}

export function HomeVoiceSkeleton() {
  return (
    <div className="home-voice home-voice--skeleton" aria-hidden="true">
      <div className="navai-mic-stack">
        <Skeleton className="h-[3.15rem] w-[min(92vw,520px)] rounded-2xl" />
        <Skeleton className="h-[8.4rem] w-[8.4rem] rounded-full" />
      </div>
    </div>
  );
}

export function HomeFooterControlsSkeleton() {
  return (
    <div className="home-footer-controls home-footer-controls--skeleton" aria-hidden="true">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-10 w-28 rounded-xl" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
  );
}
