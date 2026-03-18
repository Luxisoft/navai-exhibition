import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import initSqlJs from "sql.js";

import { resolveProjectRoot } from "./project-root";

type SqlJsDatabase = any;
type JsonRecord = Record<string, unknown>;

export type NavaiPanelRouteRecord = {
  id: string;
  label: string;
  url: string;
  description: string;
  openInNewTab: boolean;
};

export type NavaiPanelFunctionRecord = {
  id: string;
  name: string;
  label: string;
  description: string;
  code: string;
};

export type NavaiPanelParameterRecord = {
  id: string;
  key: string;
  value: string;
  description: string;
};

export type NavaiPanelDomainRecord = {
  id: string;
  userId: string;
  domain: string;
  label: string;
  description: string;
  functions: NavaiPanelFunctionRecord[];
  routes: NavaiPanelRouteRecord[];
  parameters: NavaiPanelParameterRecord[];
  createdAt: string;
  updatedAt: string;
};

export type NavaiPanelDomainInput = {
  domain?: unknown;
  label?: unknown;
  description?: unknown;
  functions?: unknown;
  routes?: unknown;
  parameters?: unknown;
};

type NavaiPanelSqliteState = {
  db: SqlJsDatabase;
  filePath: string;
};

let sqliteStatePromise: Promise<NavaiPanelSqliteState> | null = null;
let sqliteMutationQueue = Promise.resolve();

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDomain(value: unknown) {
  const normalized = normalizeString(value).toLowerCase();
  return normalized.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }

  return false;
}

function ensureJsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function ensureJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function parseJsonArray(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonRecord(value: unknown) {
  if (typeof value !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return ensureJsonRecord(parsed);
  } catch {
    return {};
  }
}

function slugifyIdentifier(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "item";
}

function resolveItemId(prefix: string, index: number, providedId: unknown, fallbackValue: string) {
  const normalizedId = normalizeString(providedId);
  if (normalizedId) {
    return normalizedId;
  }

  return `${prefix}-${index + 1}-${slugifyIdentifier(fallbackValue)}`;
}

function normalizeRouteItem(value: unknown, index: number): NavaiPanelRouteRecord | null {
  if (typeof value === "string") {
    const url = normalizeString(value);
    if (!url) {
      return null;
    }

    return {
      id: resolveItemId("route", index, "", url),
      label: url,
      url,
      description: "",
      openInNewTab: false,
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const url = normalizeString(record.url ?? record.path ?? record.href);
  if (!url) {
    return null;
  }

  const label = normalizeString(record.label ?? record.name) || url;
  return {
    id: resolveItemId("route", index, record.id, url),
    label,
    url,
    description: normalizeString(record.description ?? record.summary),
    openInNewTab: normalizeBoolean(record.openInNewTab ?? record.newTab),
  };
}

function normalizeFunctionName(value: unknown, index: number) {
  const normalized = normalizeString(value)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  return normalized || `function_${index + 1}`;
}

function normalizeFunctionItem(value: unknown, index: number): NavaiPanelFunctionRecord | null {
  if (typeof value === "string") {
    const code = value.trim();
    if (!code) {
      return null;
    }

    const generatedName = normalizeFunctionName("", index);
    return {
      id: resolveItemId("function", index, "", generatedName),
      name: generatedName,
      label: generatedName,
      description: "",
      code,
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = normalizeFunctionName(record.name ?? record.functionName, index);
  return {
    id: resolveItemId("function", index, record.id, name),
    name,
    label: normalizeString(record.label ?? record.title) || name,
    description: normalizeString(record.description ?? record.summary),
    code: normalizeString(record.code ?? record.source ?? record.body),
  };
}

function normalizeParameterItem(value: unknown, index: number): NavaiPanelParameterRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const key = normalizeString(record.key ?? record.name);
  if (!key) {
    return null;
  }

  return {
    id: resolveItemId("parameter", index, record.id, key),
    key,
    value: normalizeString(record.value),
    description: normalizeString(record.description ?? record.summary),
  };
}

function normalizeRoutes(value: unknown) {
  return ensureJsonArray(value)
    .map((item, index) => normalizeRouteItem(item, index))
    .filter((item): item is NavaiPanelRouteRecord => Boolean(item));
}

function normalizeFunctions(value: unknown) {
  return ensureJsonArray(value)
    .map((item, index) => normalizeFunctionItem(item, index))
    .filter((item): item is NavaiPanelFunctionRecord => Boolean(item));
}

function metadataEntryToParameter(
  entryKey: string,
  entryValue: unknown,
  index: number
): NavaiPanelParameterRecord | null {
  const key = normalizeString(entryKey);
  if (!key) {
    return null;
  }

  if (entryValue && typeof entryValue === "object" && !Array.isArray(entryValue)) {
    const record = entryValue as Record<string, unknown>;
    return {
      id: resolveItemId("parameter", index, record.id, key),
      key,
      value: normalizeString(record.value),
      description: normalizeString(record.description ?? record.summary),
    };
  }

  return {
    id: resolveItemId("parameter", index, "", key),
    key,
    value: normalizeString(entryValue),
    description: "",
  };
}

function normalizeParameters(value: unknown, fallbackMetadata?: JsonRecord) {
  const sourceItems = Array.isArray(value)
    ? value
    : fallbackMetadata
      ? Object.entries(fallbackMetadata).map(([key, entryValue]) => ({ key, value: entryValue }))
      : [];

  return sourceItems
    .map((item, index) => {
      if (
        !Array.isArray(value) &&
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        "key" in item &&
        "value" in item
      ) {
        const record = item as Record<string, unknown>;
        return metadataEntryToParameter(
          normalizeString(record.key),
          record.value,
          index
        );
      }

      return normalizeParameterItem(item, index);
    })
    .filter((item): item is NavaiPanelParameterRecord => Boolean(item));
}

function serializeParametersToMetadata(parameters: NavaiPanelParameterRecord[]) {
  return parameters.reduce<JsonRecord>((result, parameter) => {
    result[parameter.key] = parameter.description
      ? {
          value: parameter.value,
          description: parameter.description,
        }
      : parameter.value;
    return result;
  }, {});
}

function readStatementRows(db: SqlJsDatabase, sql: string, params: unknown[] = []) {
  const statement = db.prepare(sql);
  if (params.length > 0) {
    statement.bind(params);
  }

  const rows: Array<Record<string, unknown>> = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
}

function readFirstRow(db: SqlJsDatabase, sql: string, params: unknown[] = []) {
  return readStatementRows(db, sql, params)[0] ?? null;
}

function mapDomainRow(row: Record<string, unknown>): NavaiPanelDomainRecord {
  const parsedMetadata = parseJsonRecord(row.metadata_json);
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    domain: String(row.domain ?? ""),
    label: String(row.label ?? ""),
    description: String(row.description ?? ""),
    functions: normalizeFunctions(parseJsonArray(row.functions_json)),
    routes: normalizeRoutes(parseJsonArray(row.routes_json)),
    parameters: normalizeParameters(undefined, parsedMetadata),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function validateDomainInput(input: NavaiPanelDomainInput) {
  const domain = normalizeDomain(input.domain);
  if (!domain) {
    throw new Error("Domain is required.");
  }

  return {
    domain,
    label: normalizeString(input.label),
    description: normalizeString(input.description),
    functions: normalizeFunctions(input.functions),
    routes: normalizeRoutes(input.routes),
    parameters: normalizeParameters(input.parameters),
  };
}

async function resolvePanelSqliteFilePath() {
  const projectRoot = resolveProjectRoot();
  const directory = path.join(projectRoot, "backend", ".data");
  await fs.mkdir(directory, { recursive: true });
  return path.join(directory, "navai-panel.sqlite");
}

async function createNavaiPanelSqliteState(): Promise<NavaiPanelSqliteState> {
  const projectRoot = resolveProjectRoot();
  const filePath = await resolvePanelSqliteFilePath();
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(projectRoot, "node_modules", "sql.js", "dist", file),
  });

  let db: SqlJsDatabase;
  try {
    const fileBuffer = await fs.readFile(filePath);
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } catch {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS navai_domains (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      functions_json TEXT NOT NULL DEFAULT '[]',
      routes_json TEXT NOT NULL DEFAULT '[]',
      synonyms_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const tableInfo = readStatementRows(db, "PRAGMA table_info(navai_domains)");
  const hasUserIdColumn = tableInfo.some((column) => String(column.name ?? "") === "user_id");
  if (!hasUserIdColumn) {
    db.run("ALTER TABLE navai_domains RENAME TO navai_domains_legacy");
    db.run(`
      CREATE TABLE navai_domains (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        functions_json TEXT NOT NULL DEFAULT '[]',
        routes_json TEXT NOT NULL DEFAULT '[]',
        synonyms_json TEXT NOT NULL DEFAULT '[]',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.run(`
      INSERT INTO navai_domains (
        id,
        user_id,
        domain,
        label,
        description,
        functions_json,
        routes_json,
        synonyms_json,
        metadata_json,
        created_at,
        updated_at
      )
      SELECT
        id,
        '__legacy_unassigned__',
        domain,
        label,
        description,
        functions_json,
        routes_json,
        synonyms_json,
        metadata_json,
        created_at,
        updated_at
      FROM navai_domains_legacy
    `);
    db.run("DROP TABLE navai_domains_legacy");
  }

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_navai_domains_domain
      ON navai_domains(domain);

    CREATE INDEX IF NOT EXISTS idx_navai_domains_user_id
      ON navai_domains(user_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_navai_domains_user_domain
      ON navai_domains(user_id, domain);
  `);

  return { db, filePath };
}

async function getNavaiPanelSqliteState() {
  if (!sqliteStatePromise) {
    sqliteStatePromise = createNavaiPanelSqliteState().catch((error) => {
      sqliteStatePromise = null;
      throw error;
    });
  }

  return sqliteStatePromise;
}

async function persistNavaiPanelSqlite(state: NavaiPanelSqliteState) {
  await fs.mkdir(path.dirname(state.filePath), { recursive: true });
  const exported = state.db.export();
  await fs.writeFile(state.filePath, Buffer.from(exported));
}

async function runSerializedMutation<T>(mutation: (db: SqlJsDatabase) => T | Promise<T>) {
  const state = await getNavaiPanelSqliteState();
  let result!: T;

  const nextMutation = sqliteMutationQueue.then(async () => {
    result = await mutation(state.db);
    await persistNavaiPanelSqlite(state);
  });

  sqliteMutationQueue = nextMutation.catch(() => undefined);
  await nextMutation;
  return result;
}

export async function listNavaiPanelDomains(userId: string) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    throw new Error("Authentication required.");
  }

  const { db } = await getNavaiPanelSqliteState();
  const rows = readStatementRows(
    db,
    `
      SELECT
        id,
        user_id,
        domain,
        label,
        description,
        functions_json,
        routes_json,
        synonyms_json,
        metadata_json,
        created_at,
        updated_at
      FROM navai_domains
      WHERE user_id = ?
      ORDER BY domain ASC
    `,
    [normalizedUserId]
  );

  return rows.map(mapDomainRow);
}

export async function getNavaiPanelDomainById(userId: string, id: string) {
  const normalizedUserId = normalizeString(userId);
  const normalizedId = normalizeString(id);
  if (!normalizedUserId) {
    throw new Error("Authentication required.");
  }

  if (!normalizedId) {
    return null;
  }

  const { db } = await getNavaiPanelSqliteState();
  const row = readFirstRow(
    db,
    `
      SELECT
        id,
        user_id,
        domain,
        label,
        description,
        functions_json,
        routes_json,
        synonyms_json,
        metadata_json,
        created_at,
        updated_at
      FROM navai_domains
      WHERE user_id = ? AND id = ?
    `,
    [normalizedUserId, normalizedId]
  );

  return row ? mapDomainRow(row) : null;
}

export async function createNavaiPanelDomain(userId: string, input: NavaiPanelDomainInput) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    throw new Error("Authentication required.");
  }

  const normalizedInput = validateDomainInput(input);

  return runSerializedMutation(async (db) => {
    const existingRow = readFirstRow(
      db,
      "SELECT id FROM navai_domains WHERE user_id = ? AND domain = ?",
      [normalizedUserId, normalizedInput.domain]
    );
    if (existingRow) {
      throw new Error("A domain with that host already exists.");
    }

    const timestamp = new Date().toISOString();
    const id = randomUUID();
    db.run(
      `
        INSERT INTO navai_domains (
          id,
          user_id,
          domain,
          label,
          description,
          functions_json,
          routes_json,
          synonyms_json,
          metadata_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        normalizedUserId,
        normalizedInput.domain,
        normalizedInput.label,
        normalizedInput.description,
        JSON.stringify(normalizedInput.functions),
        JSON.stringify(normalizedInput.routes),
        JSON.stringify([]),
        JSON.stringify(serializeParametersToMetadata(normalizedInput.parameters)),
        timestamp,
        timestamp,
      ]
    );

    const created = await getNavaiPanelDomainById(normalizedUserId, id);
    if (!created) {
      throw new Error("Domain was created but could not be loaded.");
    }

    return created;
  });
}

export async function updateNavaiPanelDomain(userId: string, id: string, input: NavaiPanelDomainInput) {
  const normalizedUserId = normalizeString(userId);
  const normalizedId = normalizeString(id);
  if (!normalizedUserId) {
    throw new Error("Authentication required.");
  }

  if (!normalizedId) {
    throw new Error("Domain id is required.");
  }

  const normalizedInput = validateDomainInput(input);

  return runSerializedMutation(async (db) => {
    const currentRow = readFirstRow(
      db,
      "SELECT id FROM navai_domains WHERE user_id = ? AND id = ?",
      [normalizedUserId, normalizedId]
    );
    if (!currentRow) {
      throw new Error("Domain not found.");
    }

    const duplicateRow = readFirstRow(
      db,
      "SELECT id FROM navai_domains WHERE user_id = ? AND domain = ? AND id <> ?",
      [normalizedUserId, normalizedInput.domain, normalizedId]
    );
    if (duplicateRow) {
      throw new Error("A domain with that host already exists.");
    }

    db.run(
      `
        UPDATE navai_domains
        SET
          domain = ?,
          label = ?,
          description = ?,
          functions_json = ?,
          routes_json = ?,
          synonyms_json = ?,
          metadata_json = ?,
          updated_at = ?
        WHERE user_id = ? AND id = ?
      `,
      [
        normalizedInput.domain,
        normalizedInput.label,
        normalizedInput.description,
        JSON.stringify(normalizedInput.functions),
        JSON.stringify(normalizedInput.routes),
        JSON.stringify([]),
        JSON.stringify(serializeParametersToMetadata(normalizedInput.parameters)),
        new Date().toISOString(),
        normalizedUserId,
        normalizedId,
      ]
    );

    const updated = await getNavaiPanelDomainById(normalizedUserId, normalizedId);
    if (!updated) {
      throw new Error("Domain was updated but could not be loaded.");
    }

    return updated;
  });
}

export async function deleteNavaiPanelDomain(userId: string, id: string) {
  const normalizedUserId = normalizeString(userId);
  const normalizedId = normalizeString(id);
  if (!normalizedUserId) {
    throw new Error("Authentication required.");
  }

  if (!normalizedId) {
    throw new Error("Domain id is required.");
  }

  return runSerializedMutation((db) => {
    const currentRow = readFirstRow(
      db,
      "SELECT id FROM navai_domains WHERE user_id = ? AND id = ?",
      [normalizedUserId, normalizedId]
    );
    if (!currentRow) {
      throw new Error("Domain not found.");
    }

    db.run("DELETE FROM navai_domains WHERE user_id = ? AND id = ?", [normalizedUserId, normalizedId]);
    return { id: normalizedId };
  });
}
