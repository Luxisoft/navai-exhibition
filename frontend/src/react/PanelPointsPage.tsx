"use client";

import {
  BanknoteArrowDown,
  Clock3,
  Coins,
  RefreshCcw,
  Save,
  Wallet,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ColumnDef } from "@tanstack/react-table";

import AppProvidersShell from "@/react/AppProvidersShell";
import { PanelModuleShellContent } from "@/react/PanelModuleShell";

import {
  PanelContentSkeleton,
  PanelSidebarCardsSkeleton,
} from "@/components/AppShellSkeletons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import {
  createNavaiPointsCashoutRequest,
  getNavaiEntryBilling,
  getNavaiPointsWallet,
  updateNavaiPointsCashoutPaymentSettings,
  NAVAI_EXPERIENCE_REWARD_PAYMENT_METHOD_LABELS,
  type NavaiPointsCashoutPaymentMethod,
  type NavaiPointsCashoutRequest,
  type NavaiPointsLedgerEntry,
  type NavaiPointsWallet,
} from "@/lib/navai-panel-api";

const POINTS_PAYMENT_METHODS: readonly NavaiPointsCashoutPaymentMethod[] = [
  "bancolombia",
  "nequi",
  "daviplata",
  "davivienda",
  "banco_de_bogota",
  "bbva_colombia",
  "paypal",
] as const;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const signedPointsFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

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

function formatUsdFromCop(valueCop: number, usdCopRate: number) {
  const normalizedCop = Math.max(0, valueCop || 0);
  if (normalizedCop <= 0) {
    return usdFormatter.format(0);
  }

  if (!Number.isFinite(usdCopRate) || usdCopRate <= 0) {
    return "-";
  }

  return usdFormatter.format(normalizedCop / usdCopRate);
}

function formatPoints(value: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(
    Math.max(0, value || 0),
  );
}

function formatSignedPoints(value: number) {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
  if (normalized > 0) {
    return `+${signedPointsFormatter.format(normalized)}`;
  }

  return signedPointsFormatter.format(normalized);
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

function PointsSidebarCards({
  wallet,
  usdCopRate,
  messages,
}: {
  wallet: NavaiPointsWallet | null;
  usdCopRate: number;
  messages: ReturnType<typeof useI18n>["messages"];
}) {
  return (
    <div className="space-y-4">
      <section className="docs-section-block navai-panel-card rounded-[1rem] p-5">
        <div className="flex items-start justify-between gap-3">
          <strong>{messages.panelPage.pointsWalletCardTitle}</strong>
          <Wallet aria-hidden="true" className="text-primary" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>{messages.panelPage.pointsWalletPointValueLabel}</strong>{" "}
            {formatUsdFromCop(wallet?.pointValueCop ?? 0, usdCopRate)}
          </p>
          <p>
            <strong>
              {messages.panelPage.pointsWalletAvailablePointsLabel}
            </strong>{" "}
            {formatPoints(wallet?.availablePoints ?? 0)}
          </p>
          <p>
            <strong>
              {messages.panelPage.pointsWalletAvailableAmountLabel}
            </strong>{" "}
            {formatUsdFromCop(wallet?.availableAmountCop ?? 0, usdCopRate)}
          </p>
        </div>
      </section>
      <section className="docs-section-block navai-panel-card rounded-[1rem] p-5">
        <div className="flex items-start justify-between gap-3">
          <strong>{messages.panelPage.pointsWalletPendingTitle}</strong>
          <Clock3 aria-hidden="true" className="text-primary" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>{messages.panelPage.pointsWalletPendingPointsLabel}</strong>{" "}
            {formatPoints(wallet?.pendingRedeemPoints ?? 0)}
          </p>
          <p>
            <strong>{messages.panelPage.pointsWalletPendingAmountLabel}</strong>{" "}
            {formatUsdFromCop(wallet?.pendingRedeemAmountCop ?? 0, usdCopRate)}
          </p>
        </div>
      </section>
    </div>
  );
}

function resolveCashoutStatusLabel(
  status: NavaiPointsCashoutRequest["status"],
  messages: ReturnType<typeof useI18n>["messages"],
) {
  switch (status) {
    case "processing":
      return messages.panelPage.pointsStatusProcessingLabel;
    case "paid":
      return messages.panelPage.pointsStatusPaidLabel;
    case "rejected":
      return messages.panelPage.pointsStatusRejectedLabel;
    case "pending":
    default:
      return messages.panelPage.pointsStatusPendingLabel;
  }
}

function resolveLedgerReasonLabel(
  reason: NavaiPointsLedgerEntry["reason"],
  messages: ReturnType<typeof useI18n>["messages"],
) {
  switch (reason) {
    case "experience_reward":
      return messages.panelPage.pointsTraceabilityReasonExperienceRewardLabel;
    case "cashout_request":
      return messages.panelPage.pointsTraceabilityReasonCashoutRequestLabel;
    case "cashout_reverted":
      return messages.panelPage.pointsTraceabilityReasonCashoutRevertedLabel;
    case "manual_adjustment":
    default:
      return messages.panelPage.pointsTraceabilityReasonManualAdjustmentLabel;
  }
}

export default function PanelPointsPage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelPointsPageContent />
    </AppProvidersShell>
  );
}

