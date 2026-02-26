'use client';

import { useEffect, useMemo, useState, type ReactNode } from "react";

import styles from "@/components/EcommerceCapabilityDemo.module.css";
import { getEcommerceSuiteDemoText } from "@/i18n/ecommerce-suite-demo";
import { useI18n } from "@/i18n/provider";
import {
  createEcommerceSuiteLocalRecord,
  deleteEcommerceSuiteLocalRecord,
  getEcommerceSuiteModuleEntityTemplate,
  getEcommerceSuiteModuleSnapshot,
  resetEcommerceSuiteModuleLocalWorkspace,
  runEcommerceSuiteLocalAction,
  subscribeEcommerceSuiteLocalState,
  type EcommerceSuiteModuleSlug,
  updateEcommerceSuiteLocalRecord,
} from "@/lib/ecommerce-suite-local";

type Snapshot = ReturnType<typeof getEcommerceSuiteModuleSnapshot>;
type EntityTemplate = ReturnType<typeof getEcommerceSuiteModuleEntityTemplate>;

type DraftMap = Record<string, Record<string, string | number | boolean>>;
type EditMap = Record<string, string | null>;
type ActionDraftMap = Record<string, Record<string, string>>;

type TranslateFn = (text: string) => string;

function humanizeKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

export default function EcommerceCapabilityDemo({ moduleSlug }: { moduleSlug: EcommerceSuiteModuleSlug }) {
  const { language } = useI18n();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [editing, setEditing] = useState<EditMap>({});
  const [actionDrafts, setActionDrafts] = useState<ActionDraftMap>({});
  const [message, setMessage] = useState<string | null>(null);

  const t = useMemo<TranslateFn>(() => (text) => getEcommerceSuiteDemoText(language, text), [language]);

  function localizeLooseText(value: string) {
    const translated = t(value);
    if (translated !== value) return translated;

    let match = /^Created local (.+) record\.$/.exec(value);
    if (match) return `${t("Created local record")}: ${t(match[1])}`;

    match = /^Updated local (.+) record (.+)\.$/.exec(value);
    if (match) return `${t("Updated local record")}: ${t(match[1])} (${match[2]})`;

    match = /^Deleted local (.+) record (.+)\.$/.exec(value);
    if (match) return `${t("Deleted local record")}: ${t(match[1])} (${match[2]})`;

    return value;
  }

  function localizeEventType(type: string) {
    if (type === "seed-sync") return t("Seed synced to local workspace");
    if (type === "create") return t("Create");
    if (type === "update") return t("Update");
    if (type === "delete") return t("Delete");
    if (type === "action") return t("Action event");
    return type;
  }

  const labels = useMemo(
    () => ({
      loadingModule: t("Loading ecommerce module..."),
      safetyModel: t("Safety model"),
      seedData: t("Seed data (read-only)"),
      localWorkspace: t("Local workspace (localStorage)"),
      workflowActions: t("Workflow actions"),
      eventLog: t("Local event log"),
      refresh: t("Refresh"),
      resetLocal: t("Reset local workspace"),
      noEvents: t("No events yet."),
      seedRows: t("Seed rows"),
      localRows: t("Local rows"),
      create: t("Create"),
      update: t("Update"),
      delete: t("Delete"),
      edit: t("Edit"),
      cancel: t("Cancel"),
      runAction: t("Run action"),
      noRows: t("No rows"),
      actionsColumn: t("actions"),
      localOnlyNote: t("Changes are stored only in localStorage. Seed data remains unchanged."),
      createdLocalRecord: t("Created local record"),
      updatedLocalRecord: t("Updated local record"),
      deletedLocalRecord: t("Deleted local record"),
    }),
    [t]
  );

  function loadSnapshot() {
    setLoading(true);
    setError(null);
    try {
      const next = getEcommerceSuiteModuleSnapshot(moduleSlug);
      setSnapshot(next);
      setLoading(false);
    } catch (nextError) {
      setLoading(false);
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  }

  useEffect(() => {
    loadSnapshot();
    return subscribeEcommerceSuiteLocalState(() => loadSnapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleSlug]);

  useEffect(() => {
    if (!snapshot) return;
    const nextDrafts: DraftMap = {};
    for (const entity of snapshot.module.entities) {
      const result = getEcommerceSuiteModuleEntityTemplate({ moduleSlug, entityKey: entity.key }) as EntityTemplate;
      const template = (result.template ?? {}) as Record<string, string | number | boolean>;
      nextDrafts[entity.key] = Object.fromEntries(
        entity.fields
          .filter((field) => field.key !== "id")
          .map((field) => [field.key, (template[field.key] as string | number | boolean) ?? ""])
      );
    }
    setDrafts((current) => ({ ...nextDrafts, ...current }));
    setEditing({});
    setActionDrafts({});
  }, [snapshot, moduleSlug]);

  function setDraftValue(entityKey: string, fieldKey: string, value: string | number | boolean) {
    setDrafts((current) => ({
      ...current,
      [entityKey]: {
        ...(current[entityKey] ?? {}),
        [fieldKey]: value,
      },
    }));
  }

  function setActionDraftValue(actionKey: string, inputKey: string, value: string) {
    setActionDrafts((current) => ({
      ...current,
      [actionKey]: {
        ...(current[actionKey] ?? {}),
        [inputKey]: value,
      },
    }));
  }

  if (loading && !snapshot) {
    return <p className={styles.info}>{labels.loadingModule}</p>;
  }

  if (error && !snapshot) {
    return <p className={styles.error}>{localizeLooseText(error)}</p>;
  }

  if (!snapshot) return null;

  return (
    <div className={styles.root}>
      <h2 id="ecommerce-suite-overview">{t(snapshot.module.title)}</h2>
      <p>{t(snapshot.module.description)}</p>
      <p className={styles.notice}>{labels.localOnlyNote}</p>

      <div className={styles.toolbar}>
        <button type="button" onClick={loadSnapshot}>{labels.refresh}</button>
        <button
          type="button"
          onClick={() => {
            const result = resetEcommerceSuiteModuleLocalWorkspace(moduleSlug);
            setMessage(`${t("Local workspace reset from seed.")} ${JSON.stringify(result.summary)}`);
            loadSnapshot();
          }}
        >
          {labels.resetLocal}
        </button>
      </div>

      {message ? <p className={styles.info}>{localizeLooseText(message)}</p> : null}
      {error ? <p className={styles.error}>{localizeLooseText(error)}</p> : null}

      <h2 id="ecommerce-suite-safety">{labels.safetyModel}</h2>
      <ul className={styles.list}>
        <li>{t("Immutable seed dataset (read-only).")}</li>
        <li>{t("Full CRUD on local workspace in localStorage.")}</li>
        <li>{t("Reset restores from seed.")}</li>
      </ul>

      <h2 id="ecommerce-suite-seed">{labels.seedData}</h2>
      {snapshot.module.entities.map((entity) => (
        <section key={`seed-${entity.key}`} className={styles.block}>
          <h3>{t(entity.label)}</h3>
          <p>{t(entity.description)}</p>
          <p className={styles.meta}>{labels.seedRows}: {snapshot.summary.seedEntityCounts[entity.key] ?? 0}</p>
          <DataTable rows={snapshot.seedEntities[entity.key] ?? []} noRowsLabel={labels.noRows} translate={t} />
        </section>
      ))}

      <h2 id="ecommerce-suite-local">{labels.localWorkspace}</h2>
      {snapshot.module.entities.map((entity) => {
        const localRows = (snapshot.localEntities[entity.key] ?? []) as Array<Record<string, unknown>>;
        const currentDraft = drafts[entity.key] ?? {};
        const currentEditId = editing[entity.key];
        return (
          <section key={`local-${entity.key}`} className={styles.block}>
            <h3>{t(entity.label)}</h3>
            <p className={styles.meta}>{labels.localRows}: {snapshot.summary.localEntityCounts[entity.key] ?? 0}</p>
            <DataTable
              rows={localRows}
              noRowsLabel={labels.noRows}
              translate={t}
              actionsHeaderLabel={labels.actionsColumn}
              actions={(row) => (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing((current) => ({ ...current, [entity.key]: String(row.id ?? "") }));
                      const values: Record<string, string | number | boolean> = {};
                      for (const field of entity.fields) {
                        if (field.key === "id" || field.editable === false) continue;
                        const raw = row[field.key];
                        values[field.key] = typeof raw === "boolean" || typeof raw === "number" ? raw : String(raw ?? "");
                      }
                      setDrafts((current) => ({ ...current, [entity.key]: values }));
                    }}
                  >
                    {labels.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        deleteEcommerceSuiteLocalRecord({ moduleSlug, entityKey: entity.key, recordId: String(row.id ?? "") });
                        setMessage(`${labels.deletedLocalRecord}: ${String(row.id ?? "")}`);
                        loadSnapshot();
                      } catch (nextError) {
                        setError(nextError instanceof Error ? nextError.message : String(nextError));
                      }
                    }}
                  >
                    {labels.delete}
                  </button>
                </>
              )}
            />

            <div className={styles.form}>
              <EntityForm
                entity={entity}
                draft={currentDraft}
                translate={t}
                onChange={(fieldKey, value) => setDraftValue(entity.key, fieldKey, value)}
              />
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (currentEditId) {
                        updateEcommerceSuiteLocalRecord({
                          moduleSlug,
                          entityKey: entity.key,
                          recordId: currentEditId,
                          data: currentDraft,
                        });
                        setEditing((current) => ({ ...current, [entity.key]: null }));
                        setMessage(`${labels.updatedLocalRecord}: ${currentEditId}`);
                        loadSnapshot();
                      } else {
                        createEcommerceSuiteLocalRecord({ moduleSlug, entityKey: entity.key, data: currentDraft });
                        setMessage(`${labels.createdLocalRecord}: ${t(entity.label)}`);
                        loadSnapshot();
                      }
                    } catch (nextError) {
                      setError(nextError instanceof Error ? nextError.message : String(nextError));
                    }
                  }}
                >
                  {currentEditId ? labels.update : labels.create}
                </button>
                {currentEditId ? (
                  <button type="button" onClick={() => setEditing((current) => ({ ...current, [entity.key]: null }))}>
                    {labels.cancel}
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}

      <h2 id="ecommerce-suite-actions">{labels.workflowActions}</h2>
      {snapshot.module.actions.map((action) => (
        <section key={action.key} className={styles.block}>
          <h3>{t(action.label)}</h3>
          <p>{t(action.description)}</p>
          <div className={styles.form}>
            {action.inputs.map((input) => (
              <label key={`${action.key}-${input.key}`}>
                <span>{t(input.label)}</span>
                <input
                  type={input.type === "number" ? "number" : "text"}
                  value={actionDrafts[action.key]?.[input.key] ?? ""}
                  onChange={(event) => setActionDraftValue(action.key, input.key, event.target.value)}
                />
              </label>
            ))}
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => {
                  try {
                    const result = runEcommerceSuiteLocalAction({
                      moduleSlug,
                      actionKey: action.key,
                      input: actionDrafts[action.key] ?? {},
                    });
                    setMessage(result.message);
                    loadSnapshot();
                  } catch (nextError) {
                    setError(nextError instanceof Error ? nextError.message : String(nextError));
                  }
                }}
              >
                {labels.runAction}
              </button>
            </div>
          </div>
        </section>
      ))}

      <h2 id="ecommerce-suite-events">{labels.eventLog}</h2>
      {snapshot.events.length === 0 ? <p>{labels.noEvents}</p> : null}
      {snapshot.events.length > 0 ? (
        <ul className={styles.events}>
          {snapshot.events.map((event) => {
            const actionLabel = snapshot.module.actions.find((action) => action.key === event.actionKey)?.label;
            return (
              <li key={event.id}>
                <strong>{localizeEventType(event.type)}</strong>{" "}
                {event.actionKey ? `(${t(actionLabel ?? event.actionKey)}) ` : ""}
                {localizeLooseText(event.message)}
                <span>{event.createdAt}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function EntityForm({
  entity,
  draft,
  translate,
  onChange,
}: {
  entity: Snapshot["module"]["entities"][number];
  draft: Record<string, string | number | boolean>;
  translate: TranslateFn;
  onChange: (fieldKey: string, value: string | number | boolean) => void;
}) {
  return (
    <>
      {entity.fields
        .filter((field) => field.key !== "id" && field.editable !== false)
        .map((field) => (
          <label key={`${entity.key}-${field.key}`}>
            <span>{translate(field.label)}</span>
            {field.type === "boolean" ? (
              <input
                type="checkbox"
                checked={Boolean(draft[field.key])}
                onChange={(event) => onChange(field.key, event.target.checked)}
              />
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                value={String(draft[field.key] ?? "")}
                onChange={(event) =>
                  onChange(field.key, field.type === "number" ? Number(event.target.value || 0) : event.target.value)
                }
              />
            )}
          </label>
        ))}
    </>
  );
}

function DataTable({
  rows,
  noRowsLabel,
  translate,
  actionsHeaderLabel,
  actions,
}: {
  rows: Array<Record<string, unknown>>;
  noRowsLabel: string;
  translate?: TranslateFn;
  actionsHeaderLabel?: string;
  actions?: (row: Record<string, unknown>) => ReactNode;
}) {
  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
    const ordered = Array.from(keys).sort((a, b) => (a === "id" ? -1 : b === "id" ? 1 : a.localeCompare(b)));
    return ordered.slice(0, 8);
  }, [rows]);

  if (rows.length === 0) return <p>{noRowsLabel}</p>;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{translate ? translate(humanizeKey(column)) : column}</th>
            ))}
            {actions ? <th>{actionsHeaderLabel ?? "actions"}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.id ?? JSON.stringify(row))}>
              {columns.map((column) => (
                <td key={`${String(row.id ?? "row")}-${column}`}>{String(row[column] ?? "")}</td>
              ))}
              {actions ? <td className={styles.rowActions}>{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
