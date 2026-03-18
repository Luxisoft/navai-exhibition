import {
  getEcommerceSuiteSqliteCatalogSnapshot,
  getEcommerceSuiteSqliteEntityRows,
  getEcommerceSuiteSqliteMeta,
  getEcommerceSuiteSqliteOverview,
  listEcommerceSuiteSqliteTables,
} from "../../../lib/ecommerce-suite-sqlite.ts";

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toPayloadObject(payload) {
  return isRecord(payload) ? payload : {};
}

function getAudience(input) {
  return input.audience === "consumer" || input.audience === "admin" ? input.audience : undefined;
}

function toPositiveInt(value, fallback, min = 1, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export async function getEcommerceDemoSeedSnapshot(payload) {
  const input = toPayloadObject(payload);
  const audience = getAudience(input);
  const moduleSlug = typeof input.moduleSlug === "string" ? input.moduleSlug.trim() : "";
  const sampleRowsPerEntity = toPositiveInt(input.sampleRowsPerEntity, moduleSlug ? 5 : 1, 0, 20);

  const sqliteMeta = await getEcommerceSuiteSqliteMeta();

  if (moduleSlug) {
    const snapshot = await getEcommerceSuiteSqliteCatalogSnapshot({
      moduleSlug,
      audience,
      sampleRowsPerEntity,
    });
    const moduleItem = snapshot.items[0];
    if (!moduleItem) {
      return { ok: false, error: `Unknown ecommerce module '${moduleSlug}'.` };
    }

    return {
      ok: true,
      type: "ecommerce-suite-module-seed",
      generatedAt: new Date().toISOString(),
      engine: "sqlite",
      sqliteMeta,
      module: moduleItem,
      safety: {
        seedReadOnly: true,
        localWorkspaceStorage: "localStorage (frontend/browser)",
      },
    };
  }

  const snapshot = await getEcommerceSuiteSqliteCatalogSnapshot({
    audience,
    sampleRowsPerEntity,
  });
  const groupedByAudience = ["consumer", "admin"].map((role) => ({
    audience: role,
    modules: snapshot.items.filter((moduleItem) => moduleItem.audiences.includes(role)),
  }));
  const filteredAudienceGroups = audience ? groupedByAudience.filter((item) => item.audience === audience) : groupedByAudience;

  const audiences = filteredAudienceGroups.map((group) => ({
    audience: group.audience,
    moduleCount: group.modules.length,
    entityCount: group.modules.reduce((sum, moduleItem) => sum + moduleItem.entityCount, 0),
    actionCount: group.modules.reduce((sum, moduleItem) => sum + moduleItem.actionCount, 0),
    totalSeedRows: group.modules.reduce((sum, moduleItem) => sum + moduleItem.totalSeedRows, 0),
    modules: group.modules,
  }));

  return {
    ok: true,
    type: "ecommerce-suite-catalog-seed",
    generatedAt: new Date().toISOString(),
    engine: "sqlite",
    sqliteMeta,
    totals: snapshot.items.reduce(
      (acc, moduleItem) => {
        acc.moduleCount += 1;
        acc.entityCount += moduleItem.entityCount;
        acc.actionCount += moduleItem.actionCount;
        acc.totalSeedRows += moduleItem.totalSeedRows;
        return acc;
      },
      { moduleCount: 0, entityCount: 0, actionCount: 0, totalSeedRows: 0 }
    ),
    audiences,
    safety: {
      seedReadOnly: true,
      seedMutationAllowed: false,
      notes: [
        "Seed datasets are stored in a SQLite database (sql.js) built from the ecommerce suite catalog.",
        "Interactive CRUD/actions remain isolated in frontend localStorage workspaces.",
      ],
    },
  };
}

export async function getEcommerceDemoOverviewReport(payload) {
  const input = toPayloadObject(payload);
  const audience = getAudience(input);

  if (audience) {
    const overview = await getEcommerceSuiteSqliteOverview({ audience });
    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      engine: "sqlite",
      overview: [overview],
    };
  }

  const [consumer, admin] = await Promise.all([
    getEcommerceSuiteSqliteOverview({ audience: "consumer" }),
    getEcommerceSuiteSqliteOverview({ audience: "admin" }),
  ]);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    engine: "sqlite",
    overview: [consumer, admin],
  };
}

