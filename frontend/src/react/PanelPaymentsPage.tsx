"use client";

import {
  BadgeCheck,
  Copy,
  CreditCard,
  ExternalLink,
  QrCode,
  RefreshCcw,
  Ticket,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ColumnDef } from "@tanstack/react-table";
import QRCode from "qrcode";

import AppProvidersShell from "@/react/AppProvidersShell";
import { PanelModuleShellContent } from "@/react/PanelModuleShell";

import {
  PanelContentSkeleton,
  PanelSidebarCardsSkeleton,
} from "@/components/AppShellSkeletons";
import { Button } from "@/components/ui/button";
import { NavaiDynamicTable } from "@/components/ui/navai-dynamic-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { confirmActionModal } from "@/lib/confirm-action-modal";
import { useI18n } from "@/lib/i18n/provider";
import { subscribeNavaiEntryPackagesUpdated } from "@/lib/navai-entry-packages-sync";
import {
  readStoredReferralAttribution,
  writeStoredReferralAttribution,
  buildReferralInviteUrl,
  type StoredNavaiReferralAttribution,
} from "@/lib/navai-referrals";
import { useNavaiPanelAccess } from "@/lib/navai-panel-access";
import {
  confirmNavaiEntryOrder,
  createNavaiEntryOrder,
  deleteNavaiEntryOrder,
  getNavaiEntryBilling,
  getNavaiReferralProgram,
  type NavaiEntryBilling,
  type NavaiEntryPackage,
  type NavaiEntryOrder,
  type NavaiMembershipServicePeriod,
  type NavaiReferralProgram,
} from "@/lib/navai-panel-api";

const PENDING_ENTRY_ORDER_STORAGE_KEY = "navai-entry-pending-order";
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type StoredPendingEntryOrder = {
  orderId: string;
  checkoutUrl: string;
  createdAt: string;
};

function formatDateTime(value: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatAmountUsd(amountUsd: number) {
  return usdFormatter.format(Math.max(0, amountUsd || 0));
}

function formatAmountCentsAsUsd(amountCents: number, usdCopRate = 0) {
  const normalizedAmountCents = Math.max(0, amountCents || 0);
  if (normalizedAmountCents <= 0) {
    return formatAmountUsd(0);
  }

  if (!Number.isFinite(usdCopRate) || usdCopRate <= 0) {
    return "-";
  }

  return formatAmountUsd(normalizedAmountCents / 100 / usdCopRate);
}

function resolveServicePeriodLabel(
  period: NavaiMembershipServicePeriod,
  messages: ReturnType<typeof useI18n>["messages"],
) {
  switch (period) {
    case "quarterly":
      return messages.panelPage.entryPackagesPeriodQuarterlyLabel;
    case "semiannual":
      return messages.panelPage.entryPackagesPeriodSemiannualLabel;
    case "annual":
      return messages.panelPage.entryPackagesPeriodAnnualLabel;
    case "monthly":
    default:
      return messages.panelPage.entryPackagesPeriodMonthlyLabel;
  }
}

function resolveServicePeriodEnd(startAt: Date, period: NavaiMembershipServicePeriod) {
  const endAt = new Date(startAt);
  const monthsByPeriod: Record<NavaiMembershipServicePeriod, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    annual: 12,
  };
  endAt.setMonth(endAt.getMonth() + monthsByPeriod[period]);
  return endAt;
}

function resolveActiveEntryPackages(packages: NavaiEntryPackage[] | undefined) {
  return (packages ?? []).filter((item) => item.isActive);
}

function normalizeStatus(order: NavaiEntryOrder) {
  return order.wompiStatus || order.status || "PENDING";
}

function isDeletableCreatedOrder(order: NavaiEntryOrder) {
  return (
    normalizeStatus(order).trim().toLowerCase() === "created" &&
    !order.creditedAt
  );
}

function resolveOrderStatusLabel(
  status: string,
  messages: ReturnType<typeof useI18n>["messages"],
) {
  const normalizedStatus = status.trim().toLowerCase();
  switch (normalizedStatus) {
    case "created":
      return messages.panelPage.plusOrderStatusCreatedLabel;
    case "pending":
      return messages.panelPage.plusOrderStatusPendingLabel;
    case "approved":
      return messages.panelPage.plusOrderStatusApprovedLabel;
    case "declined":
    case "rejected":
      return messages.panelPage.plusOrderStatusDeclinedLabel;
    case "voided":
    case "canceled":
    case "cancelled":
      return messages.panelPage.plusOrderStatusCancelledLabel;
    case "error":
    case "failed":
      return messages.panelPage.plusOrderStatusErrorLabel;
    default:
      return status || messages.panelPage.plusOrderStatusPendingLabel;
  }
}

