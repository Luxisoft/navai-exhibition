import type { Request, Response } from "express";

import { getNavaiFunctionsRuntime } from "@/lib/navai-backend-runtime";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function getNavaiFunctions(_request: Request, response: Response) {
  try {
    const runtimeConfig = await getNavaiFunctionsRuntime();
    return response.json({
      items: runtimeConfig.registry.ordered.map((item) => ({
        name: item.name,
        description: item.description,
        source: item.source,
      })),
      warnings: runtimeConfig.warnings,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron listar funciones.";
    return response.status(500).json({
      items: [],
      warnings: [],
      error: message,
    });
  }
}

export async function postNavaiExecuteFunction(request: Request, response: Response) {
  try {
    const runtimeConfig = await getNavaiFunctionsRuntime();
    const payload = isRecord(request.body) ? request.body : {};
    const functionName =
      typeof payload.function_name === "string" ? payload.function_name.trim().toLowerCase() : "";

    if (!functionName) {
      return response.status(400).json({ error: "function_name is required." });
    }

    const definition = runtimeConfig.registry.byName.get(functionName);
    if (!definition) {
      return response.status(404).json({
        error: "Unknown or disallowed function.",
        available_functions: runtimeConfig.registry.ordered.map((item) => item.name),
      });
    }

    const functionPayload = isRecord(payload.payload) ? payload.payload : {};
    const protocolHeader = request.headers["x-forwarded-proto"];
    const protocol = Array.isArray(protocolHeader)
      ? protocolHeader[0]
      : protocolHeader ?? request.protocol ?? "http";
    const host = request.get("host") ?? "localhost";
    const absoluteUrl = `${protocol}://${host}${request.originalUrl}`;
    const webRequest = new globalThis.Request(absoluteUrl, {
      method: request.method,
    });

    const result = await definition.run(functionPayload, { request: webRequest });

    return response.json({
      ok: true,
      function_name: definition.name,
      source: definition.source,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo ejecutar la funcion.";
    return response.status(500).json({ error: message });
  }
}
