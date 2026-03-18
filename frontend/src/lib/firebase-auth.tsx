'use client';

import {
  onAuthStateChanged,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { consumePostAuthRedirect } from "@/lib/auth-redirect";
import {
  ensureFirebaseAuthPersistence,
  getFirebaseAuth,
  getGoogleAuthProvider,
  isFirebaseAuthConfigured,
} from "@/lib/firebase-client";
import { navigatePath } from "@/platform/navigation";

type FirebaseAuthContextValue = {
  isConfigured: boolean;
  isInitializing: boolean;
  isBusy: boolean;
  hasSessionHint: boolean;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOutFromGoogle: () => Promise<void>;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);
const AUTH_SESSION_HINT_STORAGE_KEY = "navai-auth-session-hint";

function readAuthSessionHint() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(AUTH_SESSION_HINT_STORAGE_KEY) === "true";
}

function writeAuthSessionHint(value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.sessionStorage.setItem(AUTH_SESSION_HINT_STORAGE_KEY, "true");
    return;
  }

  window.sessionStorage.removeItem(AUTH_SESSION_HINT_STORAGE_KEY);
}

function shouldFallbackToRedirect(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const errorCode = typeof error.code === "string" ? error.code : "";
  return (
    errorCode === "auth/popup-blocked" ||
    errorCode === "auth/cancelled-popup-request" ||
    errorCode === "auth/operation-not-supported-in-this-environment"
  );
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [hasSessionHint, setHasSessionHint] = useState(false);
  const isConfigured = isFirebaseAuthConfigured();

  useEffect(() => {
    setHasSessionHint(readAuthSessionHint());
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setIsInitializing(false);
      setUser(null);
      setHasSessionHint(false);
      writeAuthSessionHint(false);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setIsInitializing(false);
      return;
    }

    let isMounted = true;

    void ensureFirebaseAuthPersistence()
      .then(() => getRedirectResult(auth))
      .catch((error) => {
        console.error("Firebase redirect auth failed.", error);
      });

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        if (!isMounted) {
          return;
        }

        setUser(nextUser);
        setHasSessionHint(Boolean(nextUser));
        writeAuthSessionHint(Boolean(nextUser));
        setIsInitializing(false);

        if (!nextUser) {
          return;
        }

        const nextHref = consumePostAuthRedirect();
        if (!nextHref) {
          return;
        }

        void navigatePath(nextHref, { replace: true });
      },
      (error) => {
        console.error("Firebase auth state listener failed.", error);
        if (!isMounted) {
          return;
        }

        setUser(null);
        setHasSessionHint(false);
        writeAuthSessionHint(false);
        setIsInitializing(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isConfigured]);

  const signInWithGoogle = useCallback(async () => {
    if (!isConfigured) {
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }

    setIsBusy(true);

    try {
      await ensureFirebaseAuthPersistence();
      await signInWithPopup(auth, getGoogleAuthProvider());
    } catch (error) {
      if (shouldFallbackToRedirect(error)) {
        await signInWithRedirect(auth, getGoogleAuthProvider());
        return;
      }

      console.error("Firebase Google sign-in failed.", error);
    } finally {
      setIsBusy(false);
    }
  }, [isConfigured]);

  const signOutFromGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return;
    }

    setIsBusy(true);

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase sign-out failed.", error);
    } finally {
      setIsBusy(false);
    }
  }, []);

  const value = useMemo<FirebaseAuthContextValue>(() => {
    return {
      isConfigured,
      isInitializing,
      isBusy,
      hasSessionHint,
      user,
      signInWithGoogle,
      signOutFromGoogle,
    };
  }, [hasSessionHint, isBusy, isConfigured, isInitializing, signInWithGoogle, signOutFromGoogle, user]);

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error("useFirebaseAuth must be used inside FirebaseAuthProvider.");
  }
  return context;
}
