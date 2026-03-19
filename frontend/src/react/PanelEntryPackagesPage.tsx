"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ChangeEvent } from "react";
import { Package, Pencil, Plus, RefreshCcw, Save, UserCog } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { useNavaiPanelAccess } from "@/lib/navai-panel-access";
import {
  createNavaiMembershipRoleAssignmentAdmin,
  deleteNavaiEntryPackageAdmin,
  listNavaiEntryPackagesAdmin,
  listNavaiMembershipRoleAssignmentsAdmin,
  listNavaiPanelManagedUsers,
  listNavaiPanelRolePermissions,
  updateNavaiEntryPackageAdmin,
  type NavaiEntryPackage,
  type NavaiEntryPackageInput,
  type NavaiMembershipRoleAssignment,
  type NavaiMembershipServicePeriod,
  type NavaiPanelActorRole,
  type NavaiPanelManagedUser,
} from "@/lib/navai-panel-api";

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

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

function toDateTimeLocalInputValue(value: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const localDate = new Date(
    parsed.getTime() - parsed.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}

function normalizeLocalDateTimeToIso(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function resolveDefaultAssignmentWindow() {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    startsAt: toDateTimeLocalInputValue(start.toISOString()),
    endsAt: toDateTimeLocalInputValue(end.toISOString()),
  };
}

function toEditableForm(item?: NavaiEntryPackage | null) {
  return {
    key: item?.key ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    entriesCount: String(Math.max(1, item?.entriesCount ?? 1)),
    priceUsd: String(item?.priceUsd ?? 0),
    vatPercentage: String(item?.vatPercentage ?? 19),
    isActive: item?.isActive ?? true,
    sortOrder: String(item?.sortOrder ?? 0),
    servicePeriod:
      item?.servicePeriod ?? ("monthly" as NavaiMembershipServicePeriod),
    roleOnStart: item?.roleOnStart ?? ("user" as NavaiPanelActorRole),
    roleOnEnd: item?.roleOnEnd ?? ("user" as NavaiPanelActorRole),
  };
}

function PackagesSidebar({
  items,
  assignments,
  messages,
}: {
  items: NavaiEntryPackage[];
  assignments: NavaiMembershipRoleAssignment[];
  messages: ReturnType<typeof useI18n>["messages"];
}) {
  const activeCount = items.filter((item) => item.isActive).length;
  const activeAssignments = assignments.filter(
    (item) => item.status === "active",
  ).length;

  return (
    <section className="docs-section-block navai-panel-card rounded-[1rem] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong>{messages.panelPage.entryPackagesSummaryTitle}</strong>
          <p className="mt-2 text-sm text-muted-foreground">
            {messages.panelPage.entryPackagesSummaryDescription}
          </p>
        </div>
        <Package aria-hidden="true" className="text-primary" />
      </div>
      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p>
          <strong>{messages.panelPage.entryPackagesTotalLabel}</strong>{" "}
          {items.length}
        </p>
        <p>
          <strong>{messages.panelPage.entryPackagesActiveLabel}</strong>{" "}
          {activeCount}
        </p>
        <p>
          <strong>
            {messages.panelPage.entryPackagesAssignmentStatusActiveLabel}
          </strong>{" "}
          {activeAssignments}
        </p>
      </div>
    </section>
  );
}

export default function PanelEntryPackagesPage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelEntryPackagesPageContent />
    </AppProvidersShell>
  );
}

