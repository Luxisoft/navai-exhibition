import { NextResponse } from "next/server";

import {
  getEcommerceDemoOverview,
  getEcommerceDemoSalesReport,
  getEcommerceDemoSeedSnapshot,
} from "@/ai/ecommerce-demo/sqlite-seed.js";

export const runtime = "nodejs";

function toInt(value: string | null, fallback: number, min = 1, max = 365) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rangeDays = toInt(url.searchParams.get("rangeDays"), 30, 1, 365);
    const productLimit = toInt(url.searchParams.get("productLimit"), 48, 1, 120);
    const recentOrdersLimit = toInt(url.searchParams.get("recentOrdersLimit"), 24, 1, 120);

    const [snapshot, overview, salesByCategory] = await Promise.all([
      getEcommerceDemoSeedSnapshot({ rangeDays, productLimit, recentOrdersLimit }),
      getEcommerceDemoOverview({ rangeDays }),
      getEcommerceDemoSalesReport({ rangeDays, groupBy: "category" }),
    ]);

    return NextResponse.json({
      ok: true,
      readOnly: true,
      snapshot,
      overview,
      salesByCategory,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ecommerce demo seed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

