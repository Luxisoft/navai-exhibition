import type { Request, Response } from "express";

import {
  getEcommerceDemoOverviewReport,
  getEcommerceDemoSeedSnapshot,
} from "@/ai/functions-modules/backend/ecommerce/ecommerce-demo";
import {
  getEcommerceSuiteSqliteEntityRows,
  getEcommerceSuiteSqliteMeta,
  listEcommerceSuiteSqliteTables,
} from "@/lib/ecommerce-suite-sqlite";

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
      const rows = await getEcommerceSuiteSqliteEntityRows({
        moduleSlug,
        entityKey,
        limit,
      });
      return response.json({
        ok: true,
        mode: "ecommerce-suite-sqlite-entity",
        rows,
        ...(includeMeta ? { sqliteMeta: await getEcommerceSuiteSqliteMeta() } : {}),
      });
    }

    const snapshot = await getEcommerceDemoSeedSnapshot({
      audience,
      moduleSlug: moduleSlug || undefined,
      sampleRowsPerEntity,
    });
    const overview = await getEcommerceDemoOverviewReport({
      audience,
    });

    return response.json({
      ok: true,
      mode: "ecommerce-suite-catalog-sqlite",
      snapshot,
      overview,
      ...(includeTables
        ? {
            tables: await listEcommerceSuiteSqliteTables({
              audience,
              moduleSlug: moduleSlug || undefined,
            }),
          }
        : {}),
      ...(includeMeta ? { sqliteMeta: await getEcommerceSuiteSqliteMeta() } : {}),
    });
  }

  return response.status(410).json({
    ok: false,
    disabled: true,
    error:
      "Legacy Ecommerce store demo seed endpoint is disabled. Use /api/ecommerce-demo/seed?suite=1 for the Ecommerce suite catalog.",
  });
}