function PanelEntryPackagesPageContent() {
  const { messages } = useI18n();
  const { user } = useFirebaseAuth();
  const { canDeleteTableData } = useNavaiPanelAccess();
  const [items, setItems] = useState<NavaiEntryPackage[]>([]);
  const [assignments, setAssignments] = useState<
    NavaiMembershipRoleAssignment[]
  >([]);
  const [managedUsers, setManagedUsers] = useState<NavaiPanelManagedUser[]>([]);
  const [roleOptions, setRoleOptions] = useState<NavaiPanelActorRole[]>([
    "admin",
    "moderator",
    "support",
    "user",
  ]);
  const [form, setForm] = useState(() => toEditableForm());
  const [isEditorDialogOpen, setIsEditorDialogOpen] = useState(false);
  const [isAssignmentsDialogOpen, setIsAssignmentsDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState(() => ({
    userId: "",
    packageKey: "",
    ...resolveDefaultAssignmentWindow(),
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const roleLabelMap = useMemo(
    () => ({
      admin: messages.panelPage.userManagementRoleAdminLabel,
      moderator: messages.panelPage.userManagementRoleModeratorLabel,
      support: messages.panelPage.userManagementRoleSupportLabel,
      user: messages.panelPage.userManagementRoleUserLabel,
    }),
    [
      messages.panelPage.userManagementRoleAdminLabel,
      messages.panelPage.userManagementRoleModeratorLabel,
      messages.panelPage.userManagementRoleSupportLabel,
      messages.panelPage.userManagementRoleUserLabel,
    ],
  );

  const servicePeriodLabelMap = useMemo(
    () => ({
      monthly: messages.panelPage.entryPackagesPeriodMonthlyLabel,
      quarterly: messages.panelPage.entryPackagesPeriodQuarterlyLabel,
      semiannual: messages.panelPage.entryPackagesPeriodSemiannualLabel,
      annual: messages.panelPage.entryPackagesPeriodAnnualLabel,
    }),
    [
      messages.panelPage.entryPackagesPeriodAnnualLabel,
      messages.panelPage.entryPackagesPeriodMonthlyLabel,
      messages.panelPage.entryPackagesPeriodQuarterlyLabel,
      messages.panelPage.entryPackagesPeriodSemiannualLabel,
    ],
  );

  const userById = useMemo(
    () => new Map(managedUsers.map((item) => [item.uid, item])),
    [managedUsers],
  );

  const loadAll = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) {
        setItems([]);
        setAssignments([]);
        setManagedUsers([]);
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
        const [
          packagesResponse,
          assignmentsResponse,
          usersResponse,
          rolesResponse,
        ] = await Promise.all([
          listNavaiEntryPackagesAdmin(idToken),
          listNavaiMembershipRoleAssignmentsAdmin(idToken),
          listNavaiPanelManagedUsers(idToken),
          listNavaiPanelRolePermissions(idToken),
        ]);
        setItems(packagesResponse.items);
        setAssignments(assignmentsResponse.items);
        setManagedUsers(usersResponse.items);
        const sortedRoles = rolesResponse.items
          .map((item) => item.role)
          .sort((left, right) => {
            const order = ["admin", "moderator", "support", "user"];
            return order.indexOf(left) - order.indexOf(right);
          });
        const selectableRoles = sortedRoles.filter(
          (role): role is NavaiPanelActorRole =>
            role === "admin" ||
            role === "moderator" ||
            role === "support" ||
            role === "user",
        );
        setRoleOptions(
          selectableRoles.length > 0
            ? selectableRoles
            : ["admin", "moderator", "support", "user"],
        );
        setForm((current) =>
          !current.key && packagesResponse.items[0]
            ? toEditableForm(packagesResponse.items[0])
            : current,
        );
        setAssignmentForm((current) => {
          const defaults = resolveDefaultAssignmentWindow();
          return {
            userId: current.userId || usersResponse.items[0]?.uid || "",
            packageKey:
              current.packageKey || packagesResponse.items[0]?.key || "",
            startsAt: current.startsAt || defaults.startsAt,
            endsAt: current.endsAt || defaults.endsAt,
          };
        });
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : messages.panelPage.entryPackagesLoadErrorMessage,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [messages.panelPage.entryPackagesLoadErrorMessage, user],
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const columns = useMemo<ColumnDef<NavaiEntryPackage>[]>(
    () => [
      {
        accessorKey: "key",
        header: messages.panelPage.entryPackagesKeyColumnLabel,
      },
      {
        accessorKey: "name",
        header: messages.panelPage.entryPackagesNameColumnLabel,
      },
      {
        accessorKey: "servicePeriod",
        header: messages.panelPage.entryPackagesPeriodColumnLabel,
        cell: ({ row }) => servicePeriodLabelMap[row.original.servicePeriod],
      },
      {
        accessorKey: "roleOnStart",
        header: messages.panelPage.entryPackagesRoleOnStartColumnLabel,
        cell: ({ row }) => roleLabelMap[row.original.roleOnStart],
      },
      {
        accessorKey: "roleOnEnd",
        header: messages.panelPage.entryPackagesRoleOnEndColumnLabel,
        cell: ({ row }) => roleLabelMap[row.original.roleOnEnd],
      },
      {
        accessorKey: "totalUsd",
        header: messages.panelPage.entryPackagesTotalUsdColumnLabel,
        cell: ({ row }) =>
          usdFormatter.format(Math.max(0, row.original.totalUsd || 0)),
      },
      {
        accessorKey: "totalCopCents",
        header: messages.panelPage.entryPackagesTotalCopColumnLabel,
        cell: ({ row }) =>
          copFormatter.format(
            Math.max(0, row.original.totalCopCents || 0) / 100,
          ),
      },
      {
        accessorKey: "isActive",
        header: messages.panelPage.entryPackagesStatusColumnLabel,
        cell: ({ row }) =>
          row.original.isActive
            ? messages.panelPage.entryPackagesStatusActiveLabel
            : messages.panelPage.entryPackagesStatusInactiveLabel,
      },
      {
        accessorKey: "updatedAt",
        header: messages.panelPage.entryPackagesUpdatedAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
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
              aria-label={messages.panelPage.editActionLabel}
              title={messages.panelPage.editActionLabel}
              onClick={() => {
                setForm(toEditableForm(row.original));
                setError("");
                setNotice("");
                setIsEditorDialogOpen(true);
              }}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    [messages, roleLabelMap, servicePeriodLabelMap],
  );

  const assignmentColumns = useMemo<ColumnDef<NavaiMembershipRoleAssignment>[]>(
    () => [
      {
        id: "user",
        accessorFn: (row) => `${row.userEmail} ${row.userId}`,
        header: messages.panelPage.entryPackagesAssignmentUserColumnLabel,
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {row.original.userEmail || row.original.userId}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.userId}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "packageName",
        header: messages.panelPage.entryPackagesAssignmentServiceColumnLabel,
      },
      {
        accessorKey: "servicePeriod",
        header: messages.panelPage.entryPackagesAssignmentPeriodColumnLabel,
        cell: ({ row }) => servicePeriodLabelMap[row.original.servicePeriod],
      },
      {
        accessorKey: "roleOnStart",
        header:
          messages.panelPage.entryPackagesAssignmentRoleOnStartColumnLabel,
        cell: ({ row }) => roleLabelMap[row.original.roleOnStart],
      },
      {
        accessorKey: "roleOnEnd",
        header: messages.panelPage.entryPackagesAssignmentRoleOnEndColumnLabel,
        cell: ({ row }) => roleLabelMap[row.original.roleOnEnd],
      },
      {
        accessorKey: "startsAt",
        header: messages.panelPage.entryPackagesAssignmentStartsAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.startsAt),
      },
      {
        accessorKey: "endsAt",
        header: messages.panelPage.entryPackagesAssignmentEndsAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.endsAt),
      },
      {
        accessorKey: "status",
        header: messages.panelPage.entryPackagesAssignmentStatusColumnLabel,
        cell: ({ row }) => {
          if (row.original.status === "active") {
            return messages.panelPage.entryPackagesAssignmentStatusActiveLabel;
          }
          if (row.original.status === "completed") {
            return messages.panelPage
              .entryPackagesAssignmentStatusCompletedLabel;
          }
          return messages.panelPage.entryPackagesAssignmentStatusScheduledLabel;
        },
      },
      {
        accessorKey: "updatedAt",
        header: messages.panelPage.entryPackagesAssignmentUpdatedAtColumnLabel,
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
    ],
    [messages, roleLabelMap, servicePeriodLabelMap],
  );

  const handleSavePackage = async () => {
    if (!user) {
      return;
    }

    const packageKey = form.key.trim();
    if (!packageKey) {
      setError(messages.panelPage.entryPackagesKeyRequiredMessage);
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      const payload: NavaiEntryPackageInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        entriesCount: 1,
        priceUsd: Math.max(0.01, Number.parseFloat(form.priceUsd || "0") || 0),
        vatPercentage: Math.max(
          0,
          Number.parseFloat(form.vatPercentage || "0") || 0,
        ),
        isActive: Boolean(form.isActive),
        sortOrder: Math.max(0, Number.parseInt(form.sortOrder || "0", 10) || 0),
        servicePeriod: form.servicePeriod,
        roleOnStart: form.roleOnStart,
        roleOnEnd: form.roleOnEnd,
      };
      const response = await updateNavaiEntryPackageAdmin(
        idToken,
        packageKey,
        payload,
      );
      setForm(toEditableForm(response.item));
      setNotice(messages.panelPage.entryPackagesSaveSuccessMessage);
      await loadAll({ silent: true });
      setIsEditorDialogOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : messages.panelPage.entryPackagesSaveErrorMessage,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePackages = async (
    packagesToDelete: NavaiEntryPackage[],
  ) => {
    if (!user || !canDeleteTableData || packagesToDelete.length < 1) {
      return;
    }

    setError("");
    setNotice("");
    const idToken = await user.getIdToken();
    for (const item of packagesToDelete) {
      await deleteNavaiEntryPackageAdmin(idToken, item.key);
    }
    setNotice(messages.panelPage.entryPackagesDeleteSuccessMessage);
    await loadAll({ silent: true });
  };

  const handleAssignMembership = async () => {
    if (!user) {
      return;
    }

    if (!assignmentForm.userId) {
      setError(messages.panelPage.entryPackagesAssignUserRequiredMessage);
      return;
    }

    const startsAtIso = normalizeLocalDateTimeToIso(assignmentForm.startsAt);
    const endsAtIso = normalizeLocalDateTimeToIso(assignmentForm.endsAt);
    if (!startsAtIso || !endsAtIso) {
      setError(messages.panelPage.entryPackagesAssignDatesRequiredMessage);
      return;
    }

    const selectedUser = userById.get(assignmentForm.userId);
    if (!selectedUser) {
      setError(messages.panelPage.entryPackagesAssignUserRequiredMessage);
      return;
    }

    if (!assignmentForm.packageKey.trim()) {
      setError(messages.panelPage.entryPackagesKeyRequiredMessage);
      return;
    }

    setIsAssigning(true);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      await createNavaiMembershipRoleAssignmentAdmin(idToken, {
        userId: assignmentForm.userId,
        userEmail: selectedUser.email,
        packageKey: assignmentForm.packageKey.trim(),
        startsAt: startsAtIso,
        endsAt: endsAtIso,
      });
      setNotice(messages.panelPage.entryPackagesAssignSuccessMessage);
      await loadAll({ silent: true });
      setIsAssignmentsDialogOpen(false);
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : messages.panelPage.entryPackagesAssignErrorMessage,
      );
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <PanelModuleShellContent
        section="administration"
        page="entry-packages"
        requireAdmin={true}
        description={messages.panelPage.entryPackagesDescription}
        rightSidebarExtra={<PanelSidebarCardsSkeleton />}
      >
        <PanelContentSkeleton />
      </PanelModuleShellContent>
    );
  }

  return (
    <PanelModuleShellContent
      section="administration"
      page="entry-packages"
      requireAdmin={true}
      description={messages.panelPage.entryPackagesDescription}
      rightSidebarExtra={
        <PackagesSidebar
          items={items}
          assignments={assignments}
          messages={messages}
        />
      }
    >
      <article className="navai-panel-layout space-y-6">
        {error ? <p className="navai-panel-error">{error}</p> : null}
        {notice ? <p className="navai-panel-success">{notice}</p> : null}

        <section className="docs-section-block navai-panel-card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {messages.panelPage.entryPackagesTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {messages.panelPage.entryPackagesDescription}
            </p>
          </div>

          <NavaiDynamicTable
            columns={columns}
            data={items}
            emptyMessage={messages.panelPage.entryPackagesEmptyMessage}
            filterColumnId="name"
            filterPlaceholder={
              messages.panelPage.entryPackagesFilterPlaceholder
            }
            columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
            previousPageLabel={messages.panelPage.tablePreviousPageLabel}
            nextPageLabel={messages.panelPage.tableNextPageLabel}
            paginationSummaryTemplate={
              messages.panelPage.tablePaginationSummaryLabel
            }
            onRefresh={() => loadAll({ silent: true })}
            onDeleteSelectedRows={
              canDeleteTableData ? handleDeletePackages : undefined
            }
            canDeleteSelectedRows={canDeleteTableData}
            deleteSelectedButtonLabel={messages.panelPage.deleteActionLabel}
            deleteSelectedConfirmMessage={
              messages.panelPage.entryPackagesDeleteConfirmMessage
            }
            toolbarActions={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={messages.panelPage.entryPackagesCreateButtonLabel}
                  title={messages.panelPage.entryPackagesCreateButtonLabel}
                  onClick={() => {
                    setForm(toEditableForm());
                    setError("");
                    setNotice("");
                    setIsEditorDialogOpen(true);
                  }}
                >
                  <Plus aria-hidden="true" />
                  <span>
                    {messages.panelPage.entryPackagesCreateButtonLabel}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={
                    messages.panelPage.entryPackagesTabAssignmentsLabel
                  }
                  title={messages.panelPage.entryPackagesTabAssignmentsLabel}
                  onClick={() => setIsAssignmentsDialogOpen(true)}
                >
                  <UserCog aria-hidden="true" />
                  <span>
                    {messages.panelPage.entryPackagesTabAssignmentsLabel}
                  </span>
                </Button>
              </>
            }
          />
        </section>

        <Dialog open={isEditorDialogOpen} onOpenChange={setIsEditorDialogOpen}>
          <DialogContent className="sm:max-w-[56rem]">
            <DialogHeader>
              <DialogTitle>
                {messages.panelPage.entryPackagesEditorTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="navai-panel-tab-panel space-y-4">
              <p className="text-sm text-muted-foreground">
                {messages.panelPage.entryPackagesEditorDescription}
              </p>
              <div className="navai-panel-form-grid">
                <div>
                  <Label htmlFor="entry-package-key">
                    {messages.panelPage.entryPackagesKeyFieldLabel}
                  </Label>
                  <Input
                    id="entry-package-key"
                    className="min-w-0"
                    value={form.key}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        key: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="entry-package-name">
                    {messages.panelPage.entryPackagesNameFieldLabel}
                  </Label>
                  <Input
                    id="entry-package-name"
                    className="min-w-0"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="entry-package-description">
                    {messages.panelPage.entryPackagesDescriptionFieldLabel}
                  </Label>
                  <Textarea
                    id="entry-package-description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="entry-package-period">
                    {messages.panelPage.entryPackagesPeriodFieldLabel}
                  </Label>
                  <select
                    id="entry-package-period"
                    className="navai-panel-select"
                    value={form.servicePeriod}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setForm((current) => ({
                        ...current,
                        servicePeriod: event.target
                          .value as NavaiMembershipServicePeriod,
                      }))
                    }
                  >
                    <option value="monthly">
                      {messages.panelPage.entryPackagesPeriodMonthlyLabel}
                    </option>
                    <option value="quarterly">
                      {messages.panelPage.entryPackagesPeriodQuarterlyLabel}
                    </option>
                    <option value="semiannual">
                      {messages.panelPage.entryPackagesPeriodSemiannualLabel}
                    </option>
                    <option value="annual">
                      {messages.panelPage.entryPackagesPeriodAnnualLabel}
                    </option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="entry-package-role-start">
                    {messages.panelPage.entryPackagesRoleOnStartFieldLabel}
                  </Label>
                  <select
                    id="entry-package-role-start"
                    className="navai-panel-select"
                    value={form.roleOnStart}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setForm((current) => ({
                        ...current,
                        roleOnStart: event.target.value as NavaiPanelActorRole,
                      }))
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabelMap[role]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="entry-package-role-end">
                    {messages.panelPage.entryPackagesRoleOnEndFieldLabel}
                  </Label>
                  <select
                    id="entry-package-role-end"
                    className="navai-panel-select"
                    value={form.roleOnEnd}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setForm((current) => ({
                        ...current,
                        roleOnEnd: event.target.value as NavaiPanelActorRole,
                      }))
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabelMap[role]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="entry-package-price-usd">
                    {messages.panelPage.entryPackagesPriceUsdFieldLabel}
                  </Label>
                  <Input
                    id="entry-package-price-usd"
                    type="number"
                    min={0.01}
                    step={0.01}
                    className="min-w-0"
                    value={form.priceUsd}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priceUsd: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="entry-package-vat">
                    {messages.panelPage.entryPackagesVatFieldLabel}
                  </Label>
                  <Input
                    id="entry-package-vat"
                    type="number"
                    min={0}
                    step={0.01}
                    className="min-w-0"
                    value={form.vatPercentage}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        vatPercentage: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="entry-package-sort-order">
                    {messages.panelPage.entryPackagesSortOrderFieldLabel}
                  </Label>
                  <Input
                    id="entry-package-sort-order"
                    type="number"
                    min={0}
                    step={1}
                    className="min-w-0"
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <label className="navai-panel-checkbox-field">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                />
                <span>{messages.panelPage.entryPackagesActiveFieldLabel}</span>
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditorDialogOpen(false)}
                disabled={isSaving}
              >
                {messages.panelPage.cancelActionLabel}
              </Button>
              <Button
                type="button"
                onClick={() => void handleSavePackage()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <RefreshCcw aria-hidden="true" className="animate-spin" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {messages.panelPage.entryPackagesSaveButtonLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isAssignmentsDialogOpen}
          onOpenChange={setIsAssignmentsDialogOpen}
        >
          <DialogContent className="max-h-[calc(100vh-1.5rem)] overflow-hidden sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>
                {messages.panelPage.entryPackagesAssignmentsTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="navai-panel-tab-panel space-y-4 overflow-y-auto pr-1">
              <p className="text-sm text-muted-foreground">
                {messages.panelPage.entryPackagesAssignmentsDescription}
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="navai-panel-field">
                  <Label htmlFor="entry-package-assign-user">
                    {messages.panelPage.entryPackagesAssignUserFieldLabel}
                  </Label>
                  <select
                    id="entry-package-assign-user"
                    className="navai-panel-select"
                    value={assignmentForm.userId}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        userId: event.target.value,
                      }))
                    }
                  >
                    <option value="">-</option>
                    {managedUsers.map((managedUser) => (
                      <option key={managedUser.uid} value={managedUser.uid}>
                        {managedUser.email || managedUser.uid}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="navai-panel-field">
                  <Label htmlFor="entry-package-assign-package">
                    {messages.panelPage.entryPackagesAssignPackageFieldLabel}
                  </Label>
                  <select
                    id="entry-package-assign-package"
                    className="navai-panel-select"
                    value={assignmentForm.packageKey}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        packageKey: event.target.value,
                      }))
                    }
                  >
                    <option value="">-</option>
                    {items.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.name || item.key}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="navai-panel-field">
                  <Label htmlFor="entry-package-assign-starts-at">
                    {messages.panelPage.entryPackagesAssignStartsAtFieldLabel}
                  </Label>
                  <Input
                    id="entry-package-assign-starts-at"
                    type="datetime-local"
                    value={assignmentForm.startsAt}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        startsAt: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="navai-panel-field">
                  <Label htmlFor="entry-package-assign-ends-at">
                    {messages.panelPage.entryPackagesAssignEndsAtFieldLabel}
                  </Label>
                  <Input
                    id="entry-package-assign-ends-at"
                    type="datetime-local"
                    value={assignmentForm.endsAt}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        endsAt: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="navai-panel-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAssignmentForm((current) => ({
                      userId: current.userId || managedUsers[0]?.uid || "",
                      packageKey: current.packageKey || items[0]?.key || "",
                      ...resolveDefaultAssignmentWindow(),
                    }));
                  }}
                  disabled={isAssigning}
                >
                  {messages.panelPage.cancelActionLabel}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleAssignMembership()}
                  disabled={isAssigning}
                >
                  {isAssigning ? (
                    <RefreshCcw aria-hidden="true" className="animate-spin" />
                  ) : (
                    <UserCog aria-hidden="true" />
                  )}
                  {messages.panelPage.entryPackagesAssignButtonLabel}
                </Button>
              </div>
              <NavaiDynamicTable
                columns={assignmentColumns}
                data={assignments}
                emptyMessage={
                  messages.panelPage.entryPackagesAssignmentsEmptyMessage
                }
                filterColumnId="user"
                filterPlaceholder={
                  messages.panelPage.entryPackagesFilterPlaceholder
                }
                columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
                previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                nextPageLabel={messages.panelPage.tableNextPageLabel}
                paginationSummaryTemplate={
                  messages.panelPage.tablePaginationSummaryLabel
                }
                onRefresh={() => loadAll({ silent: true })}
              />
            </div>
          </DialogContent>
        </Dialog>
      </article>
    </PanelModuleShellContent>
  );
}
