'use client';

import type { ReactNode } from "react";

import ClientProviders from "@/components/ClientProviders";
import { usePathname } from "@/platform/navigation";
import NavaiMiniVoiceDock from "@/components/NavaiMiniVoiceDock";
import PageMetadataSync from "@/components/PageMetadataSync";

type AppProvidersShellProps = {
  children: ReactNode;
  showMiniDock?: boolean;
};

export default function AppProvidersShell({ children, showMiniDock }: AppProvidersShellProps) {
  const pathname = usePathname();
  const shouldShowMiniDock = typeof showMiniDock === "boolean"
    ? showMiniDock
    : pathname === "/documentation" ||
      pathname.startsWith("/documentation/") ||
      pathname === "/request-implementation" ||
      pathname.startsWith("/request-implementation/") ||
      pathname === "/wordpress" ||
      pathname.startsWith("/wordpress/");

  return (
    <ClientProviders>
      <PageMetadataSync />
      <div className="site-shell">
        <main className="site-main">{children}</main>
        {shouldShowMiniDock ? <NavaiMiniVoiceDock /> : null}
      </div>
    </ClientProviders>
  );
}
