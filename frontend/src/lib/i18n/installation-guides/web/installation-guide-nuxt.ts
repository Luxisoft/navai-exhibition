import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";

const WEB_NUXT_GUIDE_TABS: Partial<Record<LanguageCode, InstallationGuideTab>> =
  {
    en: {
      value: "nuxt",
      label: "Nuxt",
      title: "Nuxt 3",
      description:
        "Full-stack Vue framework with file-based routing, public runtime config, and a client-only voice control mount.",
      sections: [
        {
          id: "paso-1-crear-proyecto-web",
          title: "Step 1 Create the web project",
          description:
            "Create the Nuxt 3 project and prepare `ai`, `components`, and `composables` at the root so NAVAI can live beside pages and layouts.",
          bullets: [
            "Use Node.js 20 or newer and keep the voice control inside `.client.*` files.",
          ],
          codeBlocks: [
            {
              label: "setup.sh",
              language: "bash",
              code: "npm create nuxt@latest navai-web-demo -- --template v3 --packageManager npm --no-install --gitInit=false --modules=\ncd navai-web-demo\nnpm install\nmkdir -p ai/functions-modules components composables pages",
            },
          ],
        },
        {
          id: "paso-2-instalar-dependencias-web",
          title: "Step 2 Install dependencies",
          description:
            "Install the NAVAI web runtime, the realtime SDK, and `zod`. Nuxt already ships Vue Router, auto-imports, and the Vite pipeline.",
          bullets: ["You do not need to add `vue-router` manually in Nuxt."],
          codeBlocks: [
            {
              label: "install.sh",
              language: "bash",
              code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
            },
          ],
        },
        {
          id: "paso-3-configurar-variables-y-loaders-web",
          title: "Step 3 Configure env and loaders",
          description:
            "Use `.env` with `NUXT_PUBLIC_NAVAI_API_URL` for the browser backend URL and define `runtimeConfig.public.navaiApiUrl` in `nuxt.config.ts`.",
          bullets: [
            "Keep `NAVAI_FUNCTIONS_FOLDERS` and `NAVAI_ROUTES_FILE` pointing at the root `ai/` directory.",
          ],
          codeBlocks: [
            {
              label: ".env",
              language: "ini",
              code: "NUXT_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=ai/functions-modules\nNAVAI_ROUTES_FILE=ai/routes.ts",
            },
            {
              label: "nuxt.config.ts",
              language: "ts",
              code: 'export default defineNuxtConfig({\n  runtimeConfig: {\n    public: {\n      navaiApiUrl: process.env.NUXT_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n    },\n  },\n});',
            },
          ],
        },
        {
          id: "paso-4-definir-rutas-navegables-web",
          title: "Step 4 Define navigation routes",
          description:
            "Declare a `NavaiRoute[]` array with names, paths, and business synonyms so the agent can resolve navigation from natural language.",
          bullets: [
            "Expose only real, stable routes; if a screen should not open by voice, do not publish it here.",
          ],
          codeBlocks: [
            {
              label: "ai/routes.ts",
              language: "typescript",
              code: 'import type { NavaiRoute } from "@navai/voice-frontend";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home dashboard",\n    synonyms: ["home", "dashboard", "start"],\n  },\n  {\n    name: "billing",\n    path: "/billing",\n    description: "Billing and subscription screen",\n    synonyms: ["billing", "payments", "subscription"],\n  },\n];',
            },
          ],
        },
        {
          id: "paso-5-crear-functions-locales-web",
          title: "Step 5 Define functions",
          description:
            "Start with one small frontend function so you can verify that `execute_app_function` resolves local code first and only then falls back to the backend.",
          bullets: [
            "Local functions run in the browser, so they can touch DOM, UI state, or framework wrappers when that is safe.",
          ],
          codeBlocks: [
            {
              label: "ai/functions-modules/show_welcome_banner.ts",
              language: "typescript",
              code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
            },
          ],
        },
        {
          id: "paso-6-integrar-runtime-web",
          title: "Step 6 Integrate the web runtime",
          description:
            "Create a client-only composable for the voice session, wire it to `useRouter()`, and mount `VoiceNavigator` inside `ClientOnly` in `app.vue`.",
          bullets: [
            "The `.client` suffix avoids server-side rendering the microphone control.",
          ],
          codeBlocks: [
            {
              label: "composables/useNavaiVoice.client.ts",
              language: "ts",
              code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "~/ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "~/ai/generated-module-loaders";\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const nuxtRuntimeConfig = useRuntimeConfig();\n  const env = {\n    NAVAI_API_URL: nuxtRuntimeConfig.public.navaiApiUrl ?? "http://localhost:3000",\n    NAVAI_FUNCTIONS_FOLDERS: "ai/functions-modules",\n    NAVAI_ROUTES_FILE: "ai/routes.ts",\n  };\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ apiBaseUrl: env.NAVAI_API_URL });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const resolvedRuntime = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env,\n      });\n      const requestPayload = resolvedRuntime.modelOverride ? { model: resolvedRuntime.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: resolvedRuntime.routes,\n        functionModuleLoaders: resolvedRuntime.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (resolvedRuntime.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: resolvedRuntime.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
            },
            {
              label: "components/VoiceNavigator.client.vue",
              language: "vue",
              code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Nuxt + NAVAI</span>\n      <h2>Keep the Orb mounted while pages change.</h2>\n      <p>Start NAVAI here and keep the same session alive across Home and Billing.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
            },
            {
              label: "app.vue",
              language: "vue",
              code: "<template>\n  <NuxtLayout>\n    <ClientOnly>\n      <VoiceNavigator />\n    </ClientOnly>\n\n    <NuxtPage />\n  </NuxtLayout>\n</template>",
            },
            {
              label: "pages/index.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Home</h1>\n    <p>Ask NAVAI to open Billing.</p>\n  </main>\n</template>",
            },
            {
              label: "pages/billing.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing page ready for NAVAI.</p>\n  </main>\n</template>",
            },
          ],
        },
        {
          id: "paso-7-probar-integracion-web",
          title: "Step 7 Test the web integration",
          description:
            "Regenerate loaders, start Nuxt, and validate that the session stays alive while you move between pages.",
          bullets: [
            "Test one path navigation and one backend function in the same session.",
          ],
          codeBlocks: [
            {
              label: "generate-loaders.sh",
              language: "bash",
              code: "npm exec navai-generate-web-loaders -- --output-file ai/generated-module-loaders.ts",
            },
            {
              label: "npm-run-dev.sh",
              language: "bash",
              code: "npm run dev",
            },
            {
              label: "checklist.txt",
              language: "text",
              code: "1. Start the backend from /documentation/installation-api if it is not running.\n2. Generate loaders and start the selected web stack.\n3. Start NAVAI and allow microphone access.\n4. Ask NAVAI to open Billing and run show welcome banner. Confirm the highlighted status banner changes.\n5. Call one backend function to confirm the HTTP bridge responds.",
            },
          ],
        },
      ],
    },
    fr: {
      value: "nuxt",
      label: "Nuxt",
      title: "Nuxt 3",
      description:
        "Framework Vue full-stack avec routing par fichiers, runtime config publique et montage client-only du controle vocal.",
      sections: [
        {
          id: "paso-1-crear-proyecto-web",
          title: "Etape 1 Creer le projet web",
          description:
            "Creez le projet Nuxt 3 et preparez `ai`, `components` et `composables` a la racine pour que NAVAI vive avec pages et layouts.",
          bullets: [
            "Utilisez Node.js 20 ou plus et gardez le controle vocal dans des fichiers `.client.*`.",
          ],
          codeBlocks: [
            {
              label: "setup.sh",
              language: "bash",
              code: "npm create nuxt@latest navai-web-demo -- --template v3 --packageManager npm --no-install --gitInit=false --modules=\ncd navai-web-demo\nnpm install\nmkdir -p ai/functions-modules components composables pages",
            },
          ],
        },
        {
          id: "paso-2-instalar-dependencias-web",
          title: "Etape 2 Installer les dependances",
          description:
            "Installez le runtime web NAVAI, le SDK realtime et `zod`. Nuxt fournit deja Vue Router, les auto-imports et le pipeline Vite.",
          bullets: [
            "Vous n avez pas besoin d ajouter `vue-router` manuellement dans Nuxt.",
          ],
          codeBlocks: [
            {
              label: "install.sh",
              language: "bash",
              code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
            },
          ],
        },
        {
          id: "paso-3-configurar-variables-y-loaders-web",
          title: "Etape 3 Configurer variables et loaders",
          description:
            "Utilisez `.env` avec `NUXT_PUBLIC_NAVAI_API_URL` pour l URL backend navigateur et definissez `runtimeConfig.public.navaiApiUrl` dans `nuxt.config.ts`.",
          bullets: [
            "Gardez `NAVAI_FUNCTIONS_FOLDERS` et `NAVAI_ROUTES_FILE` pointant vers le dossier racine `ai/`.",
          ],
          codeBlocks: [
            {
              label: ".env",
              language: "ini",
              code: "NUXT_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=ai/functions-modules\nNAVAI_ROUTES_FILE=ai/routes.ts",
            },
            {
              label: "nuxt.config.ts",
              language: "ts",
              code: 'export default defineNuxtConfig({\n  runtimeConfig: {\n    public: {\n      navaiApiUrl: process.env.NUXT_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n    },\n  },\n});',
            },
          ],
        },
        {
          id: "paso-4-definir-rutas-navegables-web",
          title: "Etape 4 Definir les routes de navigation",
          description:
            "Declarez un tableau `NavaiRoute[]` avec noms, paths et synonymes metier pour que l agent resolue la navigation a partir du langage naturel.",
          bullets: [
            "Exposez seulement des routes reelles et stables; si un ecran ne doit pas s ouvrir a la voix, ne le publiez pas ici.",
          ],
          codeBlocks: [
            {
              label: "ai/routes.ts",
              language: "typescript",
              code: 'import type { NavaiRoute } from "@navai/voice-frontend";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home dashboard",\n    synonyms: ["home", "dashboard", "start"],\n  },\n  {\n    name: "billing",\n    path: "/billing",\n    description: "Billing and subscription screen",\n    synonyms: ["billing", "payments", "subscription"],\n  },\n];',
            },
          ],
        },
        {
          id: "paso-5-crear-functions-locales-web",
          title: "Etape 5 Definir les fonctions",
          description:
            "Commencez par une petite fonction frontend afin de verifier que `execute_app_function` execute d abord le code local avant le fallback backend.",
          bullets: [
            "Les fonctions locales tournent dans le navigateur et peuvent donc toucher le DOM, l etat UI ou les wrappers du framework quand c est sur.",
          ],
          codeBlocks: [
            {
              label: "ai/functions-modules/show_welcome_banner.ts",
              language: "typescript",
              code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
            },
          ],
        },
        {
          id: "paso-6-integrar-runtime-web",
          title: "Etape 6 Integrer le runtime web",
          description:
            "Creez un composable client-only pour la session vocale, branchez-le a `useRouter()` et montez `VoiceNavigator` dans `ClientOnly` depuis `app.vue`.",
          bullets: [
            "Le suffixe `.client` evite de rendre le controle micro cote serveur.",
          ],
          codeBlocks: [
            {
              label: "composables/useNavaiVoice.client.ts",
              language: "ts",
              code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "~/ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "~/ai/generated-module-loaders";\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const nuxtRuntimeConfig = useRuntimeConfig();\n  const env = {\n    NAVAI_API_URL: nuxtRuntimeConfig.public.navaiApiUrl ?? "http://localhost:3000",\n    NAVAI_FUNCTIONS_FOLDERS: "ai/functions-modules",\n    NAVAI_ROUTES_FILE: "ai/routes.ts",\n  };\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ apiBaseUrl: env.NAVAI_API_URL });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const resolvedRuntime = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env,\n      });\n      const requestPayload = resolvedRuntime.modelOverride ? { model: resolvedRuntime.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: resolvedRuntime.routes,\n        functionModuleLoaders: resolvedRuntime.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (resolvedRuntime.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: resolvedRuntime.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
            },
            {
              label: "components/VoiceNavigator.client.vue",
              language: "vue",
              code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Nuxt + NAVAI</span>\n      <h2>Keep the Orb mounted while pages change.</h2>\n      <p>Start NAVAI here and keep the same session alive across Home and Billing.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
            },
            {
              label: "app.vue",
              language: "vue",
              code: "<template>\n  <NuxtLayout>\n    <ClientOnly>\n      <VoiceNavigator />\n    </ClientOnly>\n\n    <NuxtPage />\n  </NuxtLayout>\n</template>",
            },
            {
              label: "pages/index.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Home</h1>\n    <p>Ask NAVAI to open Billing.</p>\n  </main>\n</template>",
            },
            {
              label: "pages/billing.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing page ready for NAVAI.</p>\n  </main>\n</template>",
            },
          ],
        },
        {
          id: "paso-7-probar-integracion-web",
          title: "Etape 7 Tester l integration web",
          description:
            "Regenerez les loaders, lancez Nuxt et validez que la session reste active pendant les changements de pages.",
          bullets: [
            "Testez une navigation par path et une fonction backend dans la meme session.",
          ],
          codeBlocks: [
            {
              label: "generate-loaders.sh",
              language: "bash",
              code: "npm exec navai-generate-web-loaders -- --output-file ai/generated-module-loaders.ts",
            },
            {
              label: "npm-run-dev.sh",
              language: "bash",
              code: "npm run dev",
            },
            {
              label: "checklist.txt",
              language: "text",
              code: "1. Demarrez le backend depuis /documentation/installation-api s il n est pas deja lance.\n2. Generez les loaders puis demarrez la stack web choisie.\n3. Ouvrez l application dans le navigateur et autorisez le micro.\n4. Demandez a NAVAI d ouvrir Billing puis d executer show welcome banner.\n5. Lancez aussi une fonction backend pour verifier que le pont HTTP repond.",
            },
          ],
        },
      ],
    },
    es: {
      value: "nuxt",
      label: "Nuxt",
      title: "Nuxt 3",
      description:
        "Framework Vue full-stack con routing por archivos, runtime config publico y montaje client-only del control de voz.",
      sections: [
        {
          id: "paso-1-crear-proyecto-web",
          title: "Paso 1 Crear el proyecto web",
          description:
            "Cree el proyecto Nuxt 3 y prepare `ai`, `components` y `composables` en la raiz para que NAVAI conviva con pages y layouts.",
          bullets: [
            "Use Node.js 20 o superior y deje el control de voz en archivos `.client.*`.",
          ],
          codeBlocks: [
            {
              label: "setup.sh",
              language: "bash",
              code: "npm create nuxt@latest navai-web-demo -- --template v3 --packageManager npm --no-install --gitInit=false --modules=\ncd navai-web-demo\nnpm install\nmkdir -p ai/functions-modules components composables pages",
            },
          ],
        },
        {
          id: "paso-2-instalar-dependencias-web",
          title: "Paso 2 Instalar dependencias",
          description:
            "Instale el runtime web de NAVAI, el SDK realtime y `zod`. Nuxt ya incluye Vue Router, auto-imports y el pipeline Vite.",
          bullets: ["No necesita agregar `vue-router` manualmente en Nuxt."],
          codeBlocks: [
            {
              label: "install.sh",
              language: "bash",
              code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
            },
          ],
        },
        {
          id: "paso-3-configurar-variables-y-loaders-web",
          title: "Paso 3 Configurar variables y loaders",
          description:
            "Use `.env` con `NUXT_PUBLIC_NAVAI_API_URL` para la URL backend del navegador y defina `runtimeConfig.public.navaiApiUrl` en `nuxt.config.ts`.",
          bullets: [
            "Mantenga `NAVAI_FUNCTIONS_FOLDERS` y `NAVAI_ROUTES_FILE` apuntando a la carpeta `ai/` de la raiz.",
          ],
          codeBlocks: [
            {
              label: ".env",
              language: "ini",
              code: "NUXT_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=ai/functions-modules\nNAVAI_ROUTES_FILE=ai/routes.ts",
            },
            {
              label: "nuxt.config.ts",
              language: "ts",
              code: 'export default defineNuxtConfig({\n  runtimeConfig: {\n    public: {\n      navaiApiUrl: process.env.NUXT_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n    },\n  },\n});',
            },
          ],
        },
        {
          id: "paso-4-definir-rutas-navegables-web",
          title: "Paso 4 Definir rutas de navegacion",
          description:
            "Declare un arreglo `NavaiRoute[]` con nombres, paths y sinonimos de negocio para que el agente pueda resolver la navegacion por lenguaje natural.",
          bullets: [
            "Exponga solo rutas reales y estables; si una pantalla no debe abrirse por voz, no la publique aqui.",
          ],
          codeBlocks: [
            {
              label: "ai/routes.ts",
              language: "typescript",
              code: 'import type { NavaiRoute } from "@navai/voice-frontend";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home dashboard",\n    synonyms: ["home", "dashboard", "start"],\n  },\n  {\n    name: "billing",\n    path: "/billing",\n    description: "Billing and subscription screen",\n    synonyms: ["billing", "payments", "subscription"],\n  },\n];',
            },
          ],
        },
        {
          id: "paso-5-crear-functions-locales-web",
          title: "Paso 5 Definir funciones",
          description:
            "Empiece con una function frontend pequena para validar que `execute_app_function` resuelve primero el codigo local y luego hace fallback hacia backend.",
          bullets: [
            "Las functions locales se ejecutan en navegador, asi que pueden tocar DOM, estado UI o wrappers del framework cuando sea seguro.",
          ],
          codeBlocks: [
            {
              label: "ai/functions-modules/show_welcome_banner.ts",
              language: "typescript",
              code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
            },
          ],
        },
        {
          id: "paso-6-integrar-runtime-web",
          title: "Paso 6 Integrar el runtime web",
          description:
            "Cree un composable client-only para la sesion de voz, conectelo con `useRouter()` y monte `VoiceNavigator` dentro de `ClientOnly` en `app.vue`.",
          bullets: [
            "El sufijo `.client` evita render server-side del microfono.",
          ],
          codeBlocks: [
            {
              label: "composables/useNavaiVoice.client.ts",
              language: "ts",
              code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "~/ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "~/ai/generated-module-loaders";\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const nuxtRuntimeConfig = useRuntimeConfig();\n  const env = {\n    NAVAI_API_URL: nuxtRuntimeConfig.public.navaiApiUrl ?? "http://localhost:3000",\n    NAVAI_FUNCTIONS_FOLDERS: "ai/functions-modules",\n    NAVAI_ROUTES_FILE: "ai/routes.ts",\n  };\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ apiBaseUrl: env.NAVAI_API_URL });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const resolvedRuntime = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env,\n      });\n      const requestPayload = resolvedRuntime.modelOverride ? { model: resolvedRuntime.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: resolvedRuntime.routes,\n        functionModuleLoaders: resolvedRuntime.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (resolvedRuntime.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: resolvedRuntime.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
            },
            {
              label: "components/VoiceNavigator.client.vue",
              language: "vue",
              code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Nuxt + NAVAI</span>\n      <h2>Keep the Orb mounted while pages change.</h2>\n      <p>Start NAVAI here and keep the same session alive across Home and Billing.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
            },
            {
              label: "app.vue",
              language: "vue",
              code: "<template>\n  <NuxtLayout>\n    <ClientOnly>\n      <VoiceNavigator />\n    </ClientOnly>\n\n    <NuxtPage />\n  </NuxtLayout>\n</template>",
            },
            {
              label: "pages/index.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Home</h1>\n    <p>Ask NAVAI to open Billing.</p>\n  </main>\n</template>",
            },
            {
              label: "pages/billing.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing page ready for NAVAI.</p>\n  </main>\n</template>",
            },
          ],
        },
        {
          id: "paso-7-probar-integracion-web",
          title: "Paso 7 Probar la integracion web",
          description:
            "Regenere loaders, levante Nuxt y valide que la sesion siga viva mientras cambia entre pages.",
          bullets: [
            "Pruebe una navegacion por path y una function backend dentro de la misma sesion.",
          ],
          codeBlocks: [
            {
              label: "generate-loaders.sh",
              language: "bash",
              code: "npm exec navai-generate-web-loaders -- --output-file ai/generated-module-loaders.ts",
            },
            {
              label: "npm-run-dev.sh",
              language: "bash",
              code: "npm run dev",
            },
            {
              label: "checklist.txt",
              language: "text",
              code: "1. Inicie el backend desde /documentation/installation-api si todavia no esta levantado.\n2. Genere loaders y arranque el stack web seleccionado.\n3. Abra la app en el navegador y conceda permiso de microfono.\n4. Pida a NAVAI abrir Billing y ejecutar show welcome banner.\n5. Dispare tambien una function backend para confirmar que el puente HTTP responde.",
            },
          ],
        },
      ],
    },
    pt: {
      value: "nuxt",
      label: "Nuxt",
      title: "Nuxt 3",
      description:
        "Framework Vue full-stack com routing por arquivos, runtime config publico e montagem client-only do controle de voz.",
      sections: [
        {
          id: "paso-1-crear-proyecto-web",
          title: "Passo 1 Criar o projeto web",
          description:
            "Crie o projeto Nuxt 3 e prepare `ai`, `components` e `composables` na raiz para que o NAVAI conviva com pages e layouts.",
          bullets: [
            "Use Node.js 20 ou superior e deixe o controle de voz em arquivos `.client.*`.",
          ],
          codeBlocks: [
            {
              label: "setup.sh",
              language: "bash",
              code: "npm create nuxt@latest navai-web-demo -- --template v3 --packageManager npm --no-install --gitInit=false --modules=\ncd navai-web-demo\nnpm install\nmkdir -p ai/functions-modules components composables pages",
            },
          ],
        },
        {
          id: "paso-2-instalar-dependencias-web",
          title: "Passo 2 Instalar dependencias",
          description:
            "Instale o runtime web do NAVAI, o SDK realtime e `zod`. Nuxt ja inclui Vue Router, auto-imports e o pipeline Vite.",
          bullets: [
            "Voce nao precisa adicionar `vue-router` manualmente no Nuxt.",
          ],
          codeBlocks: [
            {
              label: "install.sh",
              language: "bash",
              code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
            },
          ],
        },
        {
          id: "paso-3-configurar-variables-y-loaders-web",
          title: "Passo 3 Configurar variaveis e loaders",
          description:
            "Use `.env` com `NUXT_PUBLIC_NAVAI_API_URL` para a URL backend do navegador e defina `runtimeConfig.public.navaiApiUrl` em `nuxt.config.ts`.",
          bullets: [
            "Mantenha `NAVAI_FUNCTIONS_FOLDERS` e `NAVAI_ROUTES_FILE` apontando para a pasta `ai/` da raiz.",
          ],
          codeBlocks: [
            {
              label: ".env",
              language: "ini",
              code: "NUXT_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=ai/functions-modules\nNAVAI_ROUTES_FILE=ai/routes.ts",
            },
            {
              label: "nuxt.config.ts",
              language: "ts",
              code: 'export default defineNuxtConfig({\n  runtimeConfig: {\n    public: {\n      navaiApiUrl: process.env.NUXT_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n    },\n  },\n});',
            },
          ],
        },
        {
          id: "paso-4-definir-rutas-navegables-web",
          title: "Passo 4 Definir rotas de navegacao",
          description:
            "Declare um array `NavaiRoute[]` com nomes, paths e sinonimos de negocio para que o agente resolva a navegacao por linguagem natural.",
          bullets: [
            "Expose apenas rotas reais e estaveis; se uma tela nao deve abrir por voz, nao publique aqui.",
          ],
          codeBlocks: [
            {
              label: "ai/routes.ts",
              language: "typescript",
              code: 'import type { NavaiRoute } from "@navai/voice-frontend";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home dashboard",\n    synonyms: ["home", "dashboard", "start"],\n  },\n  {\n    name: "billing",\n    path: "/billing",\n    description: "Billing and subscription screen",\n    synonyms: ["billing", "payments", "subscription"],\n  },\n];',
            },
          ],
        },
        {
          id: "paso-5-crear-functions-locales-web",
          title: "Passo 5 Definir funcoes",
          description:
            "Comece com uma funcao frontend pequena para validar que `execute_app_function` resolve o codigo local antes do fallback para o backend.",
          bullets: [
            "As funcoes locais rodam no navegador, entao podem tocar DOM, estado da UI ou wrappers do framework quando isso for seguro.",
          ],
          codeBlocks: [
            {
              label: "ai/functions-modules/show_welcome_banner.ts",
              language: "typescript",
              code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
            },
          ],
        },
        {
          id: "paso-6-integrar-runtime-web",
          title: "Passo 6 Integrar o runtime web",
          description:
            "Crie um composable client-only para a sessao de voz, conecte-o com `useRouter()` e monte `VoiceNavigator` dentro de `ClientOnly` em `app.vue`.",
          bullets: [
            "O sufixo `.client` evita renderizacao server-side do microfone.",
          ],
          codeBlocks: [
            {
              label: "composables/useNavaiVoice.client.ts",
              language: "ts",
              code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "~/ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "~/ai/generated-module-loaders";\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const nuxtRuntimeConfig = useRuntimeConfig();\n  const env = {\n    NAVAI_API_URL: nuxtRuntimeConfig.public.navaiApiUrl ?? "http://localhost:3000",\n    NAVAI_FUNCTIONS_FOLDERS: "ai/functions-modules",\n    NAVAI_ROUTES_FILE: "ai/routes.ts",\n  };\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ apiBaseUrl: env.NAVAI_API_URL });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const resolvedRuntime = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env,\n      });\n      const requestPayload = resolvedRuntime.modelOverride ? { model: resolvedRuntime.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: resolvedRuntime.routes,\n        functionModuleLoaders: resolvedRuntime.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (resolvedRuntime.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: resolvedRuntime.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
            },
            {
              label: "components/VoiceNavigator.client.vue",
              language: "vue",
              code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Nuxt + NAVAI</span>\n      <h2>Keep the Orb mounted while pages change.</h2>\n      <p>Start NAVAI here and keep the same session alive across Home and Billing.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
            },
            {
              label: "app.vue",
              language: "vue",
              code: "<template>\n  <NuxtLayout>\n    <ClientOnly>\n      <VoiceNavigator />\n    </ClientOnly>\n\n    <NuxtPage />\n  </NuxtLayout>\n</template>",
            },
            {
              label: "pages/index.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Home</h1>\n    <p>Ask NAVAI to open Billing.</p>\n  </main>\n</template>",
            },
            {
              label: "pages/billing.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing page ready for NAVAI.</p>\n  </main>\n</template>",
            },
          ],
        },
        {
          id: "paso-7-probar-integracion-web",
          title: "Passo 7 Testar a integracao web",
          description:
            "Regenere loaders, suba o Nuxt e valide que a sessao permanece viva enquanto voce muda entre pages.",
          bullets: [
            "Teste uma navegacao por path e uma funcao backend na mesma sessao.",
          ],
          codeBlocks: [
            {
              label: "generate-loaders.sh",
              language: "bash",
              code: "npm exec navai-generate-web-loaders -- --output-file ai/generated-module-loaders.ts",
            },
            {
              label: "npm-run-dev.sh",
              language: "bash",
              code: "npm run dev",
            },
            {
              label: "checklist.txt",
              language: "text",
              code: "1. Inicie o backend em /documentation/installation-api se ele ainda nao estiver rodando.\n2. Gere os loaders e suba o stack web escolhido.\n3. Abra a aplicacao no navegador e conceda acesso ao microfone.\n4. Peca ao NAVAI para abrir Billing e executar show welcome banner.\n5. Dispare tambem uma funcao backend para confirmar que a ponte HTTP responde.",
            },
          ],
        },
      ],
    },
    zh: {
      value: "nuxt",
      label: "Nuxt",
      title: "Nuxt 3",
      description:
        "一个带 file-based routing、public runtime config 和 client-only voice mount 的 full-stack Vue framework。",
      sections: [
        {
          id: "paso-1-crear-proyecto-web",
          title: "步骤 1 创建 Web 项目",
          description:
            "创建 Nuxt 3 project，并在 root 准备 `ai`、`components` 和 `composables`，让 NAVAI 与 pages、layouts 并存。",
          bullets: [
            "使用 Node.js 20 或更高版本，并把 voice control 放在 `.client.*` files 中。",
          ],
          codeBlocks: [
            {
              label: "setup.sh",
              language: "bash",
              code: "npm create nuxt@latest navai-web-demo -- --template v3 --packageManager npm --no-install --gitInit=false --modules=\ncd navai-web-demo\nnpm install\nmkdir -p ai/functions-modules components composables pages",
            },
          ],
        },
        {
          id: "paso-2-instalar-dependencias-web",
          title: "步骤 2 安装依赖",
          description:
            "安装 NAVAI web runtime、realtime SDK 和 `zod`。Nuxt 已经内置 Vue Router、auto-imports 和 Vite pipeline。",
          bullets: ["在 Nuxt 中不需要手动再加 `vue-router`。"],
          codeBlocks: [
            {
              label: "install.sh",
              language: "bash",
              code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
            },
          ],
        },
        {
          id: "paso-3-configurar-variables-y-loaders-web",
          title: "步骤 3 配置 Env 与 loaders",
          description:
            "在 `.env` 中使用 `NUXT_PUBLIC_NAVAI_API_URL` 作为 browser backend URL，并在 `nuxt.config.ts` 中定义 `runtimeConfig.public.navaiApiUrl`。",
          bullets: [
            "让 `NAVAI_FUNCTIONS_FOLDERS` 和 `NAVAI_ROUTES_FILE` 继续指向 root 的 `ai/` directory。",
          ],
          codeBlocks: [
            {
              label: ".env",
              language: "ini",
              code: "NUXT_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=ai/functions-modules\nNAVAI_ROUTES_FILE=ai/routes.ts",
            },
            {
              label: "nuxt.config.ts",
              language: "ts",
              code: 'export default defineNuxtConfig({\n  runtimeConfig: {\n    public: {\n      navaiApiUrl: process.env.NUXT_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n    },\n  },\n});',
            },
          ],
        },
        {
          id: "paso-4-definir-rutas-navegables-web",
          title: "步骤 4 定义导航路由",
          description:
            "声明一个 `NavaiRoute[]` array，包含 names、paths 和 business synonyms，这样 agent 才能从自然语言解析 navigation。",
          bullets: [
            "只暴露真实且稳定的 routes；如果某个页面不应该被语音打开，就不要在这里发布。",
          ],
          codeBlocks: [
            {
              label: "ai/routes.ts",
              language: "typescript",
              code: 'import type { NavaiRoute } from "@navai/voice-frontend";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home dashboard",\n    synonyms: ["home", "dashboard", "start"],\n  },\n  {\n    name: "billing",\n    path: "/billing",\n    description: "Billing and subscription screen",\n    synonyms: ["billing", "payments", "subscription"],\n  },\n];',
            },
          ],
        },
        {
          id: "paso-5-crear-functions-locales-web",
          title: "步骤 5 定义函数",
          description:
            "先从一个很小的 frontend function 开始，确认 `execute_app_function` 会先执行 local code，再在需要时 fallback 到 backend。",
          bullets: [
            "Local functions 运行在 browser 中，因此可以在安全前提下访问 DOM、UI state 或 framework wrappers。",
          ],
          codeBlocks: [
            {
              label: "ai/functions-modules/show_welcome_banner.ts",
              language: "typescript",
              code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
            },
          ],
        },
        {
          id: "paso-6-integrar-runtime-web",
          title: "步骤 6 集成 Web runtime",
          description:
            "为 voice session 创建 client-only composable，把它接到 `useRouter()`，并在 `app.vue` 的 `ClientOnly` 中挂载 `VoiceNavigator`。",
          bullets: [
            "`.client` 后缀可以避免 microphone control 被 server-side rendering。",
          ],
          codeBlocks: [
            {
              label: "composables/useNavaiVoice.client.ts",
              language: "ts",
              code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "~/ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "~/ai/generated-module-loaders";\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const nuxtRuntimeConfig = useRuntimeConfig();\n  const env = {\n    NAVAI_API_URL: nuxtRuntimeConfig.public.navaiApiUrl ?? "http://localhost:3000",\n    NAVAI_FUNCTIONS_FOLDERS: "ai/functions-modules",\n    NAVAI_ROUTES_FILE: "ai/routes.ts",\n  };\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ apiBaseUrl: env.NAVAI_API_URL });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const resolvedRuntime = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env,\n      });\n      const requestPayload = resolvedRuntime.modelOverride ? { model: resolvedRuntime.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: resolvedRuntime.routes,\n        functionModuleLoaders: resolvedRuntime.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (resolvedRuntime.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: resolvedRuntime.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
            },
            {
              label: "components/VoiceNavigator.client.vue",
              language: "vue",
              code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Nuxt + NAVAI</span>\n      <h2>Keep the Orb mounted while pages change.</h2>\n      <p>Start NAVAI here and keep the same session alive across Home and Billing.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
            },
            {
              label: "app.vue",
              language: "vue",
              code: "<template>\n  <NuxtLayout>\n    <ClientOnly>\n      <VoiceNavigator />\n    </ClientOnly>\n\n    <NuxtPage />\n  </NuxtLayout>\n</template>",
            },
            {
              label: "pages/index.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Home</h1>\n    <p>Ask NAVAI to open Billing.</p>\n  </main>\n</template>",
            },
            {
              label: "pages/billing.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing page ready for NAVAI.</p>\n  </main>\n</template>",
            },
          ],
        },
        {
          id: "paso-7-probar-integracion-web",
          title: "步骤 7 测试 Web integration",
          description:
            "重新生成 loaders，启动 Nuxt，并验证在 pages 之间切换时 session 仍然保持活动。",
          bullets: [
            "在同一条 session 中测试一次 path navigation 和一次 backend function。",
          ],
          codeBlocks: [
            {
              label: "generate-loaders.sh",
              language: "bash",
              code: "npm exec navai-generate-web-loaders -- --output-file ai/generated-module-loaders.ts",
            },
            {
              label: "npm-run-dev.sh",
              language: "bash",
              code: "npm run dev",
            },
            {
              label: "checklist.txt",
              language: "text",
              code: "1. 如果 backend 还没有启动，请先从 /documentation/installation-api 启动它。\n2. 生成 loaders 并启动所选的 web stack。\n3. 在 browser 中打开 app，并授权 microphone permission。\n4. 让 NAVAI 打开 Billing 并执行 show welcome banner。\n5. 再触发一个 backend function，确认 HTTP bridge 正常响应。",
            },
          ],
        },
      ],
    },
    ja: {
      value: "nuxt",
      label: "Nuxt",
      title: "Nuxt 3",
      description:
        "File-based routing、public runtime config、client-only の voice mount を備えた full-stack Vue framework です。",
      sections: [
        {
          id: "paso-1-crear-proyecto-web",
          title: "ステップ 1 Web プロジェクトを作成",
          description:
            "Nuxt 3 project を作成し、root に `ai`、`components`、`composables` を用意して、NAVAI が pages と layouts と共存できるようにします。",
          bullets: [
            "Node.js 20 以上を使い、voice control は `.client.*` files に置いてください。",
          ],
          codeBlocks: [
            {
              label: "setup.sh",
              language: "bash",
              code: "npm create nuxt@latest navai-web-demo -- --template v3 --packageManager npm --no-install --gitInit=false --modules=\ncd navai-web-demo\nnpm install\nmkdir -p ai/functions-modules components composables pages",
            },
          ],
        },
        {
          id: "paso-2-instalar-dependencias-web",
          title: "ステップ 2 依存関係をインストール",
          description:
            "NAVAI web runtime、realtime SDK、`zod` を install します。Nuxt には Vue Router、auto-imports、Vite pipeline が既に含まれます。",
          bullets: ["Nuxt では `vue-router` を別途追加する必要はありません。"],
          codeBlocks: [
            {
              label: "install.sh",
              language: "bash",
              code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
            },
          ],
        },
        {
          id: "paso-3-configurar-variables-y-loaders-web",
          title: "ステップ 3 Env と loaders を設定",
          description:
            "Browser backend URL 用に `.env` で `NUXT_PUBLIC_NAVAI_API_URL` を使い、`nuxt.config.ts` で `runtimeConfig.public.navaiApiUrl` を定義します。",
          bullets: [
            "`NAVAI_FUNCTIONS_FOLDERS` と `NAVAI_ROUTES_FILE` は root の `ai/` directory を指すように保ってください。",
          ],
          codeBlocks: [
            {
              label: ".env",
              language: "ini",
              code: "NUXT_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=ai/functions-modules\nNAVAI_ROUTES_FILE=ai/routes.ts",
            },
            {
              label: "nuxt.config.ts",
              language: "ts",
              code: 'export default defineNuxtConfig({\n  runtimeConfig: {\n    public: {\n      navaiApiUrl: process.env.NUXT_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n    },\n  },\n});',
            },
          ],
        },
        {
          id: "paso-4-definir-rutas-navegables-web",
          title: "ステップ 4 ナビゲーションルートを定義",
          description:
            "自然言語から navigation を解決できるように、names、paths、business synonyms を持つ `NavaiRoute[]` array を定義してください。",
          bullets: [
            "Voice で開いてよい stable な routes だけを公開してください。",
          ],
          codeBlocks: [
            {
              label: "ai/routes.ts",
              language: "typescript",
              code: 'import type { NavaiRoute } from "@navai/voice-frontend";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home dashboard",\n    synonyms: ["home", "dashboard", "start"],\n  },\n  {\n    name: "billing",\n    path: "/billing",\n    description: "Billing and subscription screen",\n    synonyms: ["billing", "payments", "subscription"],\n  },\n];',
            },
          ],
        },
        {
          id: "paso-5-crear-functions-locales-web",
          title: "ステップ 5 関数を定義",
          description:
            "まず小さな frontend function から始めて、`execute_app_function` が backend fallback の前に local code を解決することを確認してください。",
          bullets: [
            "Local functions は browser で動くため、DOM、UI state、framework wrappers を安全な範囲で扱えます。",
          ],
          codeBlocks: [
            {
              label: "ai/functions-modules/show_welcome_banner.ts",
              language: "typescript",
              code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
            },
          ],
        },
        {
          id: "paso-6-integrar-runtime-web",
          title: "ステップ 6 Web runtime を統合",
          description:
            "Voice session 用の client-only composable を作成し、`useRouter()` に接続して、`app.vue` の `ClientOnly` 内に `VoiceNavigator` を mount します。",
          bullets: [
            "`.client` suffix により microphone control の server-side rendering を避けられます。",
          ],
          codeBlocks: [
            {
              label: "composables/useNavaiVoice.client.ts",
              language: "ts",
              code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "~/ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "~/ai/generated-module-loaders";\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const nuxtRuntimeConfig = useRuntimeConfig();\n  const env = {\n    NAVAI_API_URL: nuxtRuntimeConfig.public.navaiApiUrl ?? "http://localhost:3000",\n    NAVAI_FUNCTIONS_FOLDERS: "ai/functions-modules",\n    NAVAI_ROUTES_FILE: "ai/routes.ts",\n  };\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ apiBaseUrl: env.NAVAI_API_URL });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const resolvedRuntime = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env,\n      });\n      const requestPayload = resolvedRuntime.modelOverride ? { model: resolvedRuntime.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: resolvedRuntime.routes,\n        functionModuleLoaders: resolvedRuntime.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (resolvedRuntime.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: resolvedRuntime.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
            },
            {
              label: "components/VoiceNavigator.client.vue",
              language: "vue",
              code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Nuxt + NAVAI</span>\n      <h2>Keep the Orb mounted while pages change.</h2>\n      <p>Start NAVAI here and keep the same session alive across Home and Billing.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
            },
            {
              label: "app.vue",
              language: "vue",
              code: "<template>\n  <NuxtLayout>\n    <ClientOnly>\n      <VoiceNavigator />\n    </ClientOnly>\n\n    <NuxtPage />\n  </NuxtLayout>\n</template>",
            },
            {
              label: "pages/index.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Home</h1>\n    <p>Ask NAVAI to open Billing.</p>\n  </main>\n</template>",
            },
            {
              label: "pages/billing.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing page ready for NAVAI.</p>\n  </main>\n</template>",
            },
          ],
        },
        {
          id: "paso-7-probar-integracion-web",
          title: "ステップ 7 Web integration をテスト",
          description:
            "Loaders を再生成し、Nuxt を起動して、pages を移動しても session が維持されることを確認します。",
          bullets: [
            "同じ session で 1 つの path navigation と 1 つの backend function を test してください。",
          ],
          codeBlocks: [
            {
              label: "generate-loaders.sh",
              language: "bash",
              code: "npm exec navai-generate-web-loaders -- --output-file ai/generated-module-loaders.ts",
            },
            {
              label: "npm-run-dev.sh",
              language: "bash",
              code: "npm run dev",
            },
            {
              label: "checklist.txt",
              language: "text",
              code: "1. Backend がまだ起動していない場合は /documentation/installation-api から起動します。\n2. Loaders を生成し、選択した web stack を起動します。\n3. Browser で app を開き、microphone permission を許可します。\n4. NAVAI に Billing を開いて show welcome banner を実行するよう依頼します。\n5. Backend function も 1 つ実行し、HTTP bridge が応答することを確認します。",
            },
          ],
        },
      ],
    },
    ru: {
      value: "nuxt",
      label: "Nuxt",
      title: "Nuxt 3",
      description:
        "Full-stack Vue framework с file-based routing, public runtime config и client-only монтированием voice control.",
      sections: [
        {
          id: "paso-1-crear-proyecto-web",
          title: "Шаг 1 Создать web-проект",
          description:
            "Создайте Nuxt 3 project и подготовьте в корне `ai`, `components` и `composables`, чтобы NAVAI жил рядом с pages и layouts.",
          bullets: [
            "Используйте Node.js 20 или новее и держите voice control в `.client.*` files.",
          ],
          codeBlocks: [
            {
              label: "setup.sh",
              language: "bash",
              code: "npm create nuxt@latest navai-web-demo -- --template v3 --packageManager npm --no-install --gitInit=false --modules=\ncd navai-web-demo\nnpm install\nmkdir -p ai/functions-modules components composables pages",
            },
          ],
        },
        {
          id: "paso-2-instalar-dependencias-web",
          title: "Шаг 2 Установить зависимости",
          description:
            "Установите NAVAI web runtime, realtime SDK и `zod`. Nuxt уже включает Vue Router, auto-imports и Vite pipeline.",
          bullets: ["В Nuxt не нужно отдельно добавлять `vue-router`."],
          codeBlocks: [
            {
              label: "install.sh",
              language: "bash",
              code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
            },
          ],
        },
        {
          id: "paso-3-configurar-variables-y-loaders-web",
          title: "Шаг 3 Настроить env и loaders",
          description:
            "Используйте `.env` с `NUXT_PUBLIC_NAVAI_API_URL` для browser backend URL и определите `runtimeConfig.public.navaiApiUrl` в `nuxt.config.ts`.",
          bullets: [
            "Держите `NAVAI_FUNCTIONS_FOLDERS` и `NAVAI_ROUTES_FILE` направленными на корневую директорию `ai/`.",
          ],
          codeBlocks: [
            {
              label: ".env",
              language: "ini",
              code: "NUXT_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=ai/functions-modules\nNAVAI_ROUTES_FILE=ai/routes.ts",
            },
            {
              label: "nuxt.config.ts",
              language: "ts",
              code: 'export default defineNuxtConfig({\n  runtimeConfig: {\n    public: {\n      navaiApiUrl: process.env.NUXT_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n    },\n  },\n});',
            },
          ],
        },
        {
          id: "paso-4-definir-rutas-navegables-web",
          title: "Шаг 4 Определить маршруты навигации",
          description:
            "Опишите массив `NavaiRoute[]` с names, paths и business synonyms, чтобы агент мог разрешать navigation из естественного языка.",
          bullets: [
            "Публикуйте только реальные и стабильные routes; если экран не должен открываться голосом, не добавляйте его сюда.",
          ],
          codeBlocks: [
            {
              label: "ai/routes.ts",
              language: "typescript",
              code: 'import type { NavaiRoute } from "@navai/voice-frontend";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home dashboard",\n    synonyms: ["home", "dashboard", "start"],\n  },\n  {\n    name: "billing",\n    path: "/billing",\n    description: "Billing and subscription screen",\n    synonyms: ["billing", "payments", "subscription"],\n  },\n];',
            },
          ],
        },
        {
          id: "paso-5-crear-functions-locales-web",
          title: "Шаг 5 Определить функции",
          description:
            "Начните с небольшой frontend function, чтобы проверить, что `execute_app_function` сначала выполняет local code, а затем при необходимости уходит в backend fallback.",
          bullets: [
            "Local functions выполняются в browser, поэтому могут работать с DOM, UI state и framework wrappers, если это безопасно.",
          ],
          codeBlocks: [
            {
              label: "ai/functions-modules/show_welcome_banner.ts",
              language: "typescript",
              code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
            },
          ],
        },
        {
          id: "paso-6-integrar-runtime-web",
          title: "Шаг 6 Интегрировать web runtime",
          description:
            "Создайте client-only composable для voice session, свяжите его с `useRouter()` и смонтируйте `VoiceNavigator` внутри `ClientOnly` в `app.vue`.",
          bullets: [
            "Суффикс `.client` предотвращает server-side rendering микрофонного control.",
          ],
          codeBlocks: [
            {
              label: "composables/useNavaiVoice.client.ts",
              language: "ts",
              code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "~/ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "~/ai/generated-module-loaders";\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const nuxtRuntimeConfig = useRuntimeConfig();\n  const env = {\n    NAVAI_API_URL: nuxtRuntimeConfig.public.navaiApiUrl ?? "http://localhost:3000",\n    NAVAI_FUNCTIONS_FOLDERS: "ai/functions-modules",\n    NAVAI_ROUTES_FILE: "ai/routes.ts",\n  };\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ apiBaseUrl: env.NAVAI_API_URL });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const resolvedRuntime = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env,\n      });\n      const requestPayload = resolvedRuntime.modelOverride ? { model: resolvedRuntime.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: resolvedRuntime.routes,\n        functionModuleLoaders: resolvedRuntime.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (resolvedRuntime.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: resolvedRuntime.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
            },
            {
              label: "components/VoiceNavigator.client.vue",
              language: "vue",
              code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Nuxt + NAVAI</span>\n      <h2>Keep the Orb mounted while pages change.</h2>\n      <p>Start NAVAI here and keep the same session alive across Home and Billing.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
            },
            {
              label: "app.vue",
              language: "vue",
              code: "<template>\n  <NuxtLayout>\n    <ClientOnly>\n      <VoiceNavigator />\n    </ClientOnly>\n\n    <NuxtPage />\n  </NuxtLayout>\n</template>",
            },
            {
              label: "pages/index.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Home</h1>\n    <p>Ask NAVAI to open Billing.</p>\n  </main>\n</template>",
            },
            {
              label: "pages/billing.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing page ready for NAVAI.</p>\n  </main>\n</template>",
            },
          ],
        },
        {
          id: "paso-7-probar-integracion-web",
          title: "Шаг 7 Проверить web integration",
          description:
            "Перегенерируйте loaders, запустите Nuxt и проверьте, что session остается активной при переходах между pages.",
          bullets: [
            "Проверьте одну path navigation и одну backend function в рамках одной session.",
          ],
          codeBlocks: [
            {
              label: "generate-loaders.sh",
              language: "bash",
              code: "npm exec navai-generate-web-loaders -- --output-file ai/generated-module-loaders.ts",
            },
            {
              label: "npm-run-dev.sh",
              language: "bash",
              code: "npm run dev",
            },
            {
              label: "checklist.txt",
              language: "text",
              code: "1. Запустите backend из /documentation/installation-api, если он еще не поднят.\n2. Сгенерируйте loaders и запустите выбранный web stack.\n3. Откройте приложение в browser и разрешите доступ к микрофону.\n4. Попросите NAVAI открыть Billing и выполнить show welcome banner.\n5. Также вызовите одну backend function, чтобы убедиться, что HTTP bridge отвечает.",
            },
          ],
        },
      ],
    },
    ko: {
      value: "nuxt",
      label: "Nuxt",
      title: "Nuxt 3",
      description:
        "File-based routing, public runtime config, client-only voice mount 를 갖춘 full-stack Vue framework 입니다.",
      sections: [
        {
          id: "paso-1-crear-proyecto-web",
          title: "1단계 Web 프로젝트 생성",
          description:
            "Nuxt 3 project 를 만들고 root 에 `ai`, `components`, `composables` 를 준비해 NAVAI 가 pages 와 layouts 옆에서 동작하게 하세요.",
          bullets: [
            "Node.js 20 이상을 사용하고 voice control 은 `.client.*` files 안에 두세요.",
          ],
          codeBlocks: [
            {
              label: "setup.sh",
              language: "bash",
              code: "npm create nuxt@latest navai-web-demo -- --template v3 --packageManager npm --no-install --gitInit=false --modules=\ncd navai-web-demo\nnpm install\nmkdir -p ai/functions-modules components composables pages",
            },
          ],
        },
        {
          id: "paso-2-instalar-dependencias-web",
          title: "2단계 Dependencies 설치",
          description:
            "NAVAI web runtime, realtime SDK, `zod` 를 설치하세요. Nuxt 는 Vue Router, auto-imports, Vite pipeline 을 이미 제공합니다.",
          bullets: ["Nuxt 에서는 `vue-router` 를 따로 추가할 필요가 없습니다."],
          codeBlocks: [
            {
              label: "install.sh",
              language: "bash",
              code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
            },
          ],
        },
        {
          id: "paso-3-configurar-variables-y-loaders-web",
          title: "3단계 Env 와 loaders 설정",
          description:
            "Browser backend URL 용으로 `.env` 에 `NUXT_PUBLIC_NAVAI_API_URL` 을 두고 `nuxt.config.ts` 에 `runtimeConfig.public.navaiApiUrl` 을 정의하세요.",
          bullets: [
            "`NAVAI_FUNCTIONS_FOLDERS` 와 `NAVAI_ROUTES_FILE` 는 root `ai/` directory 를 가리키게 유지하세요.",
          ],
          codeBlocks: [
            {
              label: ".env",
              language: "ini",
              code: "NUXT_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=ai/functions-modules\nNAVAI_ROUTES_FILE=ai/routes.ts",
            },
            {
              label: "nuxt.config.ts",
              language: "ts",
              code: 'export default defineNuxtConfig({\n  runtimeConfig: {\n    public: {\n      navaiApiUrl: process.env.NUXT_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n    },\n  },\n});',
            },
          ],
        },
        {
          id: "paso-4-definir-rutas-navegables-web",
          title: "4단계 내비게이션 라우트 정의",
          description:
            "자연어에서 navigation 을 해석할 수 있도록 names, paths, business synonyms 를 포함한 `NavaiRoute[]` array 를 선언하세요.",
          bullets: ["Voice 로 열어도 되는 stable 한 routes 만 공개하세요."],
          codeBlocks: [
            {
              label: "ai/routes.ts",
              language: "typescript",
              code: 'import type { NavaiRoute } from "@navai/voice-frontend";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home dashboard",\n    synonyms: ["home", "dashboard", "start"],\n  },\n  {\n    name: "billing",\n    path: "/billing",\n    description: "Billing and subscription screen",\n    synonyms: ["billing", "payments", "subscription"],\n  },\n];',
            },
          ],
        },
        {
          id: "paso-5-crear-functions-locales-web",
          title: "5단계 함수 정의",
          description:
            "먼저 작은 frontend function 으로 시작해서 `execute_app_function` 이 backend fallback 전에 local code 를 먼저 실행하는지 확인하세요.",
          bullets: [
            "Local functions 는 browser 에서 실행되므로 DOM, UI state, framework wrappers 를 안전한 범위에서 다룰 수 있습니다.",
          ],
          codeBlocks: [
            {
              label: "ai/functions-modules/show_welcome_banner.ts",
              language: "typescript",
              code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
            },
          ],
        },
        {
          id: "paso-6-integrar-runtime-web",
          title: "6단계 Web runtime 통합",
          description:
            "Voice session 용 client-only composable 을 만들고 `useRouter()` 와 연결한 뒤 `app.vue` 의 `ClientOnly` 안에 `VoiceNavigator` 를 mount 하세요.",
          bullets: [
            "`.client` suffix 는 microphone control 의 server-side rendering 을 막아 줍니다.",
          ],
          codeBlocks: [
            {
              label: "composables/useNavaiVoice.client.ts",
              language: "ts",
              code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "~/ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "~/ai/generated-module-loaders";\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const nuxtRuntimeConfig = useRuntimeConfig();\n  const env = {\n    NAVAI_API_URL: nuxtRuntimeConfig.public.navaiApiUrl ?? "http://localhost:3000",\n    NAVAI_FUNCTIONS_FOLDERS: "ai/functions-modules",\n    NAVAI_ROUTES_FILE: "ai/routes.ts",\n  };\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ apiBaseUrl: env.NAVAI_API_URL });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const resolvedRuntime = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env,\n      });\n      const requestPayload = resolvedRuntime.modelOverride ? { model: resolvedRuntime.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: resolvedRuntime.routes,\n        functionModuleLoaders: resolvedRuntime.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (resolvedRuntime.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: resolvedRuntime.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
            },
            {
              label: "components/VoiceNavigator.client.vue",
              language: "vue",
              code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Nuxt + NAVAI</span>\n      <h2>Keep the Orb mounted while pages change.</h2>\n      <p>Start NAVAI here and keep the same session alive across Home and Billing.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
            },
            {
              label: "app.vue",
              language: "vue",
              code: "<template>\n  <NuxtLayout>\n    <ClientOnly>\n      <VoiceNavigator />\n    </ClientOnly>\n\n    <NuxtPage />\n  </NuxtLayout>\n</template>",
            },
            {
              label: "pages/index.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Home</h1>\n    <p>Ask NAVAI to open Billing.</p>\n  </main>\n</template>",
            },
            {
              label: "pages/billing.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing page ready for NAVAI.</p>\n  </main>\n</template>",
            },
          ],
        },
        {
          id: "paso-7-probar-integracion-web",
          title: "7단계 Web integration 테스트",
          description:
            "Loaders 를 다시 생성하고 Nuxt 를 시작해 pages 이동 중에도 session 이 유지되는지 확인하세요.",
          bullets: [
            "같은 session 에서 path navigation 하나와 backend function 하나를 테스트하세요.",
          ],
          codeBlocks: [
            {
              label: "generate-loaders.sh",
              language: "bash",
              code: "npm exec navai-generate-web-loaders -- --output-file ai/generated-module-loaders.ts",
            },
            {
              label: "npm-run-dev.sh",
              language: "bash",
              code: "npm run dev",
            },
            {
              label: "checklist.txt",
              language: "text",
              code: "1. Backend 가 아직 실행 중이 아니면 /documentation/installation-api 에서 먼저 시작하세요.\n2. Loaders 를 생성하고 선택한 web stack 을 시작하세요.\n3. Browser 에서 app 을 열고 microphone permission 을 허용하세요.\n4. NAVAI 에게 Billing 을 열고 show welcome banner 를 실행하라고 요청하세요.\n5. Backend function 도 하나 실행해 HTTP bridge 응답을 확인하세요.",
            },
          ],
        },
      ],
    },
    hi: {
      value: "nuxt",
      label: "Nuxt",
      title: "Nuxt 3",
      description:
        "File-based routing, public runtime config और client-only voice mount वाला full-stack Vue framework.",
      sections: [
        {
          id: "paso-1-crear-proyecto-web",
          title: "चरण 1 Web project बनाएं",
          description:
            "Nuxt 3 project बनाएं और root पर `ai`, `components` और `composables` तैयार करें ताकि NAVAI pages और layouts के साथ रहे.",
          bullets: [
            "Node.js 20 या उससे नया उपयोग करें और voice control को `.client.*` files में रखें.",
          ],
          codeBlocks: [
            {
              label: "setup.sh",
              language: "bash",
              code: "npm create nuxt@latest navai-web-demo -- --template v3 --packageManager npm --no-install --gitInit=false --modules=\ncd navai-web-demo\nnpm install\nmkdir -p ai/functions-modules components composables pages",
            },
          ],
        },
        {
          id: "paso-2-instalar-dependencias-web",
          title: "चरण 2 Dependencies install करें",
          description:
            "NAVAI web runtime, realtime SDK और `zod` install करें। Nuxt पहले से Vue Router, auto-imports और Vite pipeline देता है.",
          bullets: ["Nuxt में `vue-router` अलग से जोड़ने की जरूरत नहीं है."],
          codeBlocks: [
            {
              label: "install.sh",
              language: "bash",
              code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
            },
          ],
        },
        {
          id: "paso-3-configurar-variables-y-loaders-web",
          title: "चरण 3 Env और loaders configure करें",
          description:
            "Browser backend URL के लिए `.env` में `NUXT_PUBLIC_NAVAI_API_URL` रखें और `nuxt.config.ts` में `runtimeConfig.public.navaiApiUrl` define करें.",
          bullets: [
            "`NAVAI_FUNCTIONS_FOLDERS` और `NAVAI_ROUTES_FILE` को root `ai/` directory पर point करते रखें.",
          ],
          codeBlocks: [
            {
              label: ".env",
              language: "ini",
              code: "NUXT_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=ai/functions-modules\nNAVAI_ROUTES_FILE=ai/routes.ts",
            },
            {
              label: "nuxt.config.ts",
              language: "ts",
              code: 'export default defineNuxtConfig({\n  runtimeConfig: {\n    public: {\n      navaiApiUrl: process.env.NUXT_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n    },\n  },\n});',
            },
          ],
        },
        {
          id: "paso-4-definir-rutas-navegables-web",
          title: "चरण 4 Navigation routes define करें",
          description:
            "एक `NavaiRoute[]` array declare करें जिसमें names, paths और business synonyms हों ताकि agent natural language से navigation resolve कर सके।",
          bullets: [
            "सिर्फ वही routes expose करें जो stable और वास्तव में voice के लिए उपलब्ध होनी चाहिए।",
          ],
          codeBlocks: [
            {
              label: "ai/routes.ts",
              language: "typescript",
              code: 'import type { NavaiRoute } from "@navai/voice-frontend";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home dashboard",\n    synonyms: ["home", "dashboard", "start"],\n  },\n  {\n    name: "billing",\n    path: "/billing",\n    description: "Billing and subscription screen",\n    synonyms: ["billing", "payments", "subscription"],\n  },\n];',
            },
          ],
        },
        {
          id: "paso-5-crear-functions-locales-web",
          title: "चरण 5 Functions define करें",
          description:
            "पहले एक छोटी frontend function से शुरू करें ताकि `execute_app_function` local code को backend fallback से पहले resolve करता है या नहीं, यह verify हो सके।",
          bullets: [
            "Local functions browser में चलती हैं, इसलिए वे DOM, UI state या framework wrappers को safely use कर सकती हैं।",
          ],
          codeBlocks: [
            {
              label: "ai/functions-modules/show_welcome_banner.ts",
              language: "typescript",
              code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
            },
          ],
        },
        {
          id: "paso-6-integrar-runtime-web",
          title: "चरण 6 Web runtime integrate करें",
          description:
            "Voice session के लिए client-only composable बनाएं, उसे `useRouter()` से wire करें और `app.vue` में `ClientOnly` के अंदर `VoiceNavigator` mount करें.",
          bullets: [
            "`.client` suffix microphone control को server-side render होने से रोकता है.",
          ],
          codeBlocks: [
            {
              label: "composables/useNavaiVoice.client.ts",
              language: "ts",
              code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "~/ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "~/ai/generated-module-loaders";\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const nuxtRuntimeConfig = useRuntimeConfig();\n  const env = {\n    NAVAI_API_URL: nuxtRuntimeConfig.public.navaiApiUrl ?? "http://localhost:3000",\n    NAVAI_FUNCTIONS_FOLDERS: "ai/functions-modules",\n    NAVAI_ROUTES_FILE: "ai/routes.ts",\n  };\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ apiBaseUrl: env.NAVAI_API_URL });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const resolvedRuntime = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env,\n      });\n      const requestPayload = resolvedRuntime.modelOverride ? { model: resolvedRuntime.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: resolvedRuntime.routes,\n        functionModuleLoaders: resolvedRuntime.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (resolvedRuntime.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: resolvedRuntime.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
            },
            {
              label: "components/VoiceNavigator.client.vue",
              language: "vue",
              code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Nuxt + NAVAI</span>\n      <h2>Keep the Orb mounted while pages change.</h2>\n      <p>Start NAVAI here and keep the same session alive across Home and Billing.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
            },
            {
              label: "app.vue",
              language: "vue",
              code: "<template>\n  <NuxtLayout>\n    <ClientOnly>\n      <VoiceNavigator />\n    </ClientOnly>\n\n    <NuxtPage />\n  </NuxtLayout>\n</template>",
            },
            {
              label: "pages/index.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Home</h1>\n    <p>Ask NAVAI to open Billing.</p>\n  </main>\n</template>",
            },
            {
              label: "pages/billing.vue",
              language: "vue",
              code: "<template>\n  <main>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing page ready for NAVAI.</p>\n  </main>\n</template>",
            },
          ],
        },
        {
          id: "paso-7-probar-integracion-web",
          title: "चरण 7 Web integration test करें",
          description:
            "Loaders regenerate करें, Nuxt start करें और validate करें कि pages बदलने पर भी session सक्रिय रहे.",
          bullets: [
            "उसी session में एक path navigation और एक backend function test करें.",
          ],
          codeBlocks: [
            {
              label: "generate-loaders.sh",
              language: "bash",
              code: "npm exec navai-generate-web-loaders -- --output-file ai/generated-module-loaders.ts",
            },
            {
              label: "npm-run-dev.sh",
              language: "bash",
              code: "npm run dev",
            },
            {
              label: "checklist.txt",
              language: "text",
              code: "1. यदि backend अभी चालू नहीं है तो /documentation/installation-api से उसे शुरू करें।\n2. Loaders generate करें और चुना गया web stack start करें।\n3. Browser में app खोलें और microphone permission दें।\n4. NAVAI से Billing खोलने और show welcome banner चलाने को कहें।\n5. एक backend function भी चलाएं ताकि HTTP bridge का response verify हो सके।",
            },
          ],
        },
      ],
    },
  };

export function getWebNuxtGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return getLocalizedInstallationGuideTab(WEB_NUXT_GUIDE_TABS, language);
}
