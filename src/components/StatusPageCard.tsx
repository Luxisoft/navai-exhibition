'use client';

import Image from "next/image";
import Link from "next/link";

import styles from "@/components/StatusPageCard.module.css";

type StatusNavLink = {
  href: string;
  label: string;
};

type StatusActionButton = {
  label: string;
  onClick: () => void;
};

type StatusPageCardProps = {
  code: string;
  title: string;
  description: string;
  navLinks?: StatusNavLink[];
  actionButton?: StatusActionButton;
};

const DEFAULT_NAV_LINKS: StatusNavLink[] = [
  { href: "/", label: "Inicio" },
  { href: "/documentation/home", label: "Documentacion" },
  { href: "/request-implementation", label: "Pedir implementacion" },
];

export default function StatusPageCard({
  code,
  title,
  description,
  navLinks = DEFAULT_NAV_LINKS,
  actionButton,
}: StatusPageCardProps) {
  return (
    <section className={styles.root}>
      <div className={styles.card}>
        <Image
          src="/navai_banner.webp"
          alt="NAVAI"
          width={420}
          height={150}
          priority
          className={styles.banner}
        />

        <p className={styles.code}>{code}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>

        {actionButton ? (
          <button
            type="button"
            onClick={actionButton.onClick}
            className={`${styles.actionButton} ${styles.primary}`}
          >
            {actionButton.label}
          </button>
        ) : null}

        <nav className={styles.actions} aria-label="Navegacion de recuperacion">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.button} ${link.href === "/" ? styles.primary : styles.secondary}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
