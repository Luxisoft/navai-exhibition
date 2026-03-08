'use client';

import Image from "@/platform/image";
import Link from "@/platform/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
    <section className="grid min-h-[calc(100svh-2rem)] place-items-center bg-[radial-gradient(80rem_35rem_at_50%_-10%,rgba(37,99,235,0.16),transparent_58%),radial-gradient(50rem_30rem_at_90%_110%,rgba(14,165,233,0.1),transparent_55%),#020617] p-5">
      <Card className="grid w-full max-w-[760px] gap-5 border-white/14 bg-slate-950/76 p-0 text-center text-slate-50 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        <CardHeader className="items-center gap-4 px-5 pt-6 pb-0 sm:px-8">
          <Image
            src="/navai_banner.webp"
            alt="NAVAI"
            width={420}
            height={150}
            priority
            className="h-auto w-auto max-w-[92%]"
          />

          <Badge
            variant="outline"
            className="border-sky-300/35 bg-sky-500/10 px-4 py-1.5 font-mono text-[clamp(2.2rem,9vw,5rem)] leading-none tracking-[0.18em] text-sky-100 shadow-[0_0_24px_rgba(96,165,250,0.22)]"
          >
            {code}
          </Badge>

          <div className="grid gap-2">
            <CardTitle className="text-[clamp(1.35rem,3vw,2rem)] leading-[1.1] text-slate-50">
              <h1>{title}</h1>
            </CardTitle>
            <CardDescription className="max-w-[56ch] text-sm text-slate-200/84 sm:text-base">
              {description}
            </CardDescription>
          </div>
        </CardHeader>

        {actionButton ? (
          <CardContent className="px-5 pt-0 sm:px-8">
            <Button
              type="button"
              size="lg"
              onClick={actionButton.onClick}
              className="w-full border-sky-200/30 bg-linear-to-b from-sky-500/22 to-blue-500/22 text-slate-50 hover:border-sky-200/45 hover:from-sky-500/30 hover:to-blue-500/30 dark:text-slate-50"
            >
              {actionButton.label}
            </Button>
          </CardContent>
        ) : null}

        <CardFooter className="flex-col gap-4 px-5 pb-6 pt-0 sm:px-8">
          <Separator className="bg-white/10" />
          <nav className="grid w-full gap-2 sm:grid-cols-2" aria-label="Navegacion de recuperacion">
            {navLinks.map((link) => {
              const isPrimary = link.href === "/";

              return (
                <Button
                  key={link.href}
                  asChild
                  variant={isPrimary ? "default" : "secondary"}
                  size="lg"
                  className={cn(
                    "w-full",
                    isPrimary
                      ? "border-sky-200/30 bg-linear-to-b from-sky-500/22 to-blue-500/22 text-slate-50 hover:border-sky-200/45 hover:from-sky-500/30 hover:to-blue-500/30 dark:text-slate-50"
                      : "border-white/12 bg-white/5 text-slate-100 hover:border-white/22 hover:bg-white/10 dark:border-white/12 dark:bg-white/5 dark:text-slate-100"
                  )}
                >
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              );
            })}
          </nav>
        </CardFooter>
      </Card>
    </section>
  );
}

