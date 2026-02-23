import { NextResponse } from "next/server";

import { getNavaiFunctionsRuntime } from "@/lib/navai-backend-runtime";

export const runtime = "nodejs";

export async function GET() {
  try {
    const runtimeConfig = await getNavaiFunctionsRuntime();
    return NextResponse.json({
      items: runtimeConfig.registry.ordered.map((item) => ({
        name: item.name,
        description: item.description,
        source: item.source,
      })),
      warnings: runtimeConfig.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron listar funciones.";
    return NextResponse.json(
      {
        items: [],
        warnings: [],
        error: message,
      },
      { status: 500 }
    );
  }
}
