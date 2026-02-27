import {
  getNavaiVoiceBackendOptionsFromEnv,
  loadNavaiFunctions,
  resolveNavaiBackendRuntimeConfig,
  type NavaiFunctionsRegistry,
  type NavaiVoiceBackendOptions,
} from "@navai/voice-backend";
import { resolveProjectRoot } from "@/lib/project-root";

type NavaiEnv = Record<string, string | undefined>;

type NavaiFunctionsRuntime = {
  registry: NavaiFunctionsRegistry;
  warnings: string[];
};

const DEFAULT_FUNCTIONS_FOLDER = "frontend/src/ai/functions-modules";

let runtimePromise: Promise<NavaiFunctionsRuntime> | null = null;

function readOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getNavaiVoiceOptionsFromEnv(): NavaiVoiceBackendOptions {
  return getNavaiVoiceBackendOptionsFromEnv(process.env as NavaiEnv);
}

async function buildFunctionsRuntime(): Promise<NavaiFunctionsRuntime> {
  const env = process.env as NavaiEnv;
  const baseDir = resolveProjectRoot();
  const runtimeConfig = await resolveNavaiBackendRuntimeConfig({
    env,
    baseDir,
    functionsFolders: readOptional(env.NAVAI_FUNCTIONS_FOLDERS) ?? DEFAULT_FUNCTIONS_FOLDER,
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
