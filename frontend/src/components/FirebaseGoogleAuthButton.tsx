'use client';

import { ChevronDown, Coins, LoaderCircle, LogOut, Ticket, Wallet } from "lucide-react";
import { useEffect, useId, useState } from "react";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAVAI_PANEL_HREF, storePostAuthRedirect } from "@/lib/auth-redirect";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { getNavaiEntryBilling, getNavaiPointsWallet } from "@/lib/navai-panel-api";
import { cn } from "@/lib/utils";

type FirebaseGoogleAuthButtonProps = {
  compact?: boolean;
  className?: string;
  redirectHref?: string;
  showUserMenu?: boolean;
  availableEntries?: number | null;
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="auth-switcher-google-mark">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.8-2.7-5.8-6s2.6-6 5.8-6c1.8 0 3.1.8 3.8 1.4l2.6-2.5C16.6 3.3 14.5 2.4 12 2.4 6.9 2.4 2.8 6.6 2.8 11.8s4.1 9.4 9.2 9.4c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M2.8 7.3l3.2 2.3C6.9 7.8 9.2 6 12 6c1.8 0 3.1.8 3.8 1.4l2.6-2.5C16.6 3.3 14.5 2.4 12 2.4 8.1 2.4 4.7 4.6 2.8 7.3z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.2c2.4 0 4.5-.8 6.1-2.3l-2.8-2.3c-.8.6-1.9 1.1-3.3 1.1-3.8 0-5.1-2.5-5.4-3.8L3.4 16c1.9 3.1 5.2 5.2 8.6 5.2z"
      />
      <path
        fill="#4285F4"
        d="M20.8 12.2c0-.6-.1-1.1-.2-1.9H12v3.9h5.4c-.2 1.1-1 2.3-2 3l2.8 2.3c1.7-1.6 2.6-4 2.6-7.3z"
      />
    </svg>
  );
}

function resolveUserLabel(displayName: string | null | undefined, email: string | null | undefined) {
  const normalizedName = displayName?.trim();
  if (normalizedName) {
    return normalizedName;
  }

  const normalizedEmail = email?.trim();
  if (normalizedEmail) {
    return normalizedEmail;
  }

  return "Google";
}

