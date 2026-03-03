import path from "node:path";

import initSqlJs from "sql.js";

import {
  type EcommerceSuiteModuleSlug,
  type EcommerceSuiteSeedRow,
  type EcommerceSuiteSeedValue,
  ECOMMERCE_SUITE_MODULE_CATALOG,
} from "./ecommerce-suite-catalog";
import { resolveProjectRoot } from "./project-root";

type Audience = "consumer" | "admin";
type SqlPrimitive = string | number | null;
type SqlColumnType = "TEXT" | "INTEGER" | "REAL";

type EntitySqlColumn = {
  key: string;
  sqlType: SqlColumnType;
};

type EntitySqlTableMeta = {
  moduleSlug: EcommerceSuiteModuleSlug;
  entityKey: string;
  tableName: string;
  columns: EntitySqlColumn[];
  rowCount: number;
};

type SuiteSqliteState = {
  db: any;
  builtAt: string;
  entityTables: Map<string, EntitySqlTableMeta>;
};

type SqliteCatalogSnapshotOptions = {
  audience?: Audience;
  moduleSlug?: string;
  sampleRowsPerEntity?: number;
};

type SqliteEntityRowsOptions = {
  moduleSlug: string;
  entityKey: string;
  limit?: number;
};

let suiteSqliteStatePromise: Promise<SuiteSqliteState> | null = null;

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}

function makeSqlIdentifier(value: string) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "x";
}

function tableNameForEntity(moduleSlug: string, entityKey: string) {
  const modulePart = makeSqlIdentifier(moduleSlug.replace(/^ecommerce\//, ""));
  const entityPart = makeSqlIdentifier(entityKey);
  let tableName = `esuite_${modulePart}_${entityPart}`;
  if (tableName.length > 120) {
    tableName = `esuite_${modulePart.slice(0, 50)}_${entityPart.slice(0, 40)}`;
  }
  return tableName;
}

function entityMapKey(moduleSlug: string, entityKey: string) {
  return `${moduleSlug}::${entityKey}`;
}

function inferSqlColumnType(values: EcommerceSuiteSeedValue[]): SqlColumnType {
  let sawText = false;
  let sawReal = false;
  let sawIntegerLike = false;

  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "boolean") {
      sawIntegerLike = true;
      continue;
    }
    if (typeof value === "number") {
      if (Number.isInteger(value)) {
        sawIntegerLike = true;
      } else {
        sawReal = true;
      }
      continue;
    }
    sawText = true;
  }

  if (sawText) return "TEXT";
  if (sawReal) return "REAL";
  if (sawIntegerLike) return "INTEGER";
  return "TEXT";
}

function inferEntityColumns(rows: EcommerceSuiteSeedRow[]): EntitySqlColumn[] {
  const keys = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((key) => keys.add(key));
  }
  if (!keys.has("id")) keys.add("id");

  const orderedKeys = [...keys].sort((a, b) => {
    if (a === "id") return -1;
    if (b === "id") return 1;
    return a.localeCompare(b);
  });

  return orderedKeys.map((key) => {
    const values = rows.map((row) => row[key] ?? null);
    const sqlType = key === "id" ? "TEXT" : inferSqlColumnType(values);
    return { key, sqlType };
  });
}