function openInNewTab(url: string) {
  if (!url) {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function isWompiCheckoutLinkUrl(checkoutUrl: string) {
  const normalizedCheckoutUrl = checkoutUrl.trim();
  if (!normalizedCheckoutUrl) {
    return false;
  }

  try {
    const parsed = new URL(normalizedCheckoutUrl);
    const normalizedHost = parsed.hostname.trim().toLowerCase();
    const isCheckoutHost =
      normalizedHost === "checkout.wompi.co" ||
      normalizedHost.endsWith(".checkout.wompi.co");
    const isHttpProtocol =
      parsed.protocol === "https:" || parsed.protocol === "http:";
    return isCheckoutHost && isHttpProtocol;
  } catch {
    return /(^|\/\/)checkout\.wompi\.co(\/|$)/i.test(normalizedCheckoutUrl);
  }
}

function resolveCheckoutUrlWithOrder(checkoutUrl: string, orderId: string) {
  const normalizedCheckoutUrl = checkoutUrl.trim();
  const normalizedOrderId = orderId.trim();
  if (!normalizedCheckoutUrl || !normalizedOrderId) {
    return normalizedCheckoutUrl;
  }
  if (!isWompiCheckoutLinkUrl(normalizedCheckoutUrl)) {
    return "";
  }

  try {
    const parsed = new URL(normalizedCheckoutUrl);
    if (!parsed.searchParams.get("navai_order")) {
      parsed.searchParams.set("navai_order", normalizedOrderId);
    }
    return parsed.toString();
  } catch {
    if (normalizedCheckoutUrl.includes("navai_order=")) {
      return normalizedCheckoutUrl;
    }

    const separator = normalizedCheckoutUrl.includes("?") ? "&" : "?";
    return `${normalizedCheckoutUrl}${separator}navai_order=${encodeURIComponent(normalizedOrderId)}`;
  }
}

function readPendingOrderFromStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(
      PENDING_ENTRY_ORDER_STORAGE_KEY,
    );
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as StoredPendingEntryOrder;
    if (!parsed?.orderId || !parsed?.checkoutUrl) {
      return null;
    }

    const normalizedOrder = {
      ...parsed,
      checkoutUrl: resolveCheckoutUrlWithOrder(
        parsed.checkoutUrl,
        parsed.orderId,
      ),
    };
    if (!normalizedOrder.checkoutUrl) {
      window.localStorage.removeItem(PENDING_ENTRY_ORDER_STORAGE_KEY);
      return null;
    }

    return normalizedOrder;
  } catch {
    return null;
  }
}

function persistPendingOrder(order: StoredPendingEntryOrder | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!order) {
    window.localStorage.removeItem(PENDING_ENTRY_ORDER_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    PENDING_ENTRY_ORDER_STORAGE_KEY,
    JSON.stringify(order),
  );
}

function resolveReferralNotice(
  status: string,
  messages: ReturnType<typeof useI18n>["messages"],
) {
  switch (status) {
    case "accepted":
      return messages.panelPage.referralAttributionAcceptedMessage;
    case "invalid":
      return messages.panelPage.referralAttributionInvalidMessage;
    case "self":
      return messages.panelPage.referralAttributionSelfMessage;
    case "already_assigned":
      return messages.panelPage.referralAttributionAlreadyAssignedMessage;
    case "ineligible":
      return messages.panelPage.referralAttributionIneligibleMessage;
    default:
      return "";
  }
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <section className="docs-section-block navai-panel-card min-w-0 rounded-[1rem] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <strong className="block text-sm font-semibold leading-snug text-foreground">
            {label}
          </strong>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 p-2 text-primary">
          {icon}
        </span>
      </div>
    </section>
  );
}