function PanelPointsPageContent() {
  const { messages } = useI18n();
  const { user } = useFirebaseAuth();
  const [wallet, setWallet] = useState<NavaiPointsWallet | null>(null);
  const [usdCopRate, setUsdCopRate] = useState(0);
  const [requestPoints, setRequestPoints] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<NavaiPointsCashoutPaymentMethod>("bancolombia");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountReference, setAccountReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadWallet = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) {
        setWallet(null);
        setUsdCopRate(0);
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
        const [walletResult, billingResult] = await Promise.allSettled([
          getNavaiPointsWallet(idToken),
          getNavaiEntryBilling(idToken),
        ]);

        if (walletResult.status !== "fulfilled") {
          throw walletResult.reason;
        }

        setWallet(walletResult.value.wallet);
        if (walletResult.value.wallet.paymentSettings) {
          setPaymentMethod(walletResult.value.wallet.paymentSettings.paymentMethod);
          setAccountHolder(walletResult.value.wallet.paymentSettings.accountHolder);
          setAccountReference(
            walletResult.value.wallet.paymentSettings.accountReference,
          );
          setNotes(walletResult.value.wallet.paymentSettings.notes);
        }
        if (billingResult.status === "fulfilled") {
          setUsdCopRate(Math.max(0, billingResult.value.billing.exchangeRate.rate || 0));
        } else {
          setUsdCopRate(0);
        }
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : messages.panelPage.pointsLoadErrorMessage,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [messages.panelPage.pointsLoadErrorMessage, user],
  );

  const cashoutColumns = useMemo<ColumnDef<NavaiPointsCashoutRequest>[]>(
    () => [
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: messages.panelPage.pointsRequestStatusColumnLabel,
        cell: ({ row }) =>
          resolveCashoutStatusLabel(row.original.status, messages),
      },
      {
        accessorKey: "requestedPoints",
        header: messages.panelPage.pointsRequestPointsColumnLabel,
        cell: ({ row }) => formatPoints(row.original.requestedPoints),
      },
      {
        accessorKey: "requestedAmountCop",
        header: messages.panelPage.pointsRequestAmountColumnLabel,
        cell: ({ row }) =>
          formatUsdFromCop(row.original.requestedAmountCop, usdCopRate),
      },
      {
        accessorKey: "paymentMethod",
        header: messages.panelPage.pointsRequestMethodColumnLabel,
        cell: ({ row }) =>
          NAVAI_EXPERIENCE_REWARD_PAYMENT_METHOD_LABELS[
            row.original.paymentMethod
          ] ?? row.original.paymentMethod,
      },
      {
        accessorKey: "createdAt",
        header: messages.panelPage.pointsRequestCreatedAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: "processedAt",
        header: messages.panelPage.pointsRequestProcessedAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.processedAt),
      },
      {
        accessorKey: "responseMessage",
        header: messages.panelPage.pointsRequestResponseColumnLabel,
        cell: ({ row }) => row.original.responseMessage || "-",
      },
    ],
    [messages, usdCopRate],
  );

  const traceabilityColumns = useMemo<ColumnDef<NavaiPointsLedgerEntry>[]>(
    () => [
      {
        id: "reason",
        accessorFn: (row) => row.reason,
        header: messages.panelPage.pointsTraceabilityReasonColumnLabel,
        cell: ({ row }) =>
          resolveLedgerReasonLabel(row.original.reason, messages),
      },
      {
        accessorKey: "deltaPoints",
        header: messages.panelPage.pointsTraceabilityDeltaColumnLabel,
        cell: ({ row }) => formatSignedPoints(row.original.deltaPoints),
      },
      {
        accessorKey: "relatedCashoutId",
        header: messages.panelPage.pointsTraceabilityCashoutColumnLabel,
        cell: ({ row }) => row.original.relatedCashoutId || "-",
      },
      {
        accessorKey: "createdAt",
        header: messages.panelPage.pointsTraceabilityCreatedAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [messages],
  );

  const sidebarCards = (
    <PointsSidebarCards wallet={wallet} usdCopRate={usdCopRate} messages={messages} />
  );

  const handleSaveSettings = async () => {
    if (!user) {
      return;
    }

    const nextAccountHolder = accountHolder.trim();
    const nextAccountReference = accountReference.trim();
    if (!nextAccountHolder || !nextAccountReference) {
      setError(messages.panelPage.pointsPaymentSettingsRequiredMessage);
      setNotice("");
      return;
    }

    setIsSavingSettings(true);
    setError("");
    setNotice("");
    try {
      const idToken = await user.getIdToken();
      await updateNavaiPointsCashoutPaymentSettings(idToken, {
        paymentMethod,
        accountHolder: nextAccountHolder,
        accountReference: nextAccountReference,
        notes: notes.trim(),
      });
      setNotice(messages.panelPage.pointsSaveSettingsSuccessMessage);
      await loadWallet({ silent: true });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : messages.panelPage.pointsSaveSettingsErrorMessage,
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateCashoutRequest = async () => {
    if (!user) {
      return;
    }

    const nextRequestedPoints = Number(requestPoints);
    if (!Number.isFinite(nextRequestedPoints) || nextRequestedPoints <= 0) {
      setError(messages.panelPage.pointsRequestPointsInvalidMessage);
      setNotice("");
      return;
    }

    const normalizedPoints = Math.floor(nextRequestedPoints);
    const nextAccountHolder = accountHolder.trim();
    const nextAccountReference = accountReference.trim();
    if (!nextAccountHolder || !nextAccountReference) {
      setError(messages.panelPage.pointsPaymentSettingsRequiredMessage);
      setNotice("");
      return;
    }

    setIsCreatingRequest(true);
    setError("");
    setNotice("");
    try {
      const idToken = await user.getIdToken();
      await createNavaiPointsCashoutRequest(idToken, {
        requestedPoints: normalizedPoints,
        paymentMethod,
        accountHolder: nextAccountHolder,
        accountReference: nextAccountReference,
        notes: notes.trim(),
      });
      setRequestPoints("");
      setNotice(messages.panelPage.pointsRequestSuccessMessage);
      await loadWallet({ silent: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : messages.panelPage.pointsRequestErrorMessage,
      );
    } finally {
      setIsCreatingRequest(false);
    }
  };

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  if (isLoading) {
    return (
      <PanelModuleShellContent
        page="points"
        description={messages.panelPage.pointsDescription}
        rightSidebarExtra={<PanelSidebarCardsSkeleton />}
      >
        <PanelContentSkeleton />
      </PanelModuleShellContent>
    );
  }

  return (
    <PanelModuleShellContent
      page="points"
      description={messages.panelPage.pointsDescription}
      rightSidebarExtra={sidebarCards}
    >
      <div className="min-w-0 w-full justify-self-stretch space-y-6">
        <div className="navai-panel-summary-grid">
          <SummaryCard
            label={messages.panelPage.pointsWalletAvailablePointsLabel}
            value={formatPoints(wallet?.availablePoints ?? 0)}
            icon={<Coins aria-hidden="true" className="h-5 w-5" />}
          />
          <SummaryCard
            label={messages.panelPage.pointsWalletAvailableAmountLabel}
            value={formatUsdFromCop(wallet?.availableAmountCop ?? 0, usdCopRate)}
            icon={<Wallet aria-hidden="true" className="h-5 w-5" />}
          />
          <SummaryCard
            label={messages.panelPage.pointsWalletPendingAmountLabel}
            value={formatUsdFromCop(wallet?.pendingRedeemAmountCop ?? 0, usdCopRate)}
            icon={<Clock3 aria-hidden="true" className="h-5 w-5" />}
          />
          <SummaryCard
            label={messages.panelPage.pointsWalletTotalEarnedLabel}
            value={formatPoints(wallet?.totalEarnedPoints ?? 0)}
            icon={<BanknoteArrowDown aria-hidden="true" className="h-5 w-5" />}
          />
        </div>

        {error ? <p className="navai-panel-error">{error}</p> : null}
        {notice ? <p className="navai-panel-success">{notice}</p> : null}

        <Tabs defaultValue="cashout" className="space-y-6">
          <TabsList className="grid w-full max-w-[46rem] grid-cols-3">
            <TabsTrigger value="cashout">
              {messages.panelPage.pointsRequestTitle}
            </TabsTrigger>
            <TabsTrigger value="settings">
              {messages.panelPage.pointsPaymentSettingsTitle}
            </TabsTrigger>
            <TabsTrigger value="traceability">
              {messages.panelPage.pointsTraceabilityTitle}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cashout" className="space-y-6">
            <section className="docs-section-block navai-panel-card w-full max-w-none">
              <div className="navai-panel-tab-panel space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {messages.panelPage.pointsWalletUsageTitle}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {messages.panelPage.pointsWalletUsageDescription}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {messages.panelPage.pointsWalletUsageEntryNote}
                  </p>
                </div>
              </div>
            </section>

            <section className="docs-section-block navai-panel-card w-full max-w-none">
              <div className="navai-panel-tab-panel space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {messages.panelPage.pointsRequestTitle}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {messages.panelPage.pointsRequestDescription}
                  </p>
                </div>
                <div className="navai-panel-form-grid">
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-points-request-points">
                      {messages.panelPage.pointsRequestPointsLabel}
                    </Label>
                    <Input
                      id="panel-points-request-points"
                      type="number"
                      min={1}
                      step={1}
                      value={requestPoints}
                      onChange={(event) => setRequestPoints(event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => void handleCreateCashoutRequest()}
                    disabled={isCreatingRequest}
                  >
                    <BanknoteArrowDown aria-hidden="true" />
                    <span>{messages.panelPage.pointsRequestButtonLabel}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadWallet({ silent: true })}
                    disabled={isRefreshing}
                  >
                    <RefreshCcw aria-hidden="true" />
                    <span>{messages.panelPage.pointsRefreshButtonLabel}</span>
                  </Button>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="settings" className="space-y-0">
            <section className="docs-section-block navai-panel-card w-full max-w-none">
              <div className="navai-panel-tab-panel space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {messages.panelPage.pointsPaymentSettingsTitle}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {messages.panelPage.pointsPaymentSettingsDescription}
                  </p>
                </div>
                <div className="navai-panel-form-grid">
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-points-payment-method">
                      {messages.panelPage.pointsPaymentMethodLabel}
                    </Label>
                    <select
                      id="panel-points-payment-method"
                      className="navai-panel-select"
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target.value as NavaiPointsCashoutPaymentMethod,
                        )
                      }
                    >
                      {POINTS_PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {NAVAI_EXPERIENCE_REWARD_PAYMENT_METHOD_LABELS[
                            method
                          ] ?? method}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-points-account-holder">
                      {messages.panelPage.pointsAccountHolderLabel}
                    </Label>
                    <Input
                      id="panel-points-account-holder"
                      value={accountHolder}
                      onChange={(event) => setAccountHolder(event.target.value)}
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-points-account-reference">
                      {messages.panelPage.pointsAccountReferenceLabel}
                    </Label>
                    <Input
                      id="panel-points-account-reference"
                      value={accountReference}
                      onChange={(event) =>
                        setAccountReference(event.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="navai-panel-field">
                  <Label htmlFor="panel-points-notes">
                    {messages.panelPage.pointsNotesLabel}
                  </Label>
                  <Textarea
                    id="panel-points-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => void handleSaveSettings()}
                    disabled={isSavingSettings}
                  >
                    <Save aria-hidden="true" />
                    <span>
                      {messages.panelPage.pointsSaveSettingsButtonLabel}
                    </span>
                  </Button>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="traceability" className="space-y-6">
            <section className="docs-section-block navai-panel-card w-full max-w-none">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {messages.panelPage.pointsRequestsSectionTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {messages.panelPage.pointsRequestsSectionDescription}
                </p>
              </div>
              <DataTable
                columns={cashoutColumns}
                data={wallet?.cashoutRequests ?? []}
                emptyMessage={messages.panelPage.pointsRequestsEmptyMessage}
                filterColumnId="paymentMethod"
                filterPlaceholder={
                  messages.panelPage.pointsRequestsFilterPlaceholder
                }
                columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
                previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                nextPageLabel={messages.panelPage.tableNextPageLabel}
                paginationSummaryTemplate={
                  messages.panelPage.tablePaginationSummaryLabel
                }
              />
            </section>

            <section className="docs-section-block navai-panel-card w-full max-w-none">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {messages.panelPage.pointsTraceabilityTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {messages.panelPage.pointsTraceabilityDescription}
                </p>
              </div>
              <DataTable
                columns={traceabilityColumns}
                data={wallet?.ledger ?? []}
                emptyMessage={messages.panelPage.pointsTraceabilityEmptyMessage}
                filterColumnId="reason"
                filterPlaceholder={
                  messages.panelPage.pointsTraceabilityFilterPlaceholder
                }
                columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
                previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                nextPageLabel={messages.panelPage.tableNextPageLabel}
                paginationSummaryTemplate={
                  messages.panelPage.tablePaginationSummaryLabel
                }
              />
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </PanelModuleShellContent>
  );
}
