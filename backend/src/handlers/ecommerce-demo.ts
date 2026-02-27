import type { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { resolveProjectRoot } from "../lib/project-root";

type SqliteModule = {
  getEcommerceSuiteSqliteEntityRows: (input: {
    moduleSlug: string;
    entityKey: string;
    limit?: number;
  }) => Promise<unknown>;
  getEcommerceSuiteSqliteMeta: () => Promise<unknown>;
  listEcommerceSuiteSqliteTables: (input: {
    audience?: "consumer" | "admin";
    moduleSlug?: string;
  }) => Promise<unknown>;
};

type DemoReportsModule = {
  getEcommerceDemoOverviewReport: (payload: unknown) => Promise<unknown>;
  getEcommerceDemoSeedSnapshot: (payload: unknown) => Promise<unknown>;
};

type EcommerceSuiteDeps = {
  getEcommerceDemoOverviewReport: DemoReportsModule["getEcommerceDemoOverviewReport"];
  getEcommerceDemoSeedSnapshot: DemoReportsModule["getEcommerceDemoSeedSnapshot"];
  getEcommerceSuiteSqliteEntityRows: SqliteModule["getEcommerceSuiteSqliteEntityRows"];
  getEcommerceSuiteSqliteMeta: SqliteModule["getEcommerceSuiteSqliteMeta"];
  listEcommerceSuiteSqliteTables: SqliteModule["listEcommerceSuiteSqliteTables"];
};

let ecommerceSuiteDepsPromise: Promise<EcommerceSuiteDeps | null> | null = null;

async function importOptionalModule<T>(absolutePath: string): Promise<T | null> {
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  try {
    const imported = await import(pathToFileURL(absolutePath).href);
    return imported as T;
  } catch {
    return null;
  }
}

async function importFirstAvailable<T>(candidates: string[]) {
  for (const candidate of candidates) {
    const module = await importOptionalModule<T>(candidate);
    if (module) {
      return module;
    }
  }
  return null;
}

function isEcommerceSuiteDeps(value: unknown): value is EcommerceSuiteDeps {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.getEcommerceDemoOverviewReport === "function" &&
    typeof record.getEcommerceDemoSeedSnapshot === "function" &&
    typeof record.getEcommerceSuiteSqliteEntityRows === "function" &&
    typeof record.getEcommerceSuiteSqliteMeta === "function" &&
    typeof record.listEcommerceSuiteSqliteTables === "function"
  );
}

async function loadEcommerceSuiteDeps(): Promise<EcommerceSuiteDeps | null> {
  const projectRoot = resolveProjectRoot();

  const sqliteModule = await importFirstAvailable<SqliteModule>([
    path.join(projectRoot, "frontend", "src", "lib", "ecommerce-suite-sqlite.ts"),
    path.join(projectRoot, "src", "lib", "ecommerce-suite-sqlite.ts"),
  ]);
  const demoReportsModule = await importFirstAvailable<DemoReportsModule>([
    path.join(
      projectRoot,
      "frontend",
      "src",
      "ai",
      "functions-modules",
      "backend",
      "ecommerce",
      "ecommerce-demo.js"
    ),
    path.join(
      projectRoot,
      "src",
      "ai",
      "functions-modules",
      "backend",
      "ecommerce",
      "ecommerce-demo.js"
    ),
  ]);

  const deps = {
    getEcommerceDemoOverviewReport: demoReportsModule?.getEcommerceDemoOverviewReport,
    getEcommerceDemoSeedSnapshot: demoReportsModule?.getEcommerceDemoSeedSnapshot,
    getEcommerceSuiteSqliteEntityRows: sqliteModule?.getEcommerceSuiteSqliteEntityRows,
    getEcommerceSuiteSqliteMeta: sqliteModule?.getEcommerceSuiteSqliteMeta,
    listEcommerceSuiteSqliteTables: sqliteModule?.listEcommerceSuiteSqliteTables,
  };

  return isEcommerceSuiteDeps(deps) ? deps : null;
}

async function getEcommerceSuiteDeps() {
  if (!ecommerceSuiteDepsPromise) {
    ecommerceSuiteDepsPromise = loadEcommerceSuiteDeps().catch(() => null);
  }
  return ecommerceSuiteDepsPromise;
}

function readQueryString(value: unknown) {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

export async function getEcommerceDemoSeed(request: Request, response: Response) {
  const suiteValue = readQueryString(request.query.suite);

  if (suiteValue === "1" || suiteValue === "true") {
    const deps = await getEcommerceSuiteDeps();
    if (!deps) {
      return response.status(501).json({
        ok: false,
        error: "ecommerce_suite_dependencies_missing",
        hint: "Ecommerce suite modules are not available in this backend-only deployment.",
      });
    }

    const audienceRaw = readQueryString(request.query.audience);
    const audience = audienceRaw === "consumer" || audienceRaw === "admin" ? audienceRaw : undefined;

    const moduleSlug =
      readQueryString(request.query.moduleSlug) ?? readQueryString(request.query.module);
    const entityKey =
      readQueryString(request.query.entityKey) ?? readQueryString(request.query.entity);
    const limitRaw = Number(readQueryString(request.query.limit));
    const sampleRowsRaw = Number(
      readQueryString(request.query.sampleRowsPerEntity)
    );
    const includeTables =
      readQueryString(request.query.includeTables) === "1" || readQueryString(request.query.tables) === "1";
    const includeMeta =
      readQueryString(request.query.includeMeta) === "1" || readQueryString(request.query.meta) === "1";
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : undefined;
    const sampleRowsPerEntity = Number.isFinite(sampleRowsRaw)
      ? Math.max(0, Math.min(20, Math.floor(sampleRowsRaw)))
      : undefined;

    if (moduleSlug && entityKey) {
      const rows = await deps.getEcommerceSuiteSqliteEntityRows({
        moduleSlug,
        entityKey,
        limit,
      });
      return response.json({
        ok: true,
        mode: "ecommerce-suite-sqlite-entity",
        rows,
        ...(includeMeta ? { sqliteMeta: await deps.getEcommerceSuiteSqliteMeta() } : {}),
      });
    }

    const snapshot = await deps.getEcommerceDemoSeedSnapshot({
      audience,
      moduleSlug: moduleSlug || undefined,
      sampleRowsPerEntity,
    });
    const overview = await deps.getEcommerceDemoOverviewReport({
      audience,
    });

    return response.json({
      ok: true,
      mode: "ecommerce-suite-catalog-sqlite",
      snapshot,
      overview,
      ...(includeTables
        ? {
            tables: await deps.listEcommerceSuiteSqliteTables({
              audience,
              moduleSlug: moduleSlug || undefined,
            }),
          }
        : {}),
      ...(includeMeta ? { sqliteMeta: await deps.getEcommerceSuiteSqliteMeta() } : {}),
    });
  }

  return response.status(410).json({
    ok: false,
    disabled: true,
    error:
      "Legacy Ecommerce store demo seed endpoint is disabled. Use /api/ecommerce-demo/seed?suite=1 for the Ecommerce suite catalog.",
  });
}
