"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BadgeCheck, Clock3, RefreshCcw, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppProvidersShell from "@/react/AppProvidersShell";
import { PanelModuleShellContent } from "@/react/PanelModuleShell";

import {
  PanelContentSkeleton,
  PanelSidebarCardsSkeleton,
} from "@/components/AppShellSkeletons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import {
  getNavaiEntryBilling,
  listNavaiPointsCashoutRequests,
  reviewNavaiPointsCashoutRequest,
  NAVAI_EXPERIENCE_REWARD_PAYMENT_METHOD_LABELS,
  type NavaiPointsCashoutRequest,
  type NavaiPointsCashoutStatus,
} from "@/lib/navai-panel-api";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
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

function resolveCashoutStatusLabel(
  status: NavaiPointsCashoutStatus,
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

function StatusSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <section className="docs-section-block navai-panel-card rounded-[1rem] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </section>
  );
}

export default function PanelWithdrawalsPage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelWithdrawalsPageContent />
    </AppProvidersShell>
  );
}

function PanelWithdrawalsPageContent() {
  const { messages } = useI18n();
  const { user } = useFirebaseAuth();
  const [items, setItems] = useState<NavaiPointsCashoutRequest[]>([]);
  const [usdCopRate, setUsdCopRate] = useState(0);
  const [activeTab, setActiveTab] = useState<"pending" | "processed" | "all">(
    "pending",
  );
  const [selectedItem, setSelectedItem] =
    useState<NavaiPointsCashoutRequest | null>(null);
  const [reviewStatus, setReviewStatus] =
    useState<Exclude<NavaiPointsCashoutStatus, "pending">>("processing");
  const [reviewResponse, setReviewResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) {
        setItems([]);
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
        const [requestsResult, billingResult] = await Promise.allSettled([
          listNavaiPointsCashoutRequests(idToken, {
            limit: 300,
          }),
          getNavaiEntryBilling(idToken),
        ]);
        if (requestsResult.status !== "fulfilled") {
          throw requestsResult.reason;
        }

        setItems(requestsResult.value.items);
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
            : messages.panelPage.withdrawalsLoadErrorMessage,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [messages.panelPage.withdrawalsLoadErrorMessage, user],
  );

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const statusCounts = useMemo(() => {
    return items.reduce(
      (accumulator, item) => {
        if (item.status === "processing") {
          accumulator.processing += 1;
        } else if (item.status === "paid") {
          accumulator.paid += 1;
        } else if (item.status === "rejected") {
          accumulator.rejected += 1;
        } else {
          accumulator.pending += 1;
        }
        return accumulator;
      },
      { pending: 0, processing: 0, paid: 0, rejected: 0 },
    );
  }, [items]);

  const visibleItems = useMemo(() => {
    if (activeTab === "pending") {
      return items.filter((item) => item.status === "pending");
    }

    if (activeTab === "processed") {
      return items.filter((item) => item.status !== "pending");
    }

    return items;
  }, [activeTab, items]);

  const columns = useMemo<ColumnDef<NavaiPointsCashoutRequest>[]>(
    () => [
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: messages.panelPage.pointsRequestStatusColumnLabel,
        cell: ({ row }) =>
          resolveCashoutStatusLabel(row.original.status, messages),
      },
      {
        accessorKey: "userEmail",
        header: messages.panelPage.plusOrderUserColumnLabel,
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
        accessorKey: "accountHolder",
        header: messages.panelPage.pointsAccountHolderLabel,
      },
      {
        accessorKey: "accountReference",
        header: messages.panelPage.pointsAccountReferenceLabel,
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
      {
        id: "actions",
        enableSorting: false,
        header: messages.panelPage.actionsColumnLabel,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedItem(row.original);
              setReviewStatus("processing");
              setReviewResponse(row.original.responseMessage || "");
              setError("");
              setNotice("");
            }}
            disabled={row.original.status !== "pending"}
          >
            {messages.panelPage.userManagementVerificationReviewButtonLabel}
          </Button>
        ),
      },
    ],
    [messages, usdCopRate],
  );

  const handleSaveReview = async () => {
    if (!user || !selectedItem) {
      return;
    }

    setIsSavingReview(true);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      const response = await reviewNavaiPointsCashoutRequest(
        idToken,
        selectedItem.id,
        {
          status: reviewStatus,
          responseMessage: reviewResponse.trim() || undefined,
        },
      );

      setItems((current) =>
        current.map((item) =>
          item.id === response.item.id ? response.item : item,
        ),
      );
      setSelectedItem(null);
      setReviewResponse("");
      setNotice(messages.panelPage.withdrawalsReviewSuccessMessage);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : messages.panelPage.withdrawalsReviewErrorMessage,
      );
    } finally {
      setIsSavingReview(false);
    }
  };

  if (isLoading) {
    return (
      <PanelModuleShellContent
        page="withdrawals"
        requireAdmin={true}
        description={messages.panelPage.withdrawalsDescription}
        rightSidebarExtra={<PanelSidebarCardsSkeleton />}
      >
        <PanelContentSkeleton />
      </PanelModuleShellContent>
    );
  }

  return (
    <PanelModuleShellContent
      page="withdrawals"
      requireAdmin={true}
      description={messages.panelPage.withdrawalsDescription}
      rightSidebarExtra={
        <div className="space-y-4">
          <StatusSummaryCard
            label={messages.panelPage.pointsStatusPendingLabel}
            value={statusCounts.pending}
          />
          <StatusSummaryCard
            label={messages.panelPage.pointsStatusProcessingLabel}
            value={statusCounts.processing}
          />
          <StatusSummaryCard
            label={messages.panelPage.pointsStatusPaidLabel}
            value={statusCounts.paid}
          />
          <StatusSummaryCard
            label={messages.panelPage.pointsStatusRejectedLabel}
            value={statusCounts.rejected}
          />
        </div>
      }
    >
      <article className="min-w-0 w-full justify-self-stretch space-y-6">
        {error ? <p className="navai-panel-error">{error}</p> : null}
        {notice ? <p className="navai-panel-success">{notice}</p> : null}

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "pending" | "processed" | "all")
          }
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-[42rem] grid-cols-3">
            <TabsTrigger value="pending">
              {messages.panelPage.withdrawalsPendingTabLabel}
            </TabsTrigger>
            <TabsTrigger value="processed">
              {messages.panelPage.withdrawalsProcessedTabLabel}
            </TabsTrigger>
            <TabsTrigger value="all">
              {messages.panelPage.withdrawalsAllTabLabel}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-0">
            <section className="docs-section-block navai-panel-card w-full max-w-none">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {messages.panelPage.withdrawalsRequestsTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {messages.panelPage.withdrawalsRequestsDescription}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadRequests({ silent: true })}
                  disabled={isRefreshing}
                >
                  <RefreshCcw aria-hidden="true" />
                  <span>
                    {messages.panelPage.withdrawalsRefreshButtonLabel}
                  </span>
                </Button>
              </div>

              <DataTable
                columns={columns}
                data={visibleItems}
                emptyMessage={messages.panelPage.withdrawalsEmptyMessage}
                filterColumnId="userEmail"
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
          </TabsContent>
        </Tabs>
      </article>

      <Dialog
        open={Boolean(selectedItem)}
        onOpenChange={() => setSelectedItem(null)}
      >
        <DialogContent className="max-w-[42rem]">
          <DialogHeader>
            <DialogTitle>
              {messages.panelPage.userManagementVerificationReviewPanelTitle}
            </DialogTitle>
            <DialogDescription>
              {
                messages.panelPage
                  .userManagementVerificationReviewPanelDescription
              }
            </DialogDescription>
          </DialogHeader>

          {selectedItem ? (
            <div className="space-y-4">
              <div className="rounded-[0.9rem] border border-border/70 bg-background/45 p-4 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">
                    {messages.panelPage.plusOrderUserColumnLabel}
                  </strong>{" "}
                  {selectedItem.userEmail || selectedItem.userId}
                </p>
                <p className="mt-1">
                  <strong className="text-foreground">
                    {messages.panelPage.pointsRequestPointsColumnLabel}
                  </strong>{" "}
                  {formatPoints(selectedItem.requestedPoints)}
                </p>
                <p className="mt-1">
                  <strong className="text-foreground">
                    {messages.panelPage.pointsRequestAmountColumnLabel}
                  </strong>{" "}
                  {formatUsdFromCop(selectedItem.requestedAmountCop, usdCopRate)}
                </p>
              </div>

              <div className="navai-panel-field">
                <Label htmlFor="withdrawals-review-status">
                  {messages.panelPage.pointsRequestStatusColumnLabel}
                </Label>
                <select
                  id="withdrawals-review-status"
                  className="navai-panel-select"
                  value={reviewStatus}
                  onChange={(event) =>
                    setReviewStatus(
                      event.target.value as Exclude<
                        NavaiPointsCashoutStatus,
                        "pending"
                      >,
                    )
                  }
                  disabled={isSavingReview}
                >
                  <option value="processing">
                    {messages.panelPage.pointsStatusProcessingLabel}
                  </option>
                  <option value="paid">
                    {messages.panelPage.pointsStatusPaidLabel}
                  </option>
                  <option value="rejected">
                    {messages.panelPage.pointsStatusRejectedLabel}
                  </option>
                </select>
              </div>

              <div className="navai-panel-field">
                <Label htmlFor="withdrawals-review-response">
                  {messages.panelPage.pointsRequestResponseColumnLabel}
                </Label>
                <Textarea
                  id="withdrawals-review-response"
                  value={reviewResponse}
                  onChange={(event) => setReviewResponse(event.target.value)}
                  className="min-h-[8rem]"
                  disabled={isSavingReview}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedItem(null)}
              disabled={isSavingReview}
            >
              {messages.panelPage.cancelActionLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSaveReview()}
              disabled={isSavingReview || !selectedItem}
            >
              {isSavingReview ? (
                <Clock3 aria-hidden="true" />
              ) : reviewStatus === "paid" ? (
                <BadgeCheck aria-hidden="true" />
              ) : reviewStatus === "rejected" ? (
                <XCircle aria-hidden="true" />
              ) : (
                <RefreshCcw aria-hidden="true" />
              )}
              <span>
                {messages.panelPage.userManagementVerificationSaveButtonLabel}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelModuleShellContent>
  );
}
