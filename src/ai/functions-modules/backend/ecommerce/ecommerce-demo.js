import {
  getEcommerceDemoSeedSnapshot as readSeedSnapshot,
  getEcommerceDemoOverview as readOverview,
  listEcommerceDemoProducts as readProducts,
  listEcommerceDemoOrders as readOrders,
  getEcommerceDemoSalesReport as readSalesReport,
} from "../../../ecommerce-demo/sqlite-seed.js";

function asObject(payload) {
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
}

function sanitizeRangeDays(value, fallback = 30) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.max(1, Math.min(365, Math.floor(parsed)));
}

/**
 * Returns a read-only ecommerce seed snapshot (SQLite-backed) for demo visualization.
 */
export async function getEcommerceDemoSeedSnapshot(payload) {
  const input = asObject(payload);
  return readSeedSnapshot({
    rangeDays: sanitizeRangeDays(input.rangeDays, 30),
    productLimit: input.productLimit,
    recentOrdersLimit: input.recentOrdersLimit,
  });
}

/**
 * Returns KPI and top-performers report for the SQLite demo ecommerce dataset.
 */
export async function getEcommerceDemoOverviewReport(payload) {
  const input = asObject(payload);
  return readOverview({
    rangeDays: sanitizeRangeDays(input.rangeDays, 30),
  });
}

/**
 * Lists products from the SQLite demo ecommerce seed database with filters and sorting.
 */
export async function listEcommerceDemoProducts(payload) {
  const input = asObject(payload);
  return readProducts({
    query: input.query,
    category: input.category,
    lowStockOnly: input.lowStockOnly === true,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    sortBy: input.sortBy,
    limit: input.limit,
    offset: input.offset,
  });
}

/**
 * Lists orders from the SQLite demo ecommerce seed database with operational filters.
 */
export async function listEcommerceDemoOrders(payload) {
  const input = asObject(payload);
  return readOrders({
    status: input.status,
    paymentStatus: input.paymentStatus,
    customerQuery: input.customerQuery,
    minTotal: input.minTotal,
    maxTotal: input.maxTotal,
    rangeDays: input.rangeDays,
    limit: input.limit,
    offset: input.offset,
  });
}

/**
 * Returns sales reports grouped by day, category, or status from the SQLite demo dataset.
 */
export async function getEcommerceDemoSalesReport(payload) {
  const input = asObject(payload);
  return readSalesReport({
    rangeDays: sanitizeRangeDays(input.rangeDays, 30),
    groupBy: input.groupBy,
  });
}

/**
 * Describes the demo data safety model: SQLite seed is read-only; user CRUD happens in localStorage only.
 */
export async function getEcommerceDemoSafetyPolicy() {
  return {
    ok: true,
    readOnlySeedDatabase: true,
    seedDatabaseEngine: "SQLite (sql.js in Node runtime)",
    seedDataMutationAllowed: false,
    userGeneratedProductsStorage: "localStorage (browser only)",
    userCanModifySeedProducts: false,
    userCanCreateEditDeleteOwnProducts: true,
    purchaseSimulationWritesToSeedDb: false,
    notes: [
      "Seed products, customers, and orders are immutable and intended for demo analytics/reporting.",
      "User-created catalog items and simulated purchases are stored locally in the browser to avoid polluting the seed database.",
    ],
  };
}

