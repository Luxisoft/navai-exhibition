"use client";

import {
  Copy,
  ExternalLink,
  Gift,
  QrCode,
  RefreshCcw,
  Ticket,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import QRCode from "qrcode";

import AppProvidersShell from "@/react/AppProvidersShell";
import { PanelModuleShellContent } from "@/react/PanelModuleShell";

import {
  PanelContentSkeleton,
  PanelSidebarCardsSkeleton,
} from "@/components/AppShellSkeletons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { buildReferralInviteUrl } from "@/lib/navai-referrals";
import {
  getNavaiReferralProgram,
  type NavaiReferral,
  type NavaiReferralEntryLedger,
  type NavaiReferralProgram,
} from "@/lib/navai-panel-api";

function formatDateTime(value: string) {
  if (!value) {
    return "—";
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

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
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

function ReferralsSidebarCards({
  program,
  messages,
}: {
  program: NavaiReferralProgram | null;
  messages: ReturnType<typeof useI18n>["messages"];
}) {
  return (
    <div className="space-y-4">
      <section className="docs-section-block navai-panel-card rounded-[1rem] p-5">
        <div className="flex items-start justify-between gap-3">
          <strong>{messages.panelPage.referralProgramRulesTitle}</strong>
          <Gift aria-hidden="true" className="text-primary" />
        </div>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>{messages.panelPage.referralProgramRuleOne}</li>
          <li>{messages.panelPage.referralProgramRuleTwo}</li>
          <li>{messages.panelPage.referralProgramRuleThree}</li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          <strong>{messages.panelPage.referralAvailableCreditsLabel}</strong>{" "}
          {program?.availableEntries ?? 0}
        </p>
      </section>
      <section className="docs-section-block navai-panel-card rounded-[1rem] p-5">
        <div className="flex items-start justify-between gap-3">
          <strong>{messages.panelPage.referralProgramCodeCardTitle}</strong>
          <Ticket aria-hidden="true" className="text-primary" />
        </div>
        <p className="mt-3 break-all text-lg font-semibold text-foreground">
          {program?.code || "—"}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {messages.panelPage.referralProgramCodeCardDescription}
        </p>
      </section>
    </div>
  );
}

function resolveReferralStatusLabel(
  status: NavaiReferral["status"],
  messages: ReturnType<typeof useI18n>["messages"],
) {
  switch (status) {
    case "rewarded":
      return messages.panelPage.referralStatusRewardedLabel;
    case "rejected":
      return messages.panelPage.referralStatusRejectedLabel;
    default:
      return messages.panelPage.referralStatusPendingLabel;
  }
}

function resolveLedgerReasonLabel(
  reason: NavaiReferralEntryLedger["reason"],
  messages: ReturnType<typeof useI18n>["messages"],
) {
  switch (reason) {
    case "entry_consumed":
      return messages.panelPage.referralLedgerReasonBypassLabel;
    case "manual_adjustment":
      return messages.panelPage.referralLedgerReasonManualLabel;
    default:
      return messages.panelPage.referralLedgerReasonRewardLabel;
  }
}

export default function PanelReferralsPage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelReferralsPageContent />
    </AppProvidersShell>
  );
}

function PanelReferralsPageContent() {
  const { messages } = useI18n();
  const { user } = useFirebaseAuth();
  const [program, setProgram] = useState<NavaiReferralProgram | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sidebarCards = <ReferralsSidebarCards program={program} messages={messages} />;

  const loadProgram = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) {
        setProgram(null);
        setInviteUrl("");
        setQrCodeUrl("");
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
        const response = await getNavaiReferralProgram(idToken);
        setProgram(response.program);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : messages.panelPage.referralLoadErrorMessage,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [messages.panelPage.referralLoadErrorMessage, user],
  );

  useEffect(() => {
    void loadProgram();
  }, [loadProgram]);

  useEffect(() => {
    const nextInviteUrl = buildReferralInviteUrl(program?.code || "");
    setInviteUrl(nextInviteUrl);
  }, [program?.code]);

  useEffect(() => {
    let isMounted = true;

    if (!inviteUrl) {
      setQrCodeUrl("");
      return () => {
        isMounted = false;
      };
    }

    void QRCode.toDataURL(inviteUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: "#f5f7ff",
        light: "#111111",
      },
    })
      .then((dataUrl: string) => {
        if (isMounted) {
          setQrCodeUrl(dataUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setQrCodeUrl("");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [inviteUrl]);

  const referralColumns = useMemo<ColumnDef<NavaiReferral>[]>(
    () => [
      {
        accessorKey: "referredEmail",
        header: messages.panelPage.referralReferredEmailColumnLabel,
        cell: ({ row }) => row.original.referredEmail || "—",
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: messages.panelPage.referralStatusColumnLabel,
        cell: ({ row }) => resolveReferralStatusLabel(row.original.status, messages),
      },
      {
        accessorKey: "rewardEntries",
        header: messages.panelPage.referralRewardColumnLabel,
        cell: ({ row }) => String(row.original.rewardEntries || 0),
      },
      {
        accessorKey: "sourceOrderId",
        header: messages.panelPage.referralSourceOrderColumnLabel,
        cell: ({ row }) => row.original.sourceOrderId || "—",
      },
      {
        accessorKey: "createdAt",
        header: messages.panelPage.referralCreatedAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: "rewardAppliedAt",
        header: messages.panelPage.referralRewardAppliedAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.rewardAppliedAt),
      },
      {
        accessorKey: "rejectionReason",
        header: messages.panelPage.referralRejectionReasonColumnLabel,
        cell: ({ row }) => row.original.rejectionReason || "—",
      },
    ],
    [messages],
  );

  const ledgerColumns = useMemo<ColumnDef<NavaiReferralEntryLedger>[]>(
    () => [
      {
        id: "reason",
        accessorFn: (row) => row.reason,
        header: messages.panelPage.referralLedgerReasonColumnLabel,
        cell: ({ row }) => resolveLedgerReasonLabel(row.original.reason, messages),
      },
      {
        accessorKey: "deltaEntries",
        header: messages.panelPage.referralLedgerDeltaColumnLabel,
        cell: ({ row }) => String(row.original.deltaEntries),
      },
      {
        accessorKey: "relatedUserEmail",
        header: messages.panelPage.referralLedgerRelatedUserColumnLabel,
        cell: ({ row }) => row.original.relatedUserEmail || row.original.relatedUserId || "—",
      },
      {
        id: "experience",
        accessorFn: (row) => `${row.experienceKind}:${row.experienceSlug}`,
        header: messages.panelPage.referralLedgerExperienceColumnLabel,
        cell: ({ row }) =>
          row.original.experienceSlug
            ? `${row.original.experienceKind || "survey"} / ${row.original.experienceSlug}`
            : "—",
      },
      {
        accessorKey: "conversationId",
        header: messages.panelPage.referralLedgerConversationColumnLabel,
        cell: ({ row }) => row.original.conversationId || "—",
      },
      {
        accessorKey: "createdAt",
        header: messages.panelPage.referralLedgerCreatedAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [messages],
  );

  if (isLoading) {
    return (
      <PanelModuleShellContent
        page="referrals"
        description={messages.panelPage.referralsDescription}
        rightSidebarExtra={<PanelSidebarCardsSkeleton />}
      >
        <PanelContentSkeleton />
      </PanelModuleShellContent>
    );
  }

  return (
    <PanelModuleShellContent
      page="referrals"
      description={messages.panelPage.referralsDescription}
      rightSidebarExtra={sidebarCards}
    >
      <div className="min-w-0 w-full justify-self-stretch space-y-6">
        <div className="navai-panel-summary-grid">
          <SummaryCard
            label={messages.panelPage.referralAvailableCreditsLabel}
            value={String(program?.availableEntries ?? 0)}
            icon={<Ticket aria-hidden="true" className="h-5 w-5" />}
          />
          <SummaryCard
            label={messages.panelPage.referralTotalReferralsLabel}
            value={String(program?.totalReferrals ?? 0)}
            icon={<Users aria-hidden="true" className="h-5 w-5" />}
          />
          <SummaryCard
            label={messages.panelPage.referralRewardedReferralsLabel}
            value={String(program?.rewardedReferrals ?? 0)}
            icon={<Gift aria-hidden="true" className="h-5 w-5" />}
          />
          <SummaryCard
            label={messages.panelPage.referralConsumedCreditsLabel}
            value={String(program?.consumedEntries ?? 0)}
            icon={<RefreshCcw aria-hidden="true" className="h-5 w-5" />}
          />
        </div>

        <section className="docs-section-block navai-panel-card w-full max-w-none">
          <div className="navai-panel-tab-panel">
            {error ? <p className="navai-panel-error">{error}</p> : null}
            {notice ? <p className="navai-panel-success break-all">{notice}</p> : null}

            <div className="grid gap-4">
              <div className="min-w-0 space-y-4 rounded-[1rem] border border-border/60 bg-background/30 p-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {messages.panelPage.referralProgramShareTitle}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {messages.panelPage.referralProgramShareDescription}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      {messages.panelPage.referralProgramCodeLabel}
                    </span>
                    <div className="flex flex-col gap-3">
                      <Input className="min-w-0" value={program?.code || ""} readOnly />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!program?.code) {
                            return;
                          }
                          void navigator.clipboard?.writeText(program.code);
                          setNotice(messages.panelPage.referralCopyCodeSuccessMessage);
                        }}
                      >
                        <Copy aria-hidden="true" />
                        <span>{messages.panelPage.referralCopyCodeButtonLabel}</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-medium text-foreground">
                      {messages.panelPage.referralProgramLinkLabel}
                    </span>
                    <div className="flex flex-col gap-3">
                      <Input className="min-w-0" value={inviteUrl} readOnly />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!inviteUrl) {
                            return;
                          }
                          void navigator.clipboard?.writeText(inviteUrl);
                          setNotice(messages.panelPage.referralCopyLinkSuccessMessage);
                        }}
                      >
                        <Copy aria-hidden="true" />
                        <span>{messages.panelPage.referralCopyLinkButtonLabel}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!inviteUrl) {
                            return;
                          }
                          window.open(inviteUrl, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <ExternalLink aria-hidden="true" />
                        <span>{messages.panelPage.referralOpenLinkButtonLabel}</span>
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadProgram({ silent: true })}
                    disabled={isRefreshing}
                  >
                    <RefreshCcw aria-hidden="true" />
                    <span>{messages.panelPage.plusRefreshButtonLabel}</span>
                  </Button>
                </div>
              </div>

              <div className="flex min-h-[20rem] min-w-0 items-center justify-center rounded-[1rem] border border-border/60 bg-background/30 p-5">
                <div className="mx-auto w-full max-w-[18rem] space-y-4 text-center">
                  <div className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 p-3 text-primary">
                    <QrCode aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {messages.panelPage.referralProgramQrTitle}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {messages.panelPage.referralProgramQrDescription}
                    </p>
                  </div>
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt={messages.panelPage.referralProgramQrAlt}
                      className="mx-auto aspect-square w-full max-w-56 rounded-[1rem] border border-border/60 bg-background p-3"
                    />
                  ) : (
                    <div className="mx-auto flex aspect-square w-full max-w-56 items-center justify-center rounded-[1rem] border border-dashed border-border/60 bg-background/40 px-6 text-sm text-muted-foreground">
                      {messages.panelPage.referralProgramQrLoadingLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="docs-section-block navai-panel-card w-full max-w-none">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {messages.panelPage.referralsTableTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {messages.panelPage.referralsTableDescription}
              </p>
            </div>
          </div>
          <DataTable
            columns={referralColumns}
            data={program?.referrals ?? []}
            emptyMessage={messages.panelPage.referralsTableEmptyMessage}
            filterColumnId="referredEmail"
            filterPlaceholder={messages.panelPage.referralsTableFilterPlaceholder}
            columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
            previousPageLabel={messages.panelPage.tablePreviousPageLabel}
            nextPageLabel={messages.panelPage.tableNextPageLabel}
            paginationSummaryTemplate={messages.panelPage.tablePaginationSummaryLabel}
          />
        </section>

        <section className="docs-section-block navai-panel-card w-full max-w-none">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {messages.panelPage.referralLedgerTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {messages.panelPage.referralLedgerDescription}
              </p>
            </div>
          </div>
          <DataTable
            columns={ledgerColumns}
            data={program?.ledger ?? []}
            emptyMessage={messages.panelPage.referralLedgerEmptyMessage}
            filterColumnId="relatedUserEmail"
            filterPlaceholder={messages.panelPage.referralLedgerFilterPlaceholder}
            columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
            previousPageLabel={messages.panelPage.tablePreviousPageLabel}
            nextPageLabel={messages.panelPage.tableNextPageLabel}
            paginationSummaryTemplate={messages.panelPage.tablePaginationSummaryLabel}
          />
        </section>
      </div>
    </PanelModuleShellContent>
  );
}
