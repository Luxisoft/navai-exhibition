import { NextResponse } from "next/server";

import { getNavaiFunctionsRuntime } from "@/lib/navai-backend-runtime";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function POST(request: Request) {
  try {
    const runtimeConfig = await getNavaiFunctionsRuntime();
    const rawBody = (await request.json().catch(() => ({}))) as unknown;
    const payload = isRecord(rawBody) ? rawBody : {};
    const functionName =
      typeof payload.function_name === "string" ? payload.function_name.trim().toLowerCase() : "";

    if (!functionName) {
      return NextResponse.json({ error: "function_name is required." }, { status: 400 });
    }

    const definition = runtimeConfig.registry.byName.get(functionName);
    if (!definition) {
      return NextResponse.json(
        {
          error: "Unknown or disallowed function.",
          available_functions: runtimeConfig.registry.ordered.map((item) => item.name),
        },
        { status: 404 }
      );
    }

    const functionPayload = isRecord(payload.payload) ? payload.payload : {};
    const result = await definition.run(functionPayload, { request });

    return NextResponse.json({
      ok: true,
      function_name: definition.name,
      source: definition.source,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo ejecutar la funcion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