function resolveAvatarFallback(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue.charAt(0).toUpperCase() || "G";
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatUsdFromCop(amountCop: number, usdCopRate: number) {
  const normalizedAmount = Math.max(0, Number(amountCop) || 0);
  if (normalizedAmount <= 0) {
    return usdFormatter.format(0);
  }

  if (!Number.isFinite(usdCopRate) || usdCopRate <= 0) {
    return "-";
  }

  return usdFormatter.format(normalizedAmount / usdCopRate);
}

export default function FirebaseGoogleAuthButton({
  compact = false,
  className,
  redirectHref,
  showUserMenu = false,
  availableEntries,
}: FirebaseGoogleAuthButtonProps) {
  const { messages } = useI18n();
  const { isConfigured, isInitializing, isBusy, user, signInWithGoogle, signOutFromGoogle } =
    useFirebaseAuth();
  const languageSelectId = `auth-switcher-lang-${useId()}`;

  const isSignedIn = Boolean(user);
  const isDisabled = !isConfigured || isInitializing || isBusy;
  const isUserMenuEnabled = showUserMenu && isSignedIn;
  const userLabel = resolveUserLabel(user?.displayName, user?.email);
  const providedAvailableEntries =
    typeof availableEntries === "number" && Number.isFinite(availableEntries)
      ? Math.max(0, Math.trunc(availableEntries))
      : null;
  const [resolvedAvailableEntries, setResolvedAvailableEntries] = useState(
    providedAvailableEntries ?? 0,
  );
  const [resolvedAvailablePoints, setResolvedAvailablePoints] = useState(0);
  const [resolvedAvailableBalanceCop, setResolvedAvailableBalanceCop] =
    useState(0);
  const [resolvedUsdCopRate, setResolvedUsdCopRate] = useState(0);
  const visibleLabel = isSignedIn
    ? userLabel
    : isBusy || isInitializing
      ? messages.common.authSigningIn
      : messages.common.authSignInWithGoogle;
  const titleLabel = !isConfigured
    ? messages.common.authUnavailable
    : isSignedIn
      ? `${messages.common.authSignOut}: ${userLabel}`
      : visibleLabel;

  useEffect(() => {
    if (providedAvailableEntries !== null) {
      setResolvedAvailableEntries(providedAvailableEntries);
    }

    if (!isUserMenuEnabled || !user) {
      setResolvedAvailableEntries(0);
      setResolvedAvailablePoints(0);
      setResolvedAvailableBalanceCop(0);
      setResolvedUsdCopRate(0);
      return;
    }

    let isMounted = true;
    void (async () => {
      try {
        const idToken = await user.getIdToken();
        const [entryBillingResult, pointsWalletResult] = await Promise.allSettled([
          getNavaiEntryBilling(idToken),
          getNavaiPointsWallet(idToken),
        ]);
        if (!isMounted) {
          return;
        }

        const fallbackEntries = providedAvailableEntries ?? 0;
        let nextAvailableEntries = fallbackEntries;
        let nextUsdCopRate = 0;
        if (entryBillingResult.status === "fulfilled") {
          nextAvailableEntries =
            providedAvailableEntries ??
            Math.max(
              0,
              entryBillingResult.value.billing.balance.availableEntries || 0,
            );
          nextUsdCopRate = Math.max(
            0,
            entryBillingResult.value.billing.exchangeRate.rate || 0,
          );
        }

        let nextAvailablePoints = 0;
        let nextAvailableBalanceCop = 0;
        if (pointsWalletResult.status === "fulfilled") {
          nextAvailablePoints = Math.max(
            0,
            pointsWalletResult.value.wallet.availablePoints || 0,
          );
          nextAvailableBalanceCop = Math.max(
            0,
            pointsWalletResult.value.wallet.availableAmountCop || 0,
          );
        }

        setResolvedAvailableEntries(nextAvailableEntries);
        setResolvedUsdCopRate(nextUsdCopRate);
        setResolvedAvailablePoints(nextAvailablePoints);
        setResolvedAvailableBalanceCop(nextAvailableBalanceCop);
      } catch {
        if (!isMounted) {
          return;
        }
        setResolvedAvailableEntries(providedAvailableEntries ?? 0);
        setResolvedAvailablePoints(0);
        setResolvedAvailableBalanceCop(0);
        setResolvedUsdCopRate(0);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isUserMenuEnabled, providedAvailableEntries, user]);

  const handleClick = () => {
    if (isUserMenuEnabled) {
      return;
    }

    if (isSignedIn) {
      void signOutFromGoogle();
      return;
    }

    storePostAuthRedirect(redirectHref || NAVAI_PANEL_HREF);
    void signInWithGoogle();
  };

  const triggerButton = (
    <button
      type="button"
      className={cn(
        "auth-switcher-btn",
        isSignedIn && "is-authenticated",
        isUserMenuEnabled && "auth-switcher-btn--menu",
      )}
      onClick={isUserMenuEnabled ? undefined : handleClick}
      disabled={isDisabled}
      aria-label={titleLabel}
      title={titleLabel}
    >
      <span className="auth-switcher-visual" aria-hidden="true">
        {isSignedIn ? (
          user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="auth-switcher-avatar-image"
            />
          ) : (
            <span className="auth-switcher-avatar-fallback">
              {resolveAvatarFallback(userLabel)}
            </span>
          )
        ) : isBusy || isInitializing ? (
          <LoaderCircle className="auth-switcher-spinner" />
        ) : (
          <GoogleMark />
        )}
      </span>
      <span className="auth-switcher-label">{visibleLabel}</span>
      {isUserMenuEnabled ? <ChevronDown className="auth-switcher-chevron" aria-hidden="true" /> : null}
    </button>
  );

  if (isUserMenuEnabled) {
    return (
      <div className={cn("auth-switcher", compact && "is-compact", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="auth-user-menu-dropdown">
            <div className="auth-user-menu-header">
              <strong className="auth-user-menu-name">{userLabel}</strong>
              {user?.email ? <span className="auth-user-menu-email">{user.email}</span> : null}
            </div>
            <div className="auth-user-menu-stats">
              <div className="auth-user-menu-balance">
                <span className="auth-user-menu-balance-label">
                  <Ticket className="auth-user-menu-balance-icon" aria-hidden="true" />
                  <span>{messages.panelPage.plusMembershipActiveLabel}</span>
                </span>
                <strong className="auth-user-menu-balance-value">
                  {resolvedAvailableEntries}
                </strong>
              </div>
              <div className="auth-user-menu-balance">
                <span className="auth-user-menu-balance-label">
                  <Coins className="auth-user-menu-balance-icon" aria-hidden="true" />
                  <span>{messages.panelPage.pointsWalletAvailablePointsLabel}</span>
                </span>
                <strong className="auth-user-menu-balance-value">
                  {resolvedAvailablePoints}
                </strong>
              </div>
              <div className="auth-user-menu-balance">
                <span className="auth-user-menu-balance-label">
                  <Wallet className="auth-user-menu-balance-icon" aria-hidden="true" />
                  <span>{messages.panelPage.pointsWalletAvailableAmountLabel}</span>
                </span>
                <strong className="auth-user-menu-balance-value">
                  {formatUsdFromCop(resolvedAvailableBalanceCop, resolvedUsdCopRate)}
                </strong>
              </div>
            </div>
            <DropdownMenuSeparator />
            <div className="auth-user-menu-controls">
              <LanguageSwitcher compact selectId={languageSelectId} disabled={isDisabled} />
              <ThemeSwitcher disabled={isDisabled} />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void signOutFromGoogle();
              }}
              disabled={isBusy}
              className="auth-user-menu-signout-item"
            >
              <LogOut className="auth-user-menu-signout-icon" aria-hidden="true" />
              <span>{messages.common.authSignOut}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={cn("auth-switcher", compact && "is-compact", className)}>
      {triggerButton}
    </div>
  );
}