function toSqlValue(value: EcommerceSuiteSeedValue, sqlType: SqlColumnType): SqlPrimitive {
  if (value == null) return null;
  if (sqlType === "INTEGER") {
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "number") return Math.trunc(value);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  if (sqlType === "REAL") {
    if (typeof value === "number") return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function rowToInsertValues(row: EcommerceSuiteSeedRow, columns: EntitySqlColumn[]): SqlPrimitive[] {
  return columns.map((column) => toSqlValue((row[column.key] ?? null) as EcommerceSuiteSeedValue, column.sqlType));
}

function execRows(db: any, sql: string, params: SqlPrimitive[] = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const rows: Array<Record<string, unknown>> = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function execFirstRow(db: any, sql: string, params: SqlPrimitive[] = []) {
  return execRows(db, sql, params)[0] ?? null;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function createSuiteSqliteState(): Promise<SuiteSqliteState> {
  const projectRoot = resolveProjectRoot();
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(projectRoot, "node_modules", "sql.js", "dist", file),
  });
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE ecommerce_suite_modules (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      audiences_json TEXT NOT NULL,
      legacy_store_demo INTEGER NOT NULL DEFAULT 0,
      entity_count INTEGER NOT NULL,
      action_count INTEGER NOT NULL,
      total_seed_rows INTEGER NOT NULL
    );

    CREATE TABLE ecommerce_suite_entities (
      module_slug TEXT NOT NULL,
      entity_key TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      id_prefix TEXT NOT NULL,
      table_name TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      columns_json TEXT NOT NULL,
      PRIMARY KEY (module_slug, entity_key)
    );

    CREATE TABLE ecommerce_suite_actions (
      module_slug TEXT NOT NULL,
      action_key TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      entity_key TEXT,
      input_keys_json TEXT NOT NULL,
      PRIMARY KEY (module_slug, action_key)
    );

    CREATE INDEX idx_esuite_entities_module ON ecommerce_suite_entities(module_slug);
    CREATE INDEX idx_esuite_actions_module ON ecommerce_suite_actions(module_slug);
  `);

  const insertModuleStmt = db.prepare(`
    INSERT INTO ecommerce_suite_modules
      (slug, title, description, audiences_json, legacy_store_demo, entity_count, action_count, total_seed_rows)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEntityStmt = db.prepare(`
    INSERT INTO ecommerce_suite_entities
      (module_slug, entity_key, label, description, id_prefix, table_name, row_count, columns_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertActionStmt = db.prepare(`
    INSERT INTO ecommerce_suite_actions
      (module_slug, action_key, label, description, entity_key, input_keys_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const entityTables = new Map<string, EntitySqlTableMeta>();

  for (const moduleDef of ECOMMERCE_SUITE_MODULE_CATALOG) {
    const totalSeedRows = moduleDef.entities.reduce((sum, entity) => sum + entity.rows.length, 0);
    insertModuleStmt.run([
      moduleDef.slug,
      moduleDef.title,
      moduleDef.description,
      JSON.stringify(moduleDef.audiences),
      moduleDef.legacyStoreDemo ? 1 : 0,
      moduleDef.entities.length,
      moduleDef.actions.length,
      totalSeedRows,
    ]);

    for (const action of moduleDef.actions) {
      insertActionStmt.run([
        moduleDef.slug,
        action.key,
        action.label,
        action.description,
        action.entityKey ?? null,
        JSON.stringify(action.inputKeys ?? []),
      ]);
    }

    for (const entity of moduleDef.entities) {
      const columns = inferEntityColumns(entity.rows);
      const tableName = tableNameForEntity(moduleDef.slug, entity.key);
      const columnSql = columns
        .map((column) =>
          `${quoteIdentifier(column.key)} ${column.sqlType}${column.key === "id" ? " PRIMARY KEY" : ""}`
        )
        .join(", ");

      db.run(`CREATE TABLE ${quoteIdentifier(tableName)} (${columnSql});`);

      const insertColumnsSql = columns.map((column) => quoteIdentifier(column.key)).join(", ");
      const insertPlaceholdersSql = columns.map(() => "?").join(", ");
      const insertRowStmt = db.prepare(
        `INSERT INTO ${quoteIdentifier(tableName)} (${insertColumnsSql}) VALUES (${insertPlaceholdersSql})`
      );
      for (const row of entity.rows) {
        insertRowStmt.run(rowToInsertValues(row, columns));
      }
      insertRowStmt.free();

      insertEntityStmt.run([
        moduleDef.slug,
        entity.key,
        entity.label,
        entity.description,
        entity.idPrefix,
        tableName,
        entity.rows.length,
        JSON.stringify(columns),
      ]);

      entityTables.set(entityMapKey(moduleDef.slug, entity.key), {
        moduleSlug: moduleDef.slug,
        entityKey: entity.key,
        tableName,
        columns,
        rowCount: entity.rows.length,
      });
    }
  }

  insertModuleStmt.free();
  insertEntityStmt.free();
  insertActionStmt.free();

  return {
    db,
    builtAt: new Date().toISOString(),
    entityTables,
  };
}

async function getSuiteSqliteState() {
  if (!suiteSqliteStatePromise) {
    suiteSqliteStatePromise = createSuiteSqliteState().catch((error) => {
      suiteSqliteStatePromise = null;
      throw error;
    });
  }
  return suiteSqliteStatePromise;
}

function moduleWhereClauses(options: { audience?: Audience; moduleSlug?: string }) {
  const clauses: string[] = [];
  const params: SqlPrimitive[] = [];
  if (options.moduleSlug) {
    clauses.push("slug = ?");
    params.push(options.moduleSlug);
  }
  if (options.audience) {
    clauses.push("audiences_json LIKE ?");
    params.push(`%\"${options.audience}\"%`);
  }
  return { clauses, params };
}

export async function listEcommerceSuiteSqliteTables(options: { audience?: Audience; moduleSlug?: string } = {}) {
  const { db } = await getSuiteSqliteState();
  const { clauses, params } = moduleWhereClauses(options);
  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const modules = execRows(
    db,
    `SELECT slug, title, description, audiences_json, entity_count, action_count, total_seed_rows
     FROM ecommerce_suite_modules
     ${whereSql}
     ORDER BY slug ASC`,
    params
  );

  const items = modules.map((moduleRow) => {
    const moduleSlug = String(moduleRow.slug ?? "");
    const entities = execRows(
      db,
      `SELECT entity_key, label, description, table_name, row_count, columns_json
       FROM ecommerce_suite_entities
       WHERE module_slug = ?
       ORDER BY entity_key ASC`,
      [moduleSlug]
    ).map((entityRow) => ({
      entityKey: String(entityRow.entity_key ?? ""),
      label: String(entityRow.label ?? ""),
      description: String(entityRow.description ?? ""),
      tableName: String(entityRow.table_name ?? ""),
      rowCount: Number(entityRow.row_count ?? 0),
      columns: parseJson<Array<{ key: string; sqlType: SqlColumnType }>>(entityRow.columns_json, []),
    }));

    return {
      slug: moduleSlug,
      title: String(moduleRow.title ?? ""),
      description: String(moduleRow.description ?? ""),
      audiences: parseJson<Audience[]>(moduleRow.audiences_json, []),
      entityCount: Number(moduleRow.entity_count ?? entities.length),
      actionCount: Number(moduleRow.action_count ?? 0),
      totalSeedRows: Number(moduleRow.total_seed_rows ?? 0),
      entities,
    };
  });

  return {
    ok: true,
    engine: "sql.js/sqlite",
    builtAt: (await getSuiteSqliteState()).builtAt,
    moduleCount: items.length,
    items,
  };
}

export async function getEcommerceSuiteSqliteEntityRows(options: SqliteEntityRowsOptions) {
  const { db, entityTables } = await getSuiteSqliteState();
  const key = entityMapKey(options.moduleSlug, options.entityKey);
  const meta = entityTables.get(key);
  if (!meta) {
    throw new Error(`Unknown SQLite entity '${options.entityKey}' for module '${options.moduleSlug}'.`);
  }

  const limit = Number.isFinite(Number(options.limit)) ? Math.max(1, Math.min(500, Math.floor(Number(options.limit)))) : 50;
  const rows = execRows(
    db,
    `SELECT * FROM ${quoteIdentifier(meta.tableName)} ORDER BY ${quoteIdentifier("id")} ASC LIMIT ?`,
    [limit]
  );

  return {
    ok: true,
    moduleSlug: options.moduleSlug,
    entityKey: options.entityKey,
    tableName: meta.tableName,
    rowCount: meta.rowCount,
    limit,
    rows,
  };
}

export async function getEcommerceSuiteSqliteCatalogSnapshot(options: SqliteCatalogSnapshotOptions = {}) {
  const sampleRowsPerEntity = Number.isFinite(Number(options.sampleRowsPerEntity))
    ? Math.max(0, Math.min(20, Math.floor(Number(options.sampleRowsPerEntity))))
    : 2;
  const tables = await listEcommerceSuiteSqliteTables({
    audience: options.audience,
    moduleSlug: options.moduleSlug,
  });

  const items = await Promise.all(
    tables.items.map(async (moduleItem) => {
      const actions = execRows(
        (await getSuiteSqliteState()).db,
        `SELECT action_key, label, description, entity_key, input_keys_json
         FROM ecommerce_suite_actions
         WHERE module_slug = ?
         ORDER BY action_key ASC`,
        [moduleItem.slug]
      ).map((row) => ({
        key: String(row.action_key ?? ""),
        label: String(row.label ?? ""),
        description: String(row.description ?? ""),
        entityKey: row.entity_key == null ? null : String(row.entity_key),
        inputKeys: parseJson<string[]>(row.input_keys_json, []),
      }));

      const entities = await Promise.all(
        moduleItem.entities.map(async (entity) => {
          const samples =
            sampleRowsPerEntity > 0
              ? (
                  await getEcommerceSuiteSqliteEntityRows({
                    moduleSlug: moduleItem.slug,
                    entityKey: entity.entityKey,
                    limit: sampleRowsPerEntity,
                  })
                ).rows
              : [];
          return {
            ...entity,
            sampleRows: samples,
          };
        })
      );

      return {
        ...moduleItem,
        actions,
        entities,
      };
    })
  );

  return {
    ok: true,
    engine: "sql.js/sqlite",
    builtAt: tables.builtAt,
    moduleCount: items.length,
    items,
  };
}

export async function getEcommerceSuiteSqliteOverview(options: { audience?: Audience } = {}) {
  const snapshot = await getEcommerceSuiteSqliteCatalogSnapshot({
    audience: options.audience,
    sampleRowsPerEntity: 0,
  });
  const totals = snapshot.items.reduce(
    (acc, item) => {
      acc.modules += 1;
      acc.entities += item.entityCount;
      acc.actions += item.actionCount;
      acc.seedRows += item.totalSeedRows;
      return acc;
    },
    { modules: 0, entities: 0, actions: 0, seedRows: 0 }
  );

  return {
    ok: true,
    engine: "sql.js/sqlite",
    builtAt: snapshot.builtAt,
    audience: options.audience ?? null,
    totals,
    topModulesBySeedRows: [...snapshot.items]
      .sort((a, b) => b.totalSeedRows - a.totalSeedRows)
      .slice(0, 8)
      .map((item) => ({
        slug: item.slug,
        title: item.title,
        totalSeedRows: item.totalSeedRows,
        entityCount: item.entityCount,
        actionCount: item.actionCount,
      })),
  };
}

export async function getEcommerceSuiteSqliteMeta() {
  const state = await getSuiteSqliteState();
  const db = state.db;
  const moduleRow = execFirstRow(db, "SELECT COUNT(*) AS count FROM ecommerce_suite_modules");
  const entityRow = execFirstRow(db, "SELECT COUNT(*) AS count FROM ecommerce_suite_entities");
  const actionRow = execFirstRow(db, "SELECT COUNT(*) AS count FROM ecommerce_suite_actions");
  const sqliteTables = execRows(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
  ).map((row) => String(row.name ?? ""));

  return {
    ok: true,
    engine: "sql.js/sqlite",
    builtAt: state.builtAt,
    registry: {
      modules: Number(moduleRow?.count ?? 0),
      entities: Number(entityRow?.count ?? 0),
      actions: Number(actionRow?.count ?? 0),
    },
    sqliteTableCount: sqliteTables.length,
    sqliteTables,
  };
}
