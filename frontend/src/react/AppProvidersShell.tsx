'use client';

import { useEffect, useState, type ReactNode } from "react";

import ClientProviders from "@/components/ClientProviders";
import NavaiVoiceOrbDockClient from "@/components/NavaiVoiceOrbDockClient";
import { normalizePathname, usePathname, useRouter } from "@/platform/navigation";
import PageMetadataSync from "@/components/PageMetadataSync";
import { NAVAI_PANEL_HREF, storePostAuthRedirect } from "@/lib/auth-redirect";
import { captureReferralAttributionFromCurrentUrl } from "@/lib/navai-referrals";
import { useNavaiMiniVoiceOrbDockProps } from "@/lib/navai-voice-orb";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useNavaiPanelAccess } from "@/lib/navai-panel-access";
import {
  getNavaiPanelActorAccess,
  listPublicNavaiRouteAccess,
  type NavaiPanelActorRole,
  type NavaiPanelRouteAccess,
} from "@/lib/navai-panel-api";
import {
  hasAnyAuthenticatedAccess,
  isNavaiRouteAllowedForRole,
  resolveFirstAllowedNavaiRouteHref,
  resolveNavaiRouteAccessForPathname,
} from "@/lib/navai-route-access";

type AppProvidersShellProps = {
  children: ReactNode;
  showMiniDock?: boolean;
};

function FloatingMiniVoiceOrbDock() {
  const floatingMiniDockProps = useNavaiMiniVoiceOrbDockProps();

  return <NavaiVoiceOrbDockClient {...floatingMiniDockProps} />;
}

function AppProvidersShellInner({ children, showMiniDock }: AppProvidersShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isInitializing, user } = useFirebaseAuth();
  const { actor } = useNavaiPanelAccess();
  const isPanelPath = pathname === NAVAI_PANEL_HREF || pathname.startsWith(`${NAVAI_PANEL_HREF}/`);
  const shouldShowMiniDock = typeof showMiniDock === "boolean"
    ? showMiniDock
    : pathname === "/documentation" ||
      pathname.startsWith("/documentation/") ||
      isPanelPath ||
      pathname === "/request-implementation" ||
      pathname.startsWith("/request-implementation/");
  const shouldUseInlineTopbarMiniDock =
    pathname === "/documentation" ||
    pathname.startsWith("/documentation/") ||
      isPanelPath ||
      pathname === "/request-implementation" ||
      pathname.startsWith("/request-implementation/");
  const shouldShowFloatingMiniDock = shouldShowMiniDock && !shouldUseInlineTopbarMiniDock;
  const [routeAccessItems, setRouteAccessItems] = useState<NavaiPanelRouteAccess[]>([]);
  const [resolvedActorRole, setResolvedActorRole] = useState<NavaiPanelActorRole | null>(null);

  useEffect(() => {
    captureReferralAttributionFromCurrentUrl();
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    const loadRouteAccess = async () => {
      try {
        const routeAccessResponse = await listPublicNavaiRouteAccess();
        if (!isMounted) {
          return;
        }

        setRouteAccessItems(routeAccessResponse.items);
      } catch {
        if (!isMounted) {
          return;
        }

        setRouteAccessItems([]);
      }
    };

    void loadRouteAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadActorRole = async () => {
      if (isInitializing) {
        return;
      }

      if (!user) {
        if (isMounted) {
          setResolvedActorRole(null);
        }
        return;
      }

      if (actor?.role) {
        if (isMounted) {
          setResolvedActorRole(actor.role);
        }
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const response = await getNavaiPanelActorAccess(idToken);
        if (!isMounted) {
          return;
        }

        setResolvedActorRole(response.actor.role);
      } catch {
        if (isMounted) {
          setResolvedActorRole(null);
        }
      }
    };

    void loadActorRole();

    return () => {
      isMounted = false;
    };
  }, [actor?.role, isInitializing, user]);

  useEffect(() => {
    if (isInitializing || routeAccessItems.length === 0) {
      return;
    }

    const currentRoute = resolveNavaiRouteAccessForPathname(pathname, routeAccessItems);
    if (!currentRoute) {
      return;
    }

    if (!user) {
      if (isNavaiRouteAllowedForRole(currentRoute, "visitor")) {
        return;
      }

      if (typeof window !== "undefined" && hasAnyAuthenticatedAccess(currentRoute)) {
        storePostAuthRedirect(
          `${window.location.pathname}${window.location.search}${window.location.hash}`,
        );
      }

      const nextHref = resolveFirstAllowedNavaiRouteHref(routeAccessItems, "visitor");
      if (normalizePathname(nextHref) !== normalizePathname(pathname)) {
        router.replace(nextHref);
      }
      return;
    }

    if (!resolvedActorRole) {
      return;
    }

    if (isNavaiRouteAllowedForRole(currentRoute, resolvedActorRole)) {
      return;
    }

    const nextHref = resolveFirstAllowedNavaiRouteHref(routeAccessItems, resolvedActorRole);
    if (normalizePathname(nextHref) !== normalizePathname(pathname)) {
      router.replace(nextHref);
    }
  }, [isInitializing, pathname, resolvedActorRole, routeAccessItems, router, user]);

  return (
    <div className="site-shell">
      <main className="site-main">{children}</main>
      {shouldShowFloatingMiniDock ? <FloatingMiniVoiceOrbDock /> : null}
    </div>
  );
}

export default function AppProvidersShell(props: AppProvidersShellProps) {
  return (
    <ClientProviders>
      <PageMetadataSync />
      <AppProvidersShellInner {...props} />
    </ClientProviders>
  );
}