export async function listEcommerceDemoProducts(payload) {
  const input = toPayloadObject(payload);
  const moduleSlug =
    typeof input.moduleSlug === "string" && input.moduleSlug.trim().length > 0
      ? input.moduleSlug.trim()
      : "ecommerce/admin-catalog-content";

  const tables = await listEcommerceSuiteSqliteTables({ moduleSlug });
  const moduleItem = tables.items[0];
  if (!moduleItem) {
    return { ok: false, error: `Unknown ecommerce module '${moduleSlug}'.` };
  }

  const productLikeEntities = moduleItem.entities.filter((entity) =>
    /(product|catalog|inventory)/i.test(entity.entityKey) || /(product|catalog|inventory)/i.test(entity.label)
  );

  const entities = await Promise.all(
    productLikeEntities.map(async (entity) => {
      const rows = await getEcommerceSuiteSqliteEntityRows({
        moduleSlug,
        entityKey: entity.entityKey,
        limit: toPositiveInt(input.limit, 50, 1, 500),
      });
      return {
        key: entity.entityKey,
        label: entity.label,
        tableName: entity.tableName,
        count: entity.rowCount,
        rows: rows.rows,
      };
    })
  );

  return {
    ok: true,
    engine: "sqlite",
    legacyFunctionName: "listEcommerceDemoProducts",
    moduleSlug,
    entities,
  };
}

export async function listEcommerceDemoOrders(payload) {
  const input = toPayloadObject(payload);
  const requestedModule = typeof input.moduleSlug === "string" ? input.moduleSlug.trim() : "";
  const moduleCandidates = [requestedModule, "ecommerce/consumer-checkout", "ecommerce/admin-orders-oms"].filter(Boolean);
  const uniqueModules = [...new Set(moduleCandidates)];
  const limit = toPositiveInt(input.limit, 50, 1, 500);

  const entities = [];
  for (const moduleSlug of uniqueModules) {
    const tables = await listEcommerceSuiteSqliteTables({ moduleSlug });
    const moduleItem = tables.items[0];
    if (!moduleItem) continue;
    for (const entity of moduleItem.entities) {
      if (!/(order|checkout)/i.test(entity.entityKey) && !/(order|checkout)/i.test(entity.label)) continue;
      const rows = await getEcommerceSuiteSqliteEntityRows({ moduleSlug, entityKey: entity.entityKey, limit });
      entities.push({
        moduleSlug,
        entityKey: entity.entityKey,
        label: entity.label,
        tableName: entity.tableName,
        count: entity.rowCount,
        rows: rows.rows,
      });
    }
  }

  return {
    ok: true,
    engine: "sqlite",
    legacyFunctionName: "listEcommerceDemoOrders",
    entities,
  };
}

export async function getEcommerceDemoSalesReport() {
  const kpiRows = await getEcommerceSuiteSqliteEntityRows({
    moduleSlug: "ecommerce/admin-analytics-finance",
    entityKey: "adminKpiSnapshots",
    limit: 365,
  });
  const rows = kpiRows.rows;
  const totalSales = rows.reduce((sum, row) => sum + Number(row.sales ?? 0), 0);
  const avgConversion =
    rows.length > 0 ? rows.reduce((sum, row) => sum + Number(row.conversionRate ?? 0), 0) / rows.length : 0;

  return {
    ok: true,
    source: "ecommerce-suite-sqlite-seed",
    engine: "sqlite",
    moduleSlug: "ecommerce/admin-analytics-finance",
    entityKey: "adminKpiSnapshots",
    summary: {
      snapshots: rows.length,
      totalSales,
      avgConversionRate: Math.round(avgConversion * 100) / 100,
    },
    rows,
  };
}

export async function getEcommerceDemoSafetyPolicy() {
  const sqliteMeta = await getEcommerceSuiteSqliteMeta();
  return {
    ok: true,
    readOnlySeedDatasets: true,
    seedStorage: "SQLite (sql.js, server-side in-memory instance)",
    seedMutationAllowed: false,
    localWorkspaceMutationAllowed: true,
    localWorkspaceStorage: "localStorage (frontend/browser)",
    sqliteMeta,
    notes: [
      "Backend seed catalog summaries and sample rows are queried from SQLite.",
      "Frontend interactive changes remain isolated to localStorage workspaces per module.",
    ],
  };
}
