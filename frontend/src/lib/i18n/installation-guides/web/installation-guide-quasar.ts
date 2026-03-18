import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";

const WEB_QUASAR_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  en: {
    value: "quasar",
    label: "Quasar",
    title: "Quasar",
    description:
      "Quasar SPA on top of Vue with a voice control integrated into layouts and Quasar UI components.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Step 1 Create the web project",
        description:
          "Create the app with Quasar CLI on top of Vite + TypeScript and prepare `ai`, `composables`, and `components` from day one.",
        bullets: [
          "Stay in SPA mode first and add SSR only after the voice session is stable.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm init quasar@latest navai-web-demo -- --nogit\n# In the wizard choose: App with Quasar CLI -> Typescript -> Quasar App CLI with Vite -> Composition API with <script setup> -> Sass with SCSS syntax.\n# When prompted to install dependencies, choose No; the next line runs npm install explicitly.\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Step 2 Install dependencies",
        description:
          "Install NAVAI packages. Quasar already ships Vue, router, and the visual layer used by the voice control.",
        bullets: [
          "Use the local project commands so Quasar versions stay aligned with the scaffold.",
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
        title: "Step 3 Configure env and loaders",
        description:
          "Configure `.env` with `VITE_NAVAI_API_URL` and keep NAVAI paths inside `src/ai` so Quasar and the CLI point to the same tree.",
        bullets: [
          "If you later move to SSR, re-check which values are safe to expose to client code.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "VITE_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
            label: "src/ai/routes.ts",
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
            label: "src/ai/functions-modules/show_welcome_banner.ts",
            language: "typescript",
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "Step 6 Integrate the web runtime",
        description:
          "Wrap the imperative NAVAI session in a composable, publish it through a Quasar component, and mount it in the main layout.",
        bullets: [
          "Quasar layouts are the easiest place to keep one persistent microphone control across route changes.",
        ],
        codeBlocks: [
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <div class="column q-gutter-md">\n    <div ref="orbHost"></div>\n    <q-banner dense class="bg-grey-2 text-dark" data-navai-status>\n      Voice demo ready for local actions.\n    </q-banner>\n  </div>\n</template>',
          },
          {
            label: "src/layouts/MainLayout.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport VoiceNavigator from "../components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <q-layout view="lHh Lpr lFf">\n    <q-header bordered class="bg-white text-dark">\n      <q-toolbar class="row items-center justify-between">\n        <q-toolbar-title>NAVAI Demo</q-toolbar-title>\n      </q-toolbar>\n    </q-header>\n\n    <q-page-container>\n      <div class="q-px-md q-pt-md">\n        <VoiceNavigator />\n      </div>\n      <router-view />\n    </q-page-container>\n  </q-layout>\n</template>',
          },
          {
            label: "src/router/routes.ts",
            language: "ts",
            code: 'import type { RouteRecordRaw } from "vue-router";\n\nconst routes: RouteRecordRaw[] = [\n  {\n    path: "/",\n    component: () => import("../layouts/MainLayout.vue"),\n    children: [\n      {\n        path: "",\n        component: () => import("../pages/IndexPage.vue"),\n      },\n      {\n        path: "billing",\n        component: () => import("../pages/BillingPage.vue"),\n      },\n    ],\n  },\n];\n\nexport default routes;',
          },
          {
            label: "src/pages/BillingPage.vue",
            language: "vue",
            code: '<template>\n  <q-page padding class="column q-gutter-md">\n    <div class="text-h4">Billing</div>\n    <div data-navai-status class="text-body1">Billing page ready for NAVAI.</div>\n  </q-page>\n</template>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Step 7 Test the web integration",
        description:
          "Regenerate loaders, start Quasar, and validate that the voice control stays active even after NAVAI-triggered navigation.",
        bullets: [
          "Confirm that the component is not destroyed when the main route changes.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "quasar-dev.sh",
            language: "bash",
            code: "npx quasar dev",
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
    value: "quasar",
    label: "Quasar",
    title: "Quasar",
    description:
      "SPA Quasar basee sur Vue avec un controle vocal integre aux layouts et composants UI Quasar.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Etape 1 Creer le projet web",
        description:
          "Creez l app avec Quasar CLI sur Vite + TypeScript et preparez `ai`, `composables` et `components` des le debut.",
        bullets: [
          "Restez d abord en mode SPA et ajoutez SSR seulement apres avoir stabilise la session vocale.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm init quasar@latest navai-web-demo -- --nogit\n# In the wizard choose: App with Quasar CLI -> Typescript -> Quasar App CLI with Vite -> Composition API with <script setup> -> Sass with SCSS syntax.\n# When prompted to install dependencies, choose No; the next line runs npm install explicitly.\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Etape 2 Installer les dependances",
        description:
          "Installez les paquets NAVAI. Quasar apporte deja Vue, router et la couche visuelle du controle vocal.",
        bullets: [
          "Utilisez les commandes locales du projet pour garder les versions Quasar alignees avec le scaffold.",
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
          "Configurez `.env` avec `VITE_NAVAI_API_URL` et gardez les paths NAVAI dans `src/ai` pour que Quasar et le CLI pointent vers le meme arbre.",
        bullets: [
          "Si vous passez plus tard en SSR, reverifiez quelles valeurs peuvent etre exposees au client.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "VITE_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
            label: "src/ai/routes.ts",
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
            label: "src/ai/functions-modules/show_welcome_banner.ts",
            language: "typescript",
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "Etape 6 Integrer le runtime web",
        description:
          "Encapsulez la session imperative NAVAI dans un composable, exposez-la via un composant Quasar et montez-la dans le layout principal.",
        bullets: [
          "Les layouts Quasar sont l endroit le plus simple pour garder un micro persistant entre changements de route.",
        ],
        codeBlocks: [
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <div class="column q-gutter-md">\n    <div ref="orbHost"></div>\n    <q-banner dense class="bg-grey-2 text-dark" data-navai-status>\n      Voice demo ready for local actions.\n    </q-banner>\n  </div>\n</template>',
          },
          {
            label: "src/layouts/MainLayout.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport VoiceNavigator from "../components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <q-layout view="lHh Lpr lFf">\n    <q-header bordered class="bg-white text-dark">\n      <q-toolbar class="row items-center justify-between">\n        <q-toolbar-title>NAVAI Demo</q-toolbar-title>\n      </q-toolbar>\n    </q-header>\n\n    <q-page-container>\n      <div class="q-px-md q-pt-md">\n        <VoiceNavigator />\n      </div>\n      <router-view />\n    </q-page-container>\n  </q-layout>\n</template>',
          },
          {
            label: "src/router/routes.ts",
            language: "ts",
            code: 'import type { RouteRecordRaw } from "vue-router";\n\nconst routes: RouteRecordRaw[] = [\n  {\n    path: "/",\n    component: () => import("../layouts/MainLayout.vue"),\n    children: [\n      {\n        path: "",\n        component: () => import("../pages/IndexPage.vue"),\n      },\n      {\n        path: "billing",\n        component: () => import("../pages/BillingPage.vue"),\n      },\n    ],\n  },\n];\n\nexport default routes;',
          },
          {
            label: "src/pages/BillingPage.vue",
            language: "vue",
            code: '<template>\n  <q-page padding class="column q-gutter-md">\n    <div class="text-h4">Billing</div>\n    <div data-navai-status class="text-body1">Billing page ready for NAVAI.</div>\n  </q-page>\n</template>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Etape 7 Tester l integration web",
        description:
          "Regenerez les loaders, demarrez Quasar et validez que le controle vocal reste actif apres une navigation declenchee par NAVAI.",
        bullets: [
          "Confirmez que le composant n est pas detruit quand la route principale change.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "quasar-dev.sh",
            language: "bash",
            code: "npx quasar dev",
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
    value: "quasar",
    label: "Quasar",
    title: "Quasar",
    description:
      "SPA Quasar sobre Vue con un control de voz integrado en layouts y componentes UI propios de Quasar.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Paso 1 Crear el proyecto web",
        description:
          "Cree la app con Quasar CLI sobre Vite + TypeScript y prepare `ai`, `composables` y `components` desde el inicio.",
        bullets: [
          "Mantenga primero modo SPA; agregue SSR despues de estabilizar la sesion de voz.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm init quasar@latest navai-web-demo -- --nogit\n# In the wizard choose: App with Quasar CLI -> Typescript -> Quasar App CLI with Vite -> Composition API with <script setup> -> Sass with SCSS syntax.\n# When prompted to install dependencies, choose No; the next line runs npm install explicitly.\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Paso 2 Instalar dependencias",
        description:
          "Instale los paquetes de NAVAI. Quasar ya trae Vue, router y la capa visual que usara el boton de voz.",
        bullets: [
          "Use los comandos locales del proyecto para que la version de Quasar quede alineada con el scaffold.",
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
        title: "Paso 3 Configurar variables y loaders",
        description:
          "Configure `.env` con `VITE_NAVAI_API_URL` y deje las rutas NAVAI dentro de `src/ai` para que Quasar y el CLI apunten al mismo arbol.",
        bullets: [
          "Si luego migra a SSR, vuelva a revisar que datos son seguros para exponer al cliente.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "VITE_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
            label: "src/ai/routes.ts",
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
            label: "src/ai/functions-modules/show_welcome_banner.ts",
            language: "typescript",
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "Paso 6 Integrar el runtime web",
        description:
          "Envuelva la sesion imperativa de NAVAI en un composable, publiquela mediante un componente Quasar y montela en el layout principal.",
        bullets: [
          "Los layouts de Quasar son el lugar mas simple para conservar un microfono persistente entre paginas.",
        ],
        codeBlocks: [
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <div class="column q-gutter-md">\n    <div ref="orbHost"></div>\n    <q-banner dense class="bg-grey-2 text-dark" data-navai-status>\n      Voice demo ready for local actions.\n    </q-banner>\n  </div>\n</template>',
          },
          {
            label: "src/layouts/MainLayout.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport VoiceNavigator from "../components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <q-layout view="lHh Lpr lFf">\n    <q-header bordered class="bg-white text-dark">\n      <q-toolbar class="row items-center justify-between">\n        <q-toolbar-title>NAVAI Demo</q-toolbar-title>\n      </q-toolbar>\n    </q-header>\n\n    <q-page-container>\n      <div class="q-px-md q-pt-md">\n        <VoiceNavigator />\n      </div>\n      <router-view />\n    </q-page-container>\n  </q-layout>\n</template>',
          },
          {
            label: "src/router/routes.ts",
            language: "ts",
            code: 'import type { RouteRecordRaw } from "vue-router";\n\nconst routes: RouteRecordRaw[] = [\n  {\n    path: "/",\n    component: () => import("../layouts/MainLayout.vue"),\n    children: [\n      {\n        path: "",\n        component: () => import("../pages/IndexPage.vue"),\n      },\n      {\n        path: "billing",\n        component: () => import("../pages/BillingPage.vue"),\n      },\n    ],\n  },\n];\n\nexport default routes;',
          },
          {
            label: "src/pages/BillingPage.vue",
            language: "vue",
            code: '<template>\n  <q-page padding class="column q-gutter-md">\n    <div class="text-h4">Billing</div>\n    <div data-navai-status class="text-body1">Billing page ready for NAVAI.</div>\n  </q-page>\n</template>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Paso 7 Probar la integracion web",
        description:
          "Regenere loaders, arranque Quasar y valide que el control de voz siga activo incluso despues de navegar por orden de NAVAI.",
        bullets: [
          "Compruebe que el componente no se destruya cuando cambie la ruta principal.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "quasar-dev.sh",
            language: "bash",
            code: "npx quasar dev",
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
    value: "quasar",
    label: "Quasar",
    title: "Quasar",
    description:
      "SPA Quasar sobre Vue com um controle de voz integrado aos layouts e componentes de UI do Quasar.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Passo 1 Criar o projeto web",
        description:
          "Crie a app com Quasar CLI sobre Vite + TypeScript e prepare `ai`, `composables` e `components` desde o inicio.",
        bullets: [
          "Fique primeiro em modo SPA e adicione SSR so depois de estabilizar a sessao de voz.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm init quasar@latest navai-web-demo -- --nogit\n# In the wizard choose: App with Quasar CLI -> Typescript -> Quasar App CLI with Vite -> Composition API with <script setup> -> Sass with SCSS syntax.\n# When prompted to install dependencies, choose No; the next line runs npm install explicitly.\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Passo 2 Instalar dependencias",
        description:
          "Instale os pacotes do NAVAI. Quasar ja traz Vue, router e a camada visual que o controle de voz vai usar.",
        bullets: [
          "Use os comandos locais do projeto para manter as versoes do Quasar alinhadas com o scaffold.",
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
          "Configure `.env` com `VITE_NAVAI_API_URL` e mantenha os paths do NAVAI em `src/ai` para que Quasar e CLI apontem para a mesma arvore.",
        bullets: [
          "Se depois voce migrar para SSR, revise novamente quais valores podem ir para o cliente.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "VITE_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
            label: "src/ai/routes.ts",
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
            label: "src/ai/functions-modules/show_welcome_banner.ts",
            language: "typescript",
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "Passo 6 Integrar o runtime web",
        description:
          "Envolva a sessao imperativa do NAVAI em um composable, publique isso por um componente Quasar e monte no layout principal.",
        bullets: [
          "Layouts do Quasar sao o lugar mais simples para manter um microfone persistente entre mudancas de rota.",
        ],
        codeBlocks: [
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <div class="column q-gutter-md">\n    <div ref="orbHost"></div>\n    <q-banner dense class="bg-grey-2 text-dark" data-navai-status>\n      Voice demo ready for local actions.\n    </q-banner>\n  </div>\n</template>',
          },
          {
            label: "src/layouts/MainLayout.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport VoiceNavigator from "../components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <q-layout view="lHh Lpr lFf">\n    <q-header bordered class="bg-white text-dark">\n      <q-toolbar class="row items-center justify-between">\n        <q-toolbar-title>NAVAI Demo</q-toolbar-title>\n      </q-toolbar>\n    </q-header>\n\n    <q-page-container>\n      <div class="q-px-md q-pt-md">\n        <VoiceNavigator />\n      </div>\n      <router-view />\n    </q-page-container>\n  </q-layout>\n</template>',
          },
          {
            label: "src/router/routes.ts",
            language: "ts",
            code: 'import type { RouteRecordRaw } from "vue-router";\n\nconst routes: RouteRecordRaw[] = [\n  {\n    path: "/",\n    component: () => import("../layouts/MainLayout.vue"),\n    children: [\n      {\n        path: "",\n        component: () => import("../pages/IndexPage.vue"),\n      },\n      {\n        path: "billing",\n        component: () => import("../pages/BillingPage.vue"),\n      },\n    ],\n  },\n];\n\nexport default routes;',
          },
          {
            label: "src/pages/BillingPage.vue",
            language: "vue",
            code: '<template>\n  <q-page padding class="column q-gutter-md">\n    <div class="text-h4">Billing</div>\n    <div data-navai-status class="text-body1">Billing page ready for NAVAI.</div>\n  </q-page>\n</template>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Passo 7 Testar a integracao web",
        description:
          "Regenere loaders, inicie o Quasar e valide que o controle de voz continua ativo mesmo apos navegacao disparada pelo NAVAI.",
        bullets: [
          "Confirme que o componente nao e destruido quando a rota principal muda.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "quasar-dev.sh",
            language: "bash",
            code: "npx quasar dev",
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
    value: "quasar",
    label: "Quasar",
    title: "Quasar",
    description:
      "基于 Vue 的 Quasar SPA，voice control 集成在 layouts 与 Quasar UI components 中。",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "步骤 1 创建 Web 项目",
        description:
          "用 Quasar CLI 创建 Vite + TypeScript app，并从一开始就准备 `ai`、`composables`、`components`。",
        bullets: ["先保持 SPA mode，等 voice session 稳定后再引入 SSR。"],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm init quasar@latest navai-web-demo -- --nogit\n# In the wizard choose: App with Quasar CLI -> Typescript -> Quasar App CLI with Vite -> Composition API with <script setup> -> Sass with SCSS syntax.\n# When prompted to install dependencies, choose No; the next line runs npm install explicitly.\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "步骤 2 安装依赖",
        description:
          "安装 NAVAI packages。Quasar 已经提供 Vue、router 和 voice control 会使用的 UI layer。",
        bullets: [
          "优先使用项目内的 local commands，保持 Quasar 版本与 scaffold 对齐。",
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
        title: "步骤 3 配置 Env 与 loaders",
        description:
          "在 `.env` 中配置 `VITE_NAVAI_API_URL`，并把 NAVAI paths 放在 `src/ai`，让 Quasar 与 CLI 指向同一棵目录树。",
        bullets: [
          "如果后续迁移到 SSR，请重新检查哪些 values 可以安全暴露到 client。",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "VITE_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
            label: "src/ai/routes.ts",
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
            label: "src/ai/functions-modules/show_welcome_banner.ts",
            language: "typescript",
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "步骤 6 集成 Web runtime",
        description:
          "把 imperative NAVAI session 封装进 composable，通过 Quasar component 暴露，并挂载在 main layout 中。",
        bullets: [
          "Quasar layouts 是跨 route changes 保持 persistent microphone control 的最佳位置。",
        ],
        codeBlocks: [
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <div class="column q-gutter-md">\n    <div ref="orbHost"></div>\n    <q-banner dense class="bg-grey-2 text-dark" data-navai-status>\n      Voice demo ready for local actions.\n    </q-banner>\n  </div>\n</template>',
          },
          {
            label: "src/layouts/MainLayout.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport VoiceNavigator from "../components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <q-layout view="lHh Lpr lFf">\n    <q-header bordered class="bg-white text-dark">\n      <q-toolbar class="row items-center justify-between">\n        <q-toolbar-title>NAVAI Demo</q-toolbar-title>\n      </q-toolbar>\n    </q-header>\n\n    <q-page-container>\n      <div class="q-px-md q-pt-md">\n        <VoiceNavigator />\n      </div>\n      <router-view />\n    </q-page-container>\n  </q-layout>\n</template>',
          },
          {
            label: "src/router/routes.ts",
            language: "ts",
            code: 'import type { RouteRecordRaw } from "vue-router";\n\nconst routes: RouteRecordRaw[] = [\n  {\n    path: "/",\n    component: () => import("../layouts/MainLayout.vue"),\n    children: [\n      {\n        path: "",\n        component: () => import("../pages/IndexPage.vue"),\n      },\n      {\n        path: "billing",\n        component: () => import("../pages/BillingPage.vue"),\n      },\n    ],\n  },\n];\n\nexport default routes;',
          },
          {
            label: "src/pages/BillingPage.vue",
            language: "vue",
            code: '<template>\n  <q-page padding class="column q-gutter-md">\n    <div class="text-h4">Billing</div>\n    <div data-navai-status class="text-body1">Billing page ready for NAVAI.</div>\n  </q-page>\n</template>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "步骤 7 测试 Web integration",
        description:
          "重新生成 loaders，启动 Quasar，并验证即使发生 NAVAI-triggered navigation，control 仍然保持 active。",
        bullets: ["确认 main route 变化时 component 不会被销毁。"],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "quasar-dev.sh",
            language: "bash",
            code: "npx quasar dev",
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
    value: "quasar",
    label: "Quasar",
    title: "Quasar",
    description:
      "Vue ベースの Quasar SPA で、voice control を layouts と Quasar UI components に組み込みます。",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "ステップ 1 Web プロジェクトを作成",
        description:
          "Quasar CLI で Vite + TypeScript app を作成し、最初から `ai`、`composables`、`components` を準備します。",
        bullets: [
          "まずは SPA mode で進め、voice session が安定してから SSR を追加してください。",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm init quasar@latest navai-web-demo -- --nogit\n# In the wizard choose: App with Quasar CLI -> Typescript -> Quasar App CLI with Vite -> Composition API with <script setup> -> Sass with SCSS syntax.\n# When prompted to install dependencies, choose No; the next line runs npm install explicitly.\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "ステップ 2 依存関係をインストール",
        description:
          "NAVAI packages を install します。Quasar には Vue、router、voice control が使う UI layer が既にあります。",
        bullets: [
          "Quasar versions を scaffold と揃えるために project local commands を使ってください。",
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
        title: "ステップ 3 Env と loaders を設定",
        description:
          "`.env` に `VITE_NAVAI_API_URL` を設定し、NAVAI paths は `src/ai` に置いて Quasar と CLI が同じ tree を参照するようにします。",
        bullets: [
          "後で SSR に移る場合は、client へ公開してよい values を再確認してください。",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "VITE_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
            label: "src/ai/routes.ts",
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
            label: "src/ai/functions-modules/show_welcome_banner.ts",
            language: "typescript",
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "ステップ 6 Web runtime を統合",
        description:
          "Imperative NAVAI session を composable に包み、Quasar component 経由で公開し、main layout に mount します。",
        bullets: [
          "Quasar layouts は route changes をまたいで microphone control を残す最も簡単な場所です。",
        ],
        codeBlocks: [
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <div class="column q-gutter-md">\n    <div ref="orbHost"></div>\n    <q-banner dense class="bg-grey-2 text-dark" data-navai-status>\n      Voice demo ready for local actions.\n    </q-banner>\n  </div>\n</template>',
          },
          {
            label: "src/layouts/MainLayout.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport VoiceNavigator from "../components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <q-layout view="lHh Lpr lFf">\n    <q-header bordered class="bg-white text-dark">\n      <q-toolbar class="row items-center justify-between">\n        <q-toolbar-title>NAVAI Demo</q-toolbar-title>\n      </q-toolbar>\n    </q-header>\n\n    <q-page-container>\n      <div class="q-px-md q-pt-md">\n        <VoiceNavigator />\n      </div>\n      <router-view />\n    </q-page-container>\n  </q-layout>\n</template>',
          },
          {
            label: "src/router/routes.ts",
            language: "ts",
            code: 'import type { RouteRecordRaw } from "vue-router";\n\nconst routes: RouteRecordRaw[] = [\n  {\n    path: "/",\n    component: () => import("../layouts/MainLayout.vue"),\n    children: [\n      {\n        path: "",\n        component: () => import("../pages/IndexPage.vue"),\n      },\n      {\n        path: "billing",\n        component: () => import("../pages/BillingPage.vue"),\n      },\n    ],\n  },\n];\n\nexport default routes;',
          },
          {
            label: "src/pages/BillingPage.vue",
            language: "vue",
            code: '<template>\n  <q-page padding class="column q-gutter-md">\n    <div class="text-h4">Billing</div>\n    <div data-navai-status class="text-body1">Billing page ready for NAVAI.</div>\n  </q-page>\n</template>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "ステップ 7 Web integration をテスト",
        description:
          "Loaders を再生成し、Quasar を起動して、NAVAI が navigation を起こした後も control が active のままか確認します。",
        bullets: [
          "Main route change で component が destroy されないことを確認してください。",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "quasar-dev.sh",
            language: "bash",
            code: "npx quasar dev",
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
    value: "quasar",
    label: "Quasar",
    title: "Quasar",
    description:
      "Quasar SPA на Vue, где voice control встроен в layouts и Quasar UI components.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Шаг 1 Создать web-проект",
        description:
          "Создайте app через Quasar CLI на Vite + TypeScript и сразу подготовьте `ai`, `composables`, `components`.",
        bullets: [
          "Сначала оставайтесь в SPA mode и добавляйте SSR только после стабилизации voice session.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm init quasar@latest navai-web-demo -- --nogit\n# In the wizard choose: App with Quasar CLI -> Typescript -> Quasar App CLI with Vite -> Composition API with <script setup> -> Sass with SCSS syntax.\n# When prompted to install dependencies, choose No; the next line runs npm install explicitly.\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Шаг 2 Установить зависимости",
        description:
          "Установите packages NAVAI. Quasar уже приносит Vue, router и visual layer, которую использует voice control.",
        bullets: [
          "Используйте local project commands, чтобы версии Quasar совпадали со scaffold.",
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
        title: "Шаг 3 Настроить env и loaders",
        description:
          "Настройте `.env` с `VITE_NAVAI_API_URL` и держите NAVAI paths в `src/ai`, чтобы Quasar и CLI ссылались на одно дерево.",
        bullets: [
          "Если позже перейдете на SSR, заново проверьте, какие values безопасно отдавать client side.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "VITE_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
            label: "src/ai/routes.ts",
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
            label: "src/ai/functions-modules/show_welcome_banner.ts",
            language: "typescript",
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "Шаг 6 Интегрировать web runtime",
        description:
          "Оберните imperative NAVAI session в composable, отдайте ее через Quasar component и смонтируйте в main layout.",
        bullets: [
          "Quasar layouts — самое простое место для одного persistent microphone control между route changes.",
        ],
        codeBlocks: [
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <div class="column q-gutter-md">\n    <div ref="orbHost"></div>\n    <q-banner dense class="bg-grey-2 text-dark" data-navai-status>\n      Voice demo ready for local actions.\n    </q-banner>\n  </div>\n</template>',
          },
          {
            label: "src/layouts/MainLayout.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport VoiceNavigator from "../components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <q-layout view="lHh Lpr lFf">\n    <q-header bordered class="bg-white text-dark">\n      <q-toolbar class="row items-center justify-between">\n        <q-toolbar-title>NAVAI Demo</q-toolbar-title>\n      </q-toolbar>\n    </q-header>\n\n    <q-page-container>\n      <div class="q-px-md q-pt-md">\n        <VoiceNavigator />\n      </div>\n      <router-view />\n    </q-page-container>\n  </q-layout>\n</template>',
          },
          {
            label: "src/router/routes.ts",
            language: "ts",
            code: 'import type { RouteRecordRaw } from "vue-router";\n\nconst routes: RouteRecordRaw[] = [\n  {\n    path: "/",\n    component: () => import("../layouts/MainLayout.vue"),\n    children: [\n      {\n        path: "",\n        component: () => import("../pages/IndexPage.vue"),\n      },\n      {\n        path: "billing",\n        component: () => import("../pages/BillingPage.vue"),\n      },\n    ],\n  },\n];\n\nexport default routes;',
          },
          {
            label: "src/pages/BillingPage.vue",
            language: "vue",
            code: '<template>\n  <q-page padding class="column q-gutter-md">\n    <div class="text-h4">Billing</div>\n    <div data-navai-status class="text-body1">Billing page ready for NAVAI.</div>\n  </q-page>\n</template>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Шаг 7 Проверить web integration",
        description:
          "Перегенерируйте loaders, запустите Quasar и проверьте, что control остается active даже после navigation, вызванной NAVAI.",
        bullets: [
          "Убедитесь, что component не уничтожается при смене main route.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "quasar-dev.sh",
            language: "bash",
            code: "npx quasar dev",
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
    value: "quasar",
    label: "Quasar",
    title: "Quasar",
    description:
      "Vue 기반 Quasar SPA 로, voice control 이 layouts 와 Quasar UI components 에 자연스럽게 들어갑니다.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "1단계 Web 프로젝트 생성",
        description:
          "Quasar CLI 로 Vite + TypeScript app 을 만들고 처음부터 `ai`, `composables`, `components` 를 준비하세요.",
        bullets: [
          "먼저 SPA mode 로 진행하고 voice session 이 안정된 뒤에만 SSR 을 추가하세요.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm init quasar@latest navai-web-demo -- --nogit\n# In the wizard choose: App with Quasar CLI -> Typescript -> Quasar App CLI with Vite -> Composition API with <script setup> -> Sass with SCSS syntax.\n# When prompted to install dependencies, choose No; the next line runs npm install explicitly.\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "2단계 Dependencies 설치",
        description:
          "NAVAI packages 를 설치하세요. Quasar 는 Vue, router, voice control 이 사용할 UI layer 를 이미 제공합니다.",
        bullets: [
          "Quasar versions 를 scaffold 와 맞추려면 project local commands 를 사용하세요.",
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
        title: "3단계 Env 와 loaders 설정",
        description:
          "`.env` 에 `VITE_NAVAI_API_URL` 을 설정하고 NAVAI paths 는 `src/ai` 에 두어 Quasar 와 CLI 가 같은 tree 를 보게 하세요.",
        bullets: [
          "나중에 SSR 로 이동하면 client 에 노출 가능한 values 를 다시 점검하세요.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "VITE_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
            label: "src/ai/routes.ts",
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
            label: "src/ai/functions-modules/show_welcome_banner.ts",
            language: "typescript",
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "6단계 Web runtime 통합",
        description:
          "Imperative NAVAI session 을 composable 로 감싸고 Quasar component 로 노출한 다음 main layout 에 mount 하세요.",
        bullets: [
          "Quasar layouts 는 route changes 사이에서 microphone control 을 유지하기 가장 쉬운 위치입니다.",
        ],
        codeBlocks: [
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <div class="column q-gutter-md">\n    <div ref="orbHost"></div>\n    <q-banner dense class="bg-grey-2 text-dark" data-navai-status>\n      Voice demo ready for local actions.\n    </q-banner>\n  </div>\n</template>',
          },
          {
            label: "src/layouts/MainLayout.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport VoiceNavigator from "../components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <q-layout view="lHh Lpr lFf">\n    <q-header bordered class="bg-white text-dark">\n      <q-toolbar class="row items-center justify-between">\n        <q-toolbar-title>NAVAI Demo</q-toolbar-title>\n      </q-toolbar>\n    </q-header>\n\n    <q-page-container>\n      <div class="q-px-md q-pt-md">\n        <VoiceNavigator />\n      </div>\n      <router-view />\n    </q-page-container>\n  </q-layout>\n</template>',
          },
          {
            label: "src/router/routes.ts",
            language: "ts",
            code: 'import type { RouteRecordRaw } from "vue-router";\n\nconst routes: RouteRecordRaw[] = [\n  {\n    path: "/",\n    component: () => import("../layouts/MainLayout.vue"),\n    children: [\n      {\n        path: "",\n        component: () => import("../pages/IndexPage.vue"),\n      },\n      {\n        path: "billing",\n        component: () => import("../pages/BillingPage.vue"),\n      },\n    ],\n  },\n];\n\nexport default routes;',
          },
          {
            label: "src/pages/BillingPage.vue",
            language: "vue",
            code: '<template>\n  <q-page padding class="column q-gutter-md">\n    <div class="text-h4">Billing</div>\n    <div data-navai-status class="text-body1">Billing page ready for NAVAI.</div>\n  </q-page>\n</template>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "7단계 Web integration 테스트",
        description:
          "Loaders 를 다시 생성하고 Quasar 를 시작해 NAVAI 가 navigation 을 일으킨 뒤에도 control 이 active 인지 검증하세요.",
        bullets: [
          "Main route 가 바뀌어도 component 가 destroy 되지 않는지 확인하세요.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "quasar-dev.sh",
            language: "bash",
            code: "npx quasar dev",
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
    value: "quasar",
    label: "Quasar",
    title: "Quasar",
    description:
      "Vue पर बनी Quasar SPA जिसमें voice control layouts और Quasar UI components में फिट होता है।",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "चरण 1 Web project बनाएं",
        description:
          "Quasar CLI के साथ Vite + TypeScript app बनाएं और शुरुआत से `ai`, `composables`, `components` तैयार रखें।",
        bullets: [
          "पहले SPA mode रखें; voice session stable होने के बाद ही SSR जोड़ें।",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm init quasar@latest navai-web-demo -- --nogit\n# In the wizard choose: App with Quasar CLI -> Typescript -> Quasar App CLI with Vite -> Composition API with <script setup> -> Sass with SCSS syntax.\n# When prompted to install dependencies, choose No; the next line runs npm install explicitly.\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "चरण 2 Dependencies install करें",
        description:
          "NAVAI packages install करें। Quasar पहले से Vue, router और UI layer देता है जिसका button उपयोग करेगा।",
        bullets: [
          "Versions aligned रखने के लिए project के local commands इस्तेमाल करें।",
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
        title: "चरण 3 Env और loaders configure करें",
        description:
          "`.env` में `VITE_NAVAI_API_URL` configure करें और NAVAI paths को `src/ai` में रखें ताकि Quasar और CLI same tree पढ़ें।",
        bullets: [
          "अगर बाद में SSR अपनाएं तो client को expose होने वाली values फिर से review करें।",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "VITE_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
            label: "src/ai/routes.ts",
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
            label: "src/ai/functions-modules/show_welcome_banner.ts",
            language: "typescript",
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset.navaiState = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "चरण 6 Web runtime integrate करें",
        description:
          "Imperative NAVAI session को composable में wrap करें, Quasar component के जरिए expose करें और main layout में mount करें।",
        bullets: [
          "Quasar layouts route changes के बीच persistent microphone control रखने की सबसे आसान जगह हैं।",
        ],
        codeBlocks: [
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "bottom-right",\n      themeMode: "dark",\n      showStatus: false,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <div class="column q-gutter-md">\n    <div ref="orbHost"></div>\n    <q-banner dense class="bg-grey-2 text-dark" data-navai-status>\n      Voice demo ready for local actions.\n    </q-banner>\n  </div>\n</template>',
          },
          {
            label: "src/layouts/MainLayout.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport VoiceNavigator from "../components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <q-layout view="lHh Lpr lFf">\n    <q-header bordered class="bg-white text-dark">\n      <q-toolbar class="row items-center justify-between">\n        <q-toolbar-title>NAVAI Demo</q-toolbar-title>\n      </q-toolbar>\n    </q-header>\n\n    <q-page-container>\n      <div class="q-px-md q-pt-md">\n        <VoiceNavigator />\n      </div>\n      <router-view />\n    </q-page-container>\n  </q-layout>\n</template>',
          },
          {
            label: "src/router/routes.ts",
            language: "ts",
            code: 'import type { RouteRecordRaw } from "vue-router";\n\nconst routes: RouteRecordRaw[] = [\n  {\n    path: "/",\n    component: () => import("../layouts/MainLayout.vue"),\n    children: [\n      {\n        path: "",\n        component: () => import("../pages/IndexPage.vue"),\n      },\n      {\n        path: "billing",\n        component: () => import("../pages/BillingPage.vue"),\n      },\n    ],\n  },\n];\n\nexport default routes;',
          },
          {
            label: "src/pages/BillingPage.vue",
            language: "vue",
            code: '<template>\n  <q-page padding class="column q-gutter-md">\n    <div class="text-h4">Billing</div>\n    <div data-navai-status class="text-body1">Billing page ready for NAVAI.</div>\n  </q-page>\n</template>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "चरण 7 Web integration test करें",
        description:
          "Loaders regenerate करें, Quasar start करें और validate करें कि NAVAI-triggered navigation के बाद भी control active रहे।",
        bullets: [
          "Confirm करें कि main route बदलने पर component destroy नहीं हो रहा।",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "quasar-dev.sh",
            language: "bash",
            code: "npx quasar dev",
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

export function getWebQuasarGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return getLocalizedInstallationGuideTab(WEB_QUASAR_GUIDE_TABS, language);
}
