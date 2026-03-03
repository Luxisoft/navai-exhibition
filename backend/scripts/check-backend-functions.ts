import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

import { getNavaiFunctionsRuntime } from "../src/lib/navai-backend-runtime";
import { resolveProjectRoot } from "../src/lib/project-root";

function loadBackendEnv() {
  const projectRoot = resolveProjectRoot();
  const envCandidates = [
    path.join(projectRoot, "backend", ".env"),
    path.join(projectRoot, ".env"),
  ];

  const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
  dotenv.config(envPath ? { path: envPath } : undefined);

  return envPath;
}

function printSection(title: string) {
  console.log("");
  console.log(title);
}

async function main() {
  const envPath = loadBackendEnv();
  console.log(
    `[navai] Running backend function check${envPath ? ` (env: ${envPath})` : ""}...`
  );

  const runtime = await getNavaiFunctionsRuntime();
  const items = runtime.registry.ordered;

  printSection(`[navai] Functions detected: ${items.length}`);
  if (items.length === 0) {
    console.log("- No backend functions were detected.");
  } else {
    for (const item of items) {
      console.log(`- ${item.name} (${item.source})`);
    }
  }

  printSection(`[navai] Warnings: ${runtime.warnings.length}`);
  if (runtime.warnings.length === 0) {
    console.log("- No warnings.");
  } else {
    for (const warning of runtime.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("[navai] Backend function check failed:");
  console.error(message);
  process.exitCode = 1;
});