function PaymentsSidebarCards({
  billing,
  selectedPackage,
  messages,
}: {
  billing: NavaiEntryBilling | null;
  selectedPackage: NavaiEntryPackage | null;
  messages: ReturnType<typeof useI18n>["messages"];
}) {
  const activePackages = resolveActiveEntryPackages(billing?.packages);
  const periodPreviewStart = new Date();
  const periodPreviewEnd = selectedPackage
    ? resolveServicePeriodEnd(periodPreviewStart, selectedPackage.servicePeriod)
    : null;

  return (
    <div className="space-y-4">
      <section className="docs-section-block navai-panel-card rounded-[1rem] p-5">
        <div className="flex items-start justify-between gap-3">
          <strong>{messages.panelPage.entryPackagesTitle}</strong>
          <Ticket aria-hidden="true" className="text-primary" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {messages.panelPage.entryPackagesSummaryDescription}
        </p>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>{messages.panelPage.entryPackagesActiveLabel}</strong>{" "}
            {activePackages.length}
          </p>
          <p>
            <strong>{messages.panelPage.plusOrderAmountColumnLabel}</strong>{" "}
            {formatAmountCentsAsUsd(
              selectedPackage?.totalCopCents ??
                billing?.catalog.priceCents ??
                0,
              billing?.exchangeRate.rate ?? 0,
            )}
          </p>
          {selectedPackage ? (
            <p>
              <strong>{messages.panelPage.entryPackagesPeriodFieldLabel}</strong>{" "}
              {resolveServicePeriodLabel(selectedPackage.servicePeriod, messages)}
            </p>
          ) : null}
          {selectedPackage ? (
            <p>
              <strong>{messages.panelPage.entryPackagesAssignmentStartsAtColumnLabel}</strong>{" "}
              {formatDateTime(periodPreviewStart.toISOString())}
            </p>
          ) : null}
          {periodPreviewEnd ? (
            <p>
              <strong>{messages.panelPage.entryPackagesAssignmentEndsAtColumnLabel}</strong>{" "}
              {formatDateTime(periodPreviewEnd.toISOString())}
            </p>
          ) : null}
        </div>
      </section>
      <section className="docs-section-block navai-panel-card rounded-[1rem] p-5">
        <div className="flex items-start justify-between gap-3">
          <strong>{messages.panelPage.plusMembershipTitle}</strong>
          <BadgeCheck aria-hidden="true" className="text-primary" />
        </div>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>{messages.panelPage.plusMembershipActiveLabel}</strong>{" "}
            {billing?.balance.availableEntries ?? 0}
          </p>
          <p>
            <strong>{messages.panelPage.plusMembershipInactiveLabel}</strong>{" "}
            {billing?.balance.bonusEntries ?? 0}
          </p>
          <p>
            <strong>{messages.panelPage.plusMembershipEndsAtLabel}</strong>{" "}
            {billing?.balance.purchasedEntries ?? 0}
          </p>
          <p className="break-all">
            <strong>{messages.panelPage.plusMembershipLastOrderLabel}</strong>{" "}
            {billing?.balance.lastOrderId || "-"}
          </p>
        </div>
      </section>
    </div>
  );
}

export default function PanelPaymentsPage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelPaymentsPageContent />
    </AppProvidersShell>
  );
}

