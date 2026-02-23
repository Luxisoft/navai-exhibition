'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Github } from "lucide-react";
import type { ReactNode } from "react";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import type { LocalizedPlan, LocalizedSection } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";

type KnowledgeTemplateProps = {
  badge: string;
  title: string;
  description: string;
  sidebarTitle: string;
  sections: LocalizedSection[];
  sourceLabel: string;
  sourceHref: string;
  plansTitle?: string;
  plans?: LocalizedPlan[];
  ctaLabel?: string;
  ctaHref?: string;
  contactSectionId?: string;
  contactSectionTitle?: string;
  contactSectionDescription?: string;
  contactForm?: ReactNode;
};

export default function KnowledgeTemplate({
  badge,
  title,
  description,
  sidebarTitle,
  sections,
  sourceLabel,
  sourceHref,
  plansTitle,
  plans,
  ctaLabel,
  ctaHref,
  contactSectionId,
  contactSectionTitle,
  contactSectionDescription,
  contactForm,
}: KnowledgeTemplateProps) {
  const { messages } = useI18n();
  const pathname = usePathname();

  const pageLinks = [
    { href: "/documentation", label: messages.common.documentation },
    { href: "/request-implementation", label: messages.common.requestImplementation },
  ];

  const tocItems = [
    ...sections.map((section) => ({ id: section.id, label: section.title })),
    ...(plans && plans.length > 0 ? [{ id: "plans", label: plansTitle ?? "Plans" }] : []),
    ...(contactForm && contactSectionId && contactSectionTitle
      ? [{ id: contactSectionId, label: contactSectionTitle }]
      : []),
  ];

  return (
    <section className="docs-layout">
      <header className="docs-topbar">
        <div className="docs-topbar-left">
          <Link href="/" className="docs-brand" aria-label="Navai Home">
            <Image src="/navai_banner.png" alt="Navai" width={140} height={50} priority />
          </Link>

          <nav className="docs-top-tabs">
            {pageLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`docs-top-tab${isActive ? " is-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="docs-topbar-actions">
          <a
            href={sourceHref}
            target="_blank"
            rel="noreferrer noopener"
            className="docs-source-btn"
            aria-label="GitHub repository"
            title="GitHub repository"
          >
            <Github className="docs-source-icon" aria-hidden="true" />
          </a>
          <div className="docs-topbar-controls">
            <LanguageSwitcher compact selectId="knowledge-lang-select" />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className="docs-shell">
        <aside className="docs-sidebar">
          <p className="docs-nav-title">Navigation</p>
          <div className="docs-nav-list">
            {pageLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`docs-nav-item${isActive ? " is-active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <p className="docs-sidebar-title">{sidebarTitle}</p>
          <nav className="docs-toc">
            {tocItems.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="docs-toc-link">
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="docs-main">
          <header className="docs-header">
            <p className="docs-badge">{badge}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>

          <div className="docs-sections">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="docs-section-block">
                <h2>{section.title}</h2>
                <p>{section.description}</p>

                {section.bullets?.length ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}

                {section.code ? (
                  <pre>
                    <code>{section.code}</code>
                  </pre>
                ) : null}
              </section>
            ))}

            {plans?.length ? (
              <section id="plans" className="docs-section-block">
                <h2>{plansTitle}</h2>
                <div className="plans-grid">
                  {plans.map((plan) => (
                    <article key={`${plan.name}-${plan.menuRange}`} className="plan-card">
                      <p className="plan-name">{plan.name}</p>
                      <p className="plan-range">{plan.menuRange}</p>
                      <p className="plan-price">{plan.price}</p>
                      <p className="plan-time">{plan.timeline}</p>
                      <ul>
                        {plan.highlights.map((highlight) => (
                          <li key={highlight}>{highlight}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {ctaLabel && ctaHref ? (
              <div className="docs-cta-wrap">
                <Link href={ctaHref} className="docs-cta-btn">
                  {ctaLabel}
                </Link>
              </div>
            ) : null}

            {contactForm && contactSectionId && contactSectionTitle ? (
              <section id={contactSectionId} className="docs-section-block">
                <h2>{contactSectionTitle}</h2>
                {contactSectionDescription ? <p>{contactSectionDescription}</p> : null}
                {contactForm}
              </section>
            ) : null}
          </div>
        </article>

        <aside className="docs-rightbar">
          <p className="docs-sidebar-title">On this page</p>
          <nav className="docs-toc">
            {tocItems.map((item) => (
              <a key={`${item.id}-right`} href={`#${item.id}`} className="docs-toc-link">
                {item.label}
              </a>
            ))}
          </nav>

          <a className="docs-source-link" href={sourceHref} target="_blank" rel="noreferrer noopener">
            {sourceLabel}
          </a>
        </aside>
      </div>
    </section>
  );
}
