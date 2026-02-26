import { NextResponse } from "next/server";
import { getEcommerceDemoOverviewReport, getEcommerceDemoSeedSnapshot } from "@/ai/functions-modules/backend/ecommerce/ecommerce-demo";
import {
  getEcommerceSuiteSqliteEntityRows,
  getEcommerceSuiteSqliteMeta,
  listEcommerceSuiteSqliteTables,
} from "@/lib/ecommerce-suite-sqlite";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const suiteMode = searchParams.get("suite");

  if (suiteMode === "1" || suiteMode === "true") {
    const audience = searchParams.get("audience");
    const moduleSlug = searchParams.get("moduleSlug") ?? searchParams.get("module");
    const entityKey = searchParams.get("entityKey") ?? searchParams.get("entity");
    const limitRaw = Number(searchParams.get("limit"));
    const sampleRowsRaw = Number(searchParams.get("sampleRowsPerEntity"));
    const includeTables = searchParams.get("includeTables") === "1" || searchParams.get("tables") === "1";
    const includeMeta = searchParams.get("includeMeta") === "1" || searchParams.get("meta") === "1";
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
      return NextResponse.json({
        ok: true,
        mode: "ecommerce-suite-sqlite-entity",
        rows,
        ...(includeMeta ? { sqliteMeta: await getEcommerceSuiteSqliteMeta() } : {}),
      });
    }

    const snapshot = await getEcommerceDemoSeedSnapshot({
      audience: audience === "consumer" || audience === "admin" ? audience : undefined,
      moduleSlug: moduleSlug || undefined,
      sampleRowsPerEntity,
    });
    const overview = await getEcommerceDemoOverviewReport({
      audience: audience === "consumer" || audience === "admin" ? audience : undefined,
    });

    return NextResponse.json({
      ok: true,
      mode: "ecommerce-suite-catalog-sqlite",
      snapshot,
      overview,
      ...(includeTables
        ? {
            tables: await listEcommerceSuiteSqliteTables({
              audience: audience === "consumer" || audience === "admin" ? audience : undefined,
              moduleSlug: moduleSlug || undefined,
            }),
          }
        : {}),
      ...(includeMeta ? { sqliteMeta: await getEcommerceSuiteSqliteMeta() } : {}),
    });
  }

  return NextResponse.json(
    {
      ok: false,
      disabled: true,
      error: "Legacy Ecommerce store demo seed endpoint is disabled. Use /api/ecommerce-demo/seed?suite=1 for the Ecommerce suite catalog.",
    },
    { status: 410 }
  );
}