function PanelPaymentsPageContent() {
  const { messages } = useI18n();
  const { user } = useFirebaseAuth();
  const { actor, canDeleteTableData } = useNavaiPanelAccess();
  const [billing, setBilling] = useState<NavaiEntryBilling | null>(null);
  const [pendingOrder, setPendingOrder] =
    useState<StoredPendingEntryOrder | null>(null);
  const [storedReferral, setStoredReferral] =
    useState<StoredNavaiReferralAttribution | null>(null);
  const [selectedPackageKey, setSelectedPackageKey] = useState("");
  const [confirmOrderId, setConfirmOrderId] = useState("");
  const [confirmTransactionId, setConfirmTransactionId] = useState("");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isDeletingOrderId, setIsDeletingOrderId] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [referralProgram, setReferralProgram] =
    useState<NavaiReferralProgram | null>(null);
  const [referralInviteUrl, setReferralInviteUrl] = useState("");
  const [referralQrCodeUrl, setReferralQrCodeUrl] = useState("");
  const handledAutoConfirmRef = useRef("");

  const loadBilling = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) {
        setBilling(null);
        setIsLoading(false);
        return;
      }

      if (options?.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const idToken = await user.getIdToken();
        const [billingResponse, referralResponse] = await Promise.all([
          getNavaiEntryBilling(idToken),
          getNavaiReferralProgram(idToken).catch(() => null),
        ]);
        setBilling(billingResponse.billing);
        setReferralProgram(referralResponse?.program ?? null);
        setPendingOrder(readPendingOrderFromStorage());
        setStoredReferral(readStoredReferralAttribution());
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : messages.panelPage.plusLoadErrorMessage,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [messages.panelPage.plusLoadErrorMessage, user],
  );

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    setReferralInviteUrl(buildReferralInviteUrl(referralProgram?.code || ""));
  }, [referralProgram?.code]);

  useEffect(() => {
    let isMounted = true;

    if (!referralInviteUrl) {
      setReferralQrCodeUrl("");
      return () => {
        isMounted = false;
      };
    }

    void QRCode.toDataURL(referralInviteUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: "#f5f7ff",
        light: "#111111",
      },
    })
      .then((dataUrl: string) => {
        if (isMounted) {
          setReferralQrCodeUrl(dataUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReferralQrCodeUrl("");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [referralInviteUrl]);

  const copyReferralQrImage = useCallback(async () => {
    if (!referralQrCodeUrl) {
      return;
    }

    if (
      !navigator.clipboard?.write ||
      typeof ClipboardItem === "undefined"
    ) {
      return;
    }

    try {
      const response = await fetch(referralQrCodeUrl);
      const blob = await response.blob();
      const mimeType = blob.type || "image/png";
      const clipboardItem = new ClipboardItem({
        [mimeType]: blob,
      });
      await navigator.clipboard.write([clipboardItem]);
      setNotice(messages.panelPage.referralCopyQrSuccessMessage);
    } catch {
      // Ignore clipboard failures to avoid noisy UX on unsupported browsers.
    }
  }, [messages.panelPage.referralCopyQrSuccessMessage, referralQrCodeUrl]);

  useEffect(() => {
    if (!user || typeof window === "undefined") {
      return;
    }

    const refreshBilling = () => {
      void loadBilling({ silent: true });
    };
    const dispose = subscribeNavaiEntryPackagesUpdated(() => {
      refreshBilling();
    });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshBilling();
      }
    };
    window.addEventListener("focus", refreshBilling);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshBilling);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      dispose();
    };
  }, [loadBilling, user]);

  useEffect(() => {
    const activePackages = resolveActiveEntryPackages(billing?.packages);
    const fallbackKey = activePackages[0]?.key || billing?.catalog.key || "";
    if (!fallbackKey) {
      return;
    }

    setSelectedPackageKey((current) => {
      if (current && activePackages.some((item) => item.key === current)) {
        return current;
      }
      return fallbackKey;
    });
  }, [billing]);

  useEffect(() => {
    if (typeof window === "undefined" || !user) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const transactionId =
      searchParams.get("transaction_id") ||
      searchParams.get("transactionId") ||
      searchParams.get("id") ||
      searchParams.get("tx") ||
      searchParams.get("wompiTransactionId") ||
      "";
    const orderId =
      searchParams.get("navai_order") ||
      searchParams.get("orderId") ||
      readPendingOrderFromStorage()?.orderId ||
      "";

    if (!transactionId) {
      return;
    }

    const autoConfirmKey = `${orderId}:${transactionId}`;
    if (handledAutoConfirmRef.current === autoConfirmKey) {
      return;
    }

    handledAutoConfirmRef.current = autoConfirmKey;
    setConfirmOrderId(orderId);
    setConfirmTransactionId(transactionId);

    void (async () => {
      try {
        const idToken = await user.getIdToken();
        const result = await confirmNavaiEntryOrder(idToken, {
          orderId: orderId || undefined,
          transactionId,
        });

        if (result.status === "APPROVED") {
          persistPendingOrder(null);
          setPendingOrder(null);
          setNotice(messages.panelPage.plusConfirmSuccessMessage);
        }

        await loadBilling({ silent: true });
      } catch (confirmError) {
        setError(
          confirmError instanceof Error
            ? confirmError.message
            : messages.panelPage.plusConfirmErrorMessage,
        );
      }
    })();
  }, [
    loadBilling,
    messages.panelPage.plusConfirmErrorMessage,
    messages.panelPage.plusConfirmSuccessMessage,
    user,
  ]);

  const orderRows = billing?.orders ?? [];
  const allOrderRows = billing?.allOrders ?? [];
  const usdCopRate = billing?.exchangeRate.rate ?? 0;
  const activePackages = resolveActiveEntryPackages(billing?.packages);
  const selectedPackage =
    activePackages.find((item) => item.key === selectedPackageKey) ??
    activePackages[0] ??
    null;
  const pendingOrderRow = pendingOrder
    ? (orderRows.find((order) => order.id === pendingOrder.orderId) ?? null)
    : null;
  const isSupportView = Boolean(actor && actor.role !== "user");
  const canDeleteOrders = canDeleteTableData || !isSupportView;
  const sidebarCards = (
    <PaymentsSidebarCards
      billing={billing}
      selectedPackage={selectedPackage}
      messages={messages}
    />
  );

  const deleteSelectedOrders = async (ordersToDelete: NavaiEntryOrder[]) => {
    if (!user || !canDeleteOrders || ordersToDelete.length < 1) {
      return;
    }

    const deletableOrders = ordersToDelete.filter((order) =>
      isDeletableCreatedOrder(order),
    );
    if (deletableOrders.length < 1) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      for (const order of deletableOrders) {
        await deleteNavaiEntryOrder(idToken, order.id);
        if (pendingOrder?.orderId === order.id) {
          persistPendingOrder(null);
          setPendingOrder(null);
        }
        if (confirmOrderId.trim() === order.id) {
          setConfirmOrderId("");
        }
      }
      setNotice(messages.panelPage.plusOrderDeleteSuccessMessage);
      await loadBilling({ silent: true });
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : messages.panelPage.plusOrderDeleteErrorMessage,
      );
    }
  };

  const handleDeleteOrder = async (order: NavaiEntryOrder) => {
    if (!user || !canDeleteOrders || !isDeletableCreatedOrder(order)) {
      return;
    }
    const shouldDelete = await confirmActionModal({
      title: messages.panelPage.plusOrderDeleteActionLabel,
      description: messages.panelPage.plusOrderDeleteConfirmMessage,
      confirmLabel: messages.panelPage.plusOrderDeleteActionLabel,
      cancelLabel: messages.panelPage.cancelActionLabel,
      destructive: true,
    });
    if (!shouldDelete) {
      return;
    }

    setIsDeletingOrderId(order.id);
    setError("");
    setNotice("");

    try {
      await deleteSelectedOrders([order]);
    } finally {
      setIsDeletingOrderId("");
    }
  };

  const orderColumns = useMemo<ColumnDef<NavaiEntryOrder>[]>(
    () => [
      {
        accessorKey: "productName",
        header: messages.panelPage.plusOrderPlanColumnLabel,
      },
      {
        accessorKey: "entriesCount",
        header: messages.panelPage.plusOrderEntriesColumnLabel,
      },
      {
        id: "status",
        accessorFn: (row) => normalizeStatus(row),
        header: messages.panelPage.plusOrderStatusColumnLabel,
        cell: ({ row }) =>
          resolveOrderStatusLabel(normalizeStatus(row.original), messages),
      },
      {
        accessorKey: "environment",
        header: messages.panelPage.plusOrderEnvironmentColumnLabel,
      },
      {
        accessorKey: "amountCents",
        header: messages.panelPage.plusOrderAmountColumnLabel,
        cell: ({ row }) =>
          formatAmountCentsAsUsd(row.original.amountCents, usdCopRate),
      },
      {
        accessorKey: "wompiReference",
        header: messages.panelPage.plusOrderReferenceColumnLabel,
        cell: ({ row }) => row.original.wompiReference || "-",
      },
      {
        accessorKey: "createdAt",
        header: messages.panelPage.plusOrderCreatedAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: "creditedAt",
        header: messages.panelPage.plusOrderActivatedAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.creditedAt),
      },
      {
        id: "actions",
        enableSorting: false,
        header: messages.panelPage.actionsColumnLabel,
        cell: ({ row }) => (
          <div className="navai-panel-table-actions">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="navai-panel-table-action-button"
              title={messages.panelPage.plusOrderOpenCheckoutActionLabel}
              aria-label={messages.panelPage.plusOrderOpenCheckoutActionLabel}
              onClick={() =>
                openInNewTab(
                  resolveCheckoutUrlWithOrder(
                    row.original.checkoutUrl,
                    row.original.id,
                  ),
                )
              }
            >
              <ExternalLink aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="navai-panel-table-action-button"
              title={messages.panelPage.plusOrderCopyIdActionLabel}
              aria-label={messages.panelPage.plusOrderCopyIdActionLabel}
              onClick={() => {
                void navigator.clipboard?.writeText(row.original.id);
                setNotice(
                  `${messages.panelPage.plusOrderCopyIdActionLabel}: ${row.original.id}`,
                );
              }}
            >
              <Copy aria-hidden="true" />
            </Button>
            {isDeletableCreatedOrder(row.original) && canDeleteOrders ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="navai-panel-table-action-button"
                title={messages.panelPage.plusOrderDeleteActionLabel}
                aria-label={messages.panelPage.plusOrderDeleteActionLabel}
                disabled={isDeletingOrderId === row.original.id}
                onClick={() => void handleDeleteOrder(row.original)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [
      canDeleteOrders,
      handleDeleteOrder,
      isDeletingOrderId,
      messages,
      usdCopRate,
    ],
  );

  const allOrderColumns = useMemo<ColumnDef<NavaiEntryOrder>[]>(
    () => [
      {
        accessorKey: "userEmail",
        header: messages.panelPage.plusOrderUserColumnLabel,
      },
      ...orderColumns,
    ],
    [messages.panelPage.plusOrderUserColumnLabel, orderColumns],
  );

  const handleCreateOrder = async () => {
    if (!user || !selectedPackage) {
      return;
    }

    const checkoutTab = window.open("", "_blank", "noopener,noreferrer");
    setIsCreatingOrder(true);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      const response = await createNavaiEntryOrder(idToken, {
        referralCode: storedReferral?.code || undefined,
        packageKey: selectedPackage.key,
      });
      const checkoutUrl = resolveCheckoutUrlWithOrder(
        response.checkoutUrl,
        response.order.id,
      );
      if (!checkoutUrl) {
        throw new Error(messages.panelPage.plusCreateOrderErrorMessage);
      }
      const nextPendingOrder = {
        orderId: response.order.id,
        checkoutUrl,
        createdAt: new Date().toISOString(),
      };

      persistPendingOrder(nextPendingOrder);
      setPendingOrder(nextPendingOrder);
      setConfirmOrderId(response.order.id);
      setNotice(
        resolveReferralNotice(response.referralAttribution.status, messages) ||
          checkoutUrl,
      );
      if (storedReferral) {
        writeStoredReferralAttribution(null);
        setStoredReferral(null);
      }
      if (checkoutTab && !checkoutTab.closed) {
        checkoutTab.location.href = checkoutUrl;
      } else {
        openInNewTab(checkoutUrl);
      }
      await loadBilling({ silent: true });
    } catch (createError) {
      if (checkoutTab && !checkoutTab.closed) {
        checkoutTab.close();
      }
      setError(
        createError instanceof Error
          ? createError.message
          : messages.panelPage.plusCreateOrderErrorMessage,
      );
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!user) {
      return;
    }

    setIsConfirming(true);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      const response = await confirmNavaiEntryOrder(idToken, {
        orderId: confirmOrderId.trim() || undefined,
        transactionId: confirmTransactionId.trim() || undefined,
      });

      if (response.status === "APPROVED") {
        persistPendingOrder(null);
        setPendingOrder(null);
        setNotice(messages.panelPage.plusConfirmSuccessMessage);
      } else {
        setNotice(resolveOrderStatusLabel(response.status, messages));
      }

      setIsConfirmDialogOpen(false);
      await loadBilling({ silent: true });
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : messages.panelPage.plusConfirmErrorMessage,
      );
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <PanelModuleShellContent
        page="payments"
        description={`${messages.panelPage.entryPackagesDescription} ${messages.panelPage.referralsDescription}`}
        rightSidebarExtra={<PanelSidebarCardsSkeleton />}
      >
        <PanelContentSkeleton />
      </PanelModuleShellContent>
    );
  }

  return (
    <PanelModuleShellContent
      page="payments"
      description={`${messages.panelPage.entryPackagesDescription} ${messages.panelPage.referralsDescription}`}
      rightSidebarExtra={sidebarCards}
    >
      <div className="min-w-0 w-full justify-self-stretch space-y-6">
        <div className="navai-panel-summary-grid">
          <SummaryCard
            label={messages.panelPage.plusAccountingTotalOrdersLabel}
            value={String(billing?.accounting.totalOrders ?? 0)}
            icon={<CreditCard aria-hidden="true" className="h-5 w-5" />}
          />
          <SummaryCard
            label={messages.panelPage.plusAccountingApprovedLabel}
            value={String(billing?.accounting.approvedOrders ?? 0)}
            icon={<BadgeCheck aria-hidden="true" className="h-5 w-5" />}
          />
          <SummaryCard
            label={messages.panelPage.plusAccountingPendingLabel}
            value={String(billing?.accounting.pendingOrders ?? 0)}
            icon={<RefreshCcw aria-hidden="true" className="h-5 w-5" />}
          />
          <SummaryCard
            label={messages.panelPage.plusAccountingRevenueLabel}
            value={formatAmountCentsAsUsd(
              billing?.accounting.approvedAmountCents ?? 0,
              usdCopRate,
            )}
            icon={<Ticket aria-hidden="true" className="h-5 w-5" />}
          />
        </div>

        {error ? <p className="navai-panel-error">{error}</p> : null}
        {notice ? (
          <p className="navai-panel-success break-all">{notice}</p>
        ) : null}

        <Tabs defaultValue="purchase" className="space-y-6">
          <TabsList
            className={`grid w-full max-w-[52rem] ${
              isSupportView ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            <TabsTrigger value="purchase">
              {messages.panelPage.entryPackagesTitle}
            </TabsTrigger>
            <TabsTrigger value="orders">
              {messages.panelPage.plusOrdersSectionLabel}
            </TabsTrigger>
            {isSupportView ? (
              <TabsTrigger value="all-orders">
                {messages.panelPage.plusAllOrdersSectionLabel}
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="purchase" className="space-y-0">
            <section className="docs-section-block navai-panel-card w-full max-w-none">
              <div className="navai-panel-tab-panel">
                <div className="min-w-0 space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {messages.panelPage.entryPackagesTitle}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {messages.panelPage.entryPackagesDescription}
                    </p>
                  </div>
                  {activePackages.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {activePackages.map((entryPackage) => {
                        const isSelected =
                          selectedPackage?.key === entryPackage.key;
                        return (
                          <button
                            key={entryPackage.key}
                            type="button"
                            className={`rounded-[1rem] border p-4 text-left transition ${
                              isSelected
                                ? "border-primary/50 bg-primary/10"
                                : "border-border/60 bg-background/40 hover:border-primary/30"
                            }`}
                            onClick={() =>
                              setSelectedPackageKey(entryPackage.key)
                            }
                          >
                            <div className="flex items-start justify-between gap-3">
                              <strong className="text-sm text-foreground">
                                {entryPackage.name}
                              </strong>
                              {isSelected ? (
                                <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  {
                                    messages.panelPage
                                      .entryPackagesSelectedLabel
                                  }
                                </span>
                              ) : null}
                            </div>
                            {entryPackage.description ? (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {entryPackage.description}
                              </p>
                            ) : null}
                            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                              <p>
                                <strong>
                                  {
                                    messages.panelPage
                                      .plusOrderAmountColumnLabel
                                  }
                                </strong>{" "}
                                {formatAmountUsd(entryPackage.totalUsd)}
                              </p>
                              <p>
                                <strong>
                                  {messages.panelPage.entryPackagesVatLabel}
                                </strong>{" "}
                                {entryPackage.vatPercentage}%
                              </p>
                              <p>
                                <strong>
                                  {messages.panelPage.entryPackagesPeriodFieldLabel}
                                </strong>{" "}
                                {resolveServicePeriodLabel(
                                  entryPackage.servicePeriod,
                                  messages,
                                )}
                              </p>
                              <p>
                                <strong>
                                  {
                                    messages.panelPage
                                      .entryPackagesAssignmentStartsAtColumnLabel
                                  }
                                </strong>{" "}
                                {formatDateTime(new Date().toISOString())}
                              </p>
                              <p>
                                <strong>
                                  {
                                    messages.panelPage
                                      .entryPackagesAssignmentEndsAtColumnLabel
                                  }
                                </strong>{" "}
                                {formatDateTime(
                                  resolveServicePeriodEnd(
                                    new Date(),
                                    entryPackage.servicePeriod,
                                  ).toISOString(),
                                )}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {messages.panelPage.entryPackagesNoActiveMessage}
                    </p>
                  )}
                  {storedReferral ? (
                    <div className="rounded-[1rem] border border-primary/20 bg-primary/10 p-4">
                      <strong className="text-sm text-foreground">
                        {messages.panelPage.plusReferralDetectedTitle}
                      </strong>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {messages.panelPage.plusReferralDetectedDescription}
                      </p>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {storedReferral.code}
                      </p>
                    </div>
                  ) : null}
                  <div className="rounded-[1rem] border border-border/60 bg-background/40 p-4">
                    <strong className="text-sm text-foreground">
                      {messages.panelPage.referralProgramShareTitle}
                    </strong>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {messages.panelPage.experienceReferralBonusInfoText}
                    </p>
                    <div className="mt-3 grid gap-3">
                      {referralQrCodeUrl ? (
                        <img
                          src={referralQrCodeUrl}
                          alt={messages.panelPage.referralProgramQrAlt}
                          className="mx-auto aspect-square w-full max-w-56 rounded-[1rem] border border-border/60 bg-background p-3"
                        />
                      ) : (
                        <div className="mx-auto flex aspect-square w-full max-w-56 items-center justify-center rounded-[1rem] border border-dashed border-border/60 bg-background/40 px-6 text-sm text-muted-foreground">
                          {messages.panelPage.referralProgramQrLoadingLabel}
                        </div>
                      )}
                      <div className="flex flex-wrap justify-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (!referralInviteUrl) {
                              return;
                            }
                            void navigator.clipboard?.writeText(
                              referralInviteUrl,
                            );
                            setNotice(
                              messages.panelPage.referralCopyLinkSuccessMessage,
                            );
                          }}
                          disabled={!referralInviteUrl}
                        >
                          <Copy aria-hidden="true" />
                          <span>
                            {messages.panelPage.referralCopyLinkButtonLabel}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            void copyReferralQrImage();
                          }}
                          disabled={!referralQrCodeUrl}
                        >
                          <Copy aria-hidden="true" />
                          <span>
                            {messages.panelPage.referralCopyQrButtonLabel}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (!referralInviteUrl) {
                              return;
                            }
                            openInNewTab(referralInviteUrl);
                          }}
                          disabled={!referralInviteUrl}
                        >
                          <ExternalLink aria-hidden="true" />
                          <span>
                            {messages.panelPage.referralOpenLinkButtonLabel}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void loadBilling({ silent: true })}
                      disabled={isRefreshing}
                    >
                      <RefreshCcw aria-hidden="true" />
                      <span>{messages.panelPage.plusRefreshButtonLabel}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="orders" className="space-y-0">
            <section className="docs-section-block navai-panel-card w-full max-w-none">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {messages.panelPage.plusOrdersSectionLabel}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {messages.panelPage.plusAccountingSectionLabel}
                  </p>
                </div>
              </div>
              <NavaiDynamicTable
                columns={orderColumns}
                data={orderRows}
                emptyMessage={messages.panelPage.plusOrdersEmptyMessage}
                filterColumnId="wompiReference"
                filterPlaceholder={
                  messages.panelPage.plusOrdersFilterPlaceholder
                }
                columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
                previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                nextPageLabel={messages.panelPage.tableNextPageLabel}
                paginationSummaryTemplate={
                  messages.panelPage.tablePaginationSummaryLabel
                }
                onDeleteSelectedRows={
                  canDeleteOrders ? deleteSelectedOrders : undefined
                }
                canDeleteSelectedRows={canDeleteOrders}
                deleteSelectedButtonLabel={
                  messages.panelPage.plusOrderDeleteActionLabel
                }
                deleteSelectedConfirmMessage={
                  messages.panelPage.plusOrderDeleteConfirmMessage
                }
                onRefresh={() => loadBilling({ silent: true })}
                refreshButtonLabel={messages.panelPage.plusRefreshButtonLabel}
              />
            </section>
          </TabsContent>

          {isSupportView ? (
            <TabsContent value="all-orders" className="space-y-0">
              <section className="docs-section-block navai-panel-card w-full max-w-none">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {messages.panelPage.plusAllOrdersSectionLabel}
                  </h2>
                </div>
                <NavaiDynamicTable
                  columns={allOrderColumns}
                  data={allOrderRows}
                  emptyMessage={messages.panelPage.plusOrdersEmptyMessage}
                  filterColumnId="userEmail"
                  filterPlaceholder={
                    messages.panelPage.plusOrdersFilterPlaceholder
                  }
                  columnsButtonLabel={
                    messages.panelPage.tableColumnsButtonLabel
                  }
                  previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                  nextPageLabel={messages.panelPage.tableNextPageLabel}
                  paginationSummaryTemplate={
                    messages.panelPage.tablePaginationSummaryLabel
                  }
                  onDeleteSelectedRows={
                    canDeleteOrders ? deleteSelectedOrders : undefined
                  }
                  canDeleteSelectedRows={canDeleteOrders}
                  deleteSelectedButtonLabel={
                    messages.panelPage.plusOrderDeleteActionLabel
                  }
                  deleteSelectedConfirmMessage={
                    messages.panelPage.plusOrderDeleteConfirmMessage
                  }
                  onRefresh={() => loadBilling({ silent: true })}
                  refreshButtonLabel={messages.panelPage.plusRefreshButtonLabel}
                />
              </section>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {messages.panelPage.plusManualConfirmTitle}
            </DialogTitle>
            <DialogDescription>
              {messages.panelPage.plusPendingOrderDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="navai-panel-field">
              <Label htmlFor="navai-entry-confirm-order-id">
                {messages.panelPage.plusConfirmOrderFieldLabel}
              </Label>
              <Input
                id="navai-entry-confirm-order-id"
                className="min-w-0"
                value={confirmOrderId}
                onChange={(event) => setConfirmOrderId(event.target.value)}
              />
            </div>
            <div className="navai-panel-field">
              <Label htmlFor="navai-entry-confirm-transaction-id">
                {messages.panelPage.plusConfirmTransactionFieldLabel}
              </Label>
              <Input
                id="navai-entry-confirm-transaction-id"
                className="min-w-0"
                value={confirmTransactionId}
                onChange={(event) =>
                  setConfirmTransactionId(event.target.value)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isConfirming}
            >
              {messages.panelPage.cancelActionLabel}
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmOrder()}
              disabled={isConfirming}
            >
              <BadgeCheck aria-hidden="true" />
              <span>{messages.panelPage.plusConfirmButtonLabel}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelModuleShellContent>
  );
}
