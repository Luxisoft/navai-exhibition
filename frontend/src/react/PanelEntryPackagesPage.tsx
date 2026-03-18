"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Package, Plus, RefreshCcw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  listNavaiEntryPackagesAdmin,
  updateNavaiEntryPackageAdmin,
  type NavaiEntryPackage,
  type NavaiEntryPackageInput,
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
  };
}

function PackagesSidebar({
  items,
  messages,
}: {
  items: NavaiEntryPackage[];
  messages: ReturnType<typeof useI18n>["messages"];
}) {
  const activeCount = items.filter((item) => item.isActive).length;

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
          <strong>{messages.panelPage.entryPackagesTotalLabel}</strong> {items.length}
        </p>
        <p>
          <strong>{messages.panelPage.entryPackagesActiveLabel}</strong> {activeCount}
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
  const [items, setItems] = useState<NavaiEntryPackage[]>([]);
  const [activeTab, setActiveTab] = useState("packages");
  const [form, setForm] = useState(() => toEditableForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPackages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) {
        setItems([]);
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
        const response = await listNavaiEntryPackagesAdmin(idToken);
        setItems(response.items);
        setForm((current) =>
          !current.key && response.items[0] ? toEditableForm(response.items[0]) : current,
        );
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
    void loadPackages();
  }, [loadPackages]);

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
        accessorKey: "entriesCount",
        header: messages.panelPage.entryPackagesEntriesColumnLabel,
      },
      {
        accessorKey: "totalUsd",
        header: messages.panelPage.entryPackagesTotalUsdColumnLabel,
        cell: ({ row }) => usdFormatter.format(Math.max(0, row.original.totalUsd || 0)),
      },
      {
        accessorKey: "totalCopCents",
        header: messages.panelPage.entryPackagesTotalCopColumnLabel,
        cell: ({ row }) => copFormatter.format(Math.max(0, row.original.totalCopCents || 0) / 100),
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
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setForm(toEditableForm(row.original));
              setActiveTab("editor");
              setError("");
              setNotice("");
            }}
          >
            {messages.panelPage.editActionLabel}
          </Button>
        ),
      },
    ],
    [messages],
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
        entriesCount: Math.max(1, Number.parseInt(form.entriesCount || "1", 10) || 1),
        priceUsd: Math.max(0.01, Number.parseFloat(form.priceUsd || "0") || 0),
        vatPercentage: Math.max(0, Number.parseFloat(form.vatPercentage || "0") || 0),
        isActive: Boolean(form.isActive),
        sortOrder: Math.max(0, Number.parseInt(form.sortOrder || "0", 10) || 0),
      };
      const response = await updateNavaiEntryPackageAdmin(idToken, packageKey, payload);
      setForm(toEditableForm(response.item));
      setNotice(messages.panelPage.entryPackagesSaveSuccessMessage);
      await loadPackages({ silent: true });
      setActiveTab("packages");
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

  if (isLoading) {
    return (
      <PanelModuleShellContent
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
      page="entry-packages"
      requireAdmin={true}
      description={messages.panelPage.entryPackagesDescription}
      rightSidebarExtra={<PackagesSidebar items={items} messages={messages} />}
    >
      <article className="navai-panel-layout space-y-6">
        {error ? <p className="navai-panel-error">{error}</p> : null}
        {notice ? <p className="navai-panel-success">{notice}</p> : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-[42rem] grid-cols-2">
            <TabsTrigger value="packages">
              {messages.panelPage.entryPackagesTabListLabel}
            </TabsTrigger>
            <TabsTrigger value="editor">
              {messages.panelPage.entryPackagesTabEditorLabel}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="space-y-0">
            <section className="docs-section-block navai-panel-card w-full max-w-none">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {messages.panelPage.entryPackagesTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {messages.panelPage.entryPackagesDescription}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isRefreshing}
                    onClick={() => void loadPackages({ silent: true })}
                  >
                    <RefreshCcw aria-hidden="true" />
                    {messages.panelPage.entryPackagesRefreshButtonLabel}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setForm(toEditableForm());
                      setActiveTab("editor");
                      setError("");
                      setNotice("");
                    }}
                  >
                    <Plus aria-hidden="true" />
                    {messages.panelPage.entryPackagesCreateButtonLabel}
                  </Button>
                </div>
              </div>
              <DataTable
                columns={columns}
                data={items}
                emptyMessage={messages.panelPage.entryPackagesEmptyMessage}
                filterColumnId="name"
                filterPlaceholder={messages.panelPage.entryPackagesFilterPlaceholder}
                columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
                previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                nextPageLabel={messages.panelPage.tableNextPageLabel}
                paginationSummaryTemplate={messages.panelPage.tablePaginationSummaryLabel}
              />
            </section>
          </TabsContent>

          <TabsContent value="editor" className="space-y-0">
            <section className="docs-section-block navai-panel-card w-full max-w-none">
              <div className="navai-panel-tab-panel space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {messages.panelPage.entryPackagesEditorTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {messages.panelPage.entryPackagesEditorDescription}
                  </p>
                </div>

                <div className="navai-panel-form-grid">
                  <div className="navai-panel-field">
                    <Label htmlFor="entry-package-key">
                      {messages.panelPage.entryPackagesKeyFieldLabel}
                    </Label>
                    <Input
                      id="entry-package-key"
                      className="min-w-0"
                      value={form.key}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, key: event.target.value }))
                      }
                    />
                  </div>

                  <div className="navai-panel-field">
                    <Label htmlFor="entry-package-name">
                      {messages.panelPage.entryPackagesNameFieldLabel}
                    </Label>
                    <Input
                      id="entry-package-name"
                      className="min-w-0"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>

                  <div className="navai-panel-field md:col-span-2">
                    <Label htmlFor="entry-package-description">
                      {messages.panelPage.entryPackagesDescriptionFieldLabel}
                    </Label>
                    <Textarea
                      id="entry-package-description"
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                  </div>

                  <div className="navai-panel-field">
                    <Label htmlFor="entry-package-entries">
                      {messages.panelPage.entryPackagesEntriesFieldLabel}
                    </Label>
                    <Input
                      id="entry-package-entries"
                      type="number"
                      min={1}
                      step={1}
                      className="min-w-0"
                      value={form.entriesCount}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, entriesCount: event.target.value }))
                      }
                    />
                  </div>

                  <div className="navai-panel-field">
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
                        setForm((current) => ({ ...current, priceUsd: event.target.value }))
                      }
                    />
                  </div>

                  <div className="navai-panel-field">
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
                        setForm((current) => ({ ...current, vatPercentage: event.target.value }))
                      }
                    />
                  </div>

                  <div className="navai-panel-field">
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
                        setForm((current) => ({ ...current, sortOrder: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <label className="navai-panel-checkbox-field">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, isActive: event.target.checked }))
                    }
                  />
                  <span>{messages.panelPage.entryPackagesActiveFieldLabel}</span>
                </label>

                <div className="navai-panel-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setActiveTab("packages");
                    }}
                    disabled={isSaving}
                  >
                    {messages.panelPage.cancelActionLabel}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSavePackage()}
                    disabled={isSaving}
                  >
                    {isSaving ? <RefreshCcw aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                    {messages.panelPage.entryPackagesSaveButtonLabel}
                  </Button>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </article>
    </PanelModuleShellContent>
  );
}
