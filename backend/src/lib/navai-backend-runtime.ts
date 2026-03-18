import fs from "node:fs";
import path from "node:path";

import {
  getNavaiVoiceBackendOptionsFromEnv,
  loadNavaiFunctions,
  resolveNavaiBackendRuntimeConfig,
  type NavaiFunctionsRegistry,
  type NavaiVoiceBackendOptions,
} from "@navai/voice-backend";

import { resolveProjectRoot } from "./project-root";

type NavaiEnv = Record<string, string | undefined>;

type NavaiFunctionsRuntime = {
  registry: NavaiFunctionsRegistry;
  warnings: string[];
};

const DEFAULT_FUNCTIONS_FOLDER_CANDIDATES = ["src/ai"];

let runtimePromise: Promise<NavaiFunctionsRuntime> | null = null;

function readOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolveDefaultFunctionsFolders(baseDir: string) {
  for (const relativeFolder of DEFAULT_FUNCTIONS_FOLDER_CANDIDATES) {
    if (fs.existsSync(path.join(baseDir, relativeFolder))) {
      return relativeFolder;
    }
  }

  return DEFAULT_FUNCTIONS_FOLDER_CANDIDATES[0];
}

function resolveFunctionsBaseDir(projectRoot: string) {
  const monorepoBackendDir = path.join(projectRoot, "backend");
  if (fs.existsSync(path.join(monorepoBackendDir, "src", "server.ts"))) {
    return monorepoBackendDir;
  }
  return projectRoot;
}

function normalizeFunctionsFoldersForRuntime(value: string) {
  const tokens = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/\\/g, "/").replace(/^(\.\/)+/, ""));

  const normalized = tokens.map((item) => {
    if (item.startsWith("backend/src/")) {
      return item.slice("backend/".length);
    }
    return item;
  });

  return normalized.join(",");
}

export function getNavaiVoiceOptionsFromEnv(): NavaiVoiceBackendOptions {
  return getNavaiVoiceBackendOptionsFromEnv(process.env as NavaiEnv);
}

async function buildFunctionsRuntime(): Promise<NavaiFunctionsRuntime> {
  const env = process.env as NavaiEnv;
  const projectRoot = resolveProjectRoot();
  const baseDir = resolveFunctionsBaseDir(projectRoot);
  const rawConfiguredFolders =
    readOptional(env.NAVAI_FUNCTIONS_FOLDERS) ?? resolveDefaultFunctionsFolders(baseDir);
  const configuredFolders = normalizeFunctionsFoldersForRuntime(rawConfiguredFolders);

  const runtimeConfig = await resolveNavaiBackendRuntimeConfig({
    env,
    baseDir,
    functionsFolders: configuredFolders,
    includeExtensions: ["js", "mjs", "cjs"],
  });

  const registry = await loadNavaiFunctions(runtimeConfig.functionModuleLoaders);

  return {
    registry,
    warnings: [...runtimeConfig.warnings, ...registry.warnings],
  };
}

export async function getNavaiFunctionsRuntime(): Promise<NavaiFunctionsRuntime> {
  if (!runtimePromise) {
    runtimePromise = buildFunctionsRuntime().catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}
