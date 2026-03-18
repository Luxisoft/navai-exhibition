'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { NAVAI_PANEL_HREF } from "@/lib/auth-redirect";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { getNavaiPanelActorAccess, type NavaiPanelActor } from "@/lib/navai-panel-api";
import { usePathname } from "@/platform/navigation";

type NavaiPanelAccessContextValue = {
  actor: NavaiPanelActor | null;
  isLoading: boolean;
  error: string;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  canEditTableData: boolean;
  canDeleteTableData: boolean;
  canManageUsers: boolean;
};

const NavaiPanelAccessContext = createContext<NavaiPanelAccessContextValue | null>(null);

export function NavaiPanelAccessProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isInitializing, user } = useFirebaseAuth();
  const [actor, setActor] = useState<NavaiPanelActor | null>(null);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const isPanelPath =
    pathname === NAVAI_PANEL_HREF || pathname.startsWith(`${NAVAI_PANEL_HREF}/`);
  const [isLoading, setIsLoading] = useState(() => isPanelPath);

  const refresh = useCallback(async () => {
    setRefreshTick((current) => current + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (isInitializing) {
        if (isMounted && isPanelPath) {
          setIsLoading(true);
        }
        return;
      }

      if (!isPanelPath || !user) {
        if (!isMounted) {
          return;
        }

        setActor(null);
        setError("");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const idToken = await user.getIdToken();
        const result = await getNavaiPanelActorAccess(idToken);
        if (!isMounted) {
          return;
        }

        setActor(result.actor);
        setError("");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setActor(null);
        setError(loadError instanceof Error ? loadError.message : "Could not load panel access.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [isInitializing, isPanelPath, refreshTick, user]);

  const value = useMemo<NavaiPanelAccessContextValue>(() => {
    return {
      actor,
      isLoading,
      error,
      refresh,
      isAdmin: actor?.role === "admin",
      canEditTableData: actor?.permissions.canEditTableData ?? false,
      canDeleteTableData: actor?.permissions.canDeleteTableData ?? false,
      canManageUsers: actor?.permissions.canManageUsers ?? false,
    };
  }, [actor, error, isLoading, refresh]);

  return (
    <NavaiPanelAccessContext.Provider value={value}>
      {children}
    </NavaiPanelAccessContext.Provider>
  );
}

export function useNavaiPanelAccess() {
  const context = useContext(NavaiPanelAccessContext);
  if (!context) {
    throw new Error("useNavaiPanelAccess must be used inside NavaiPanelAccessProvider.");
  }

  return context;
}
