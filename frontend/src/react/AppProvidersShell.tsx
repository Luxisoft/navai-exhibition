'use client';

import { NavaiVoiceOrbDock } from "@navai/voice-frontend";
import { useEffect, useState, type ReactNode } from "react";

import ClientProviders from "@/components/ClientProviders";
import { usePathname } from "@/platform/navigation";
import PageMetadataSync from "@/components/PageMetadataSync";
import { useNavaiMiniVoiceOrbDockProps } from "@/lib/navai-voice-orb";

type AppProvidersShellProps = {
  children: ReactNode;
  showMiniDock?: boolean;
};

function FloatingMiniVoiceOrbDock() {
  const floatingMiniDockProps = useNavaiMiniVoiceOrbDockProps();

  return <NavaiVoiceOrbDock {...floatingMiniDockProps} />;
}

export default function AppProvidersShell({ children, showMiniDock }: AppProvidersShellProps) {
  const pathname = usePathname();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const shouldShowMiniDock = typeof showMiniDock === "boolean"
    ? showMiniDock
    : pathname === "/documentation" ||
      pathname.startsWith("/documentation/") ||
      pathname === "/request-implementation" ||
      pathname.startsWith("/request-implementation/") ||
      pathname === "/wordpress" ||
      pathname.startsWith("/wordpress/");
  const shouldShowFloatingMiniDock = shouldShowMiniDock && !isMobileViewport;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const updateViewport = (matches: boolean) => {
      setIsMobileViewport(matches);
    };
    const handleViewportChange = (event: MediaQueryListEvent) => {
      updateViewport(event.matches);
    };

    updateViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  return (
    <ClientProviders>
      <PageMetadataSync />
      <div className="site-shell">
        <main className="site-main">{children}</main>
        {shouldShowFloatingMiniDock ? <FloatingMiniVoiceOrbDock /> : null}
      </div>
    </ClientProviders>
  );
}
