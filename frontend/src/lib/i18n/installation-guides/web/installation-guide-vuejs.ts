import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";

const WEB_VUEJS_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  en: {
    value: "vue-js",
    label: "Vue.js",
    title: "Vue.js",
    description:
      "Vue 3 app with Composition API, vue-router, and a reusable voice composable.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Step 1 Create the web project",
        description:
          "Scaffold the app with create-vue using `--ts --router` so the project already includes `src/main.ts` and `src/router/index.ts`, then prepare the `ai`, `composables`, and `components` folders.",
        bullets: [
          "If you see `Failed to load url /src/main.ts`, the app was created without TypeScript; recreate it with those flags or convert the guide to `.js` files.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vue@latest navai-web-demo -- --ts --router\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Step 2 Install dependencies",
        description:
          "Install NAVAI packages and make sure `vue-router` is present to resolve the paths requested by the agent.",
        bullets: [
          "Keep the composable isolated so the same session logic can be reused across views.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0 vue-router",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Step 3 Configure env and loaders",
        description:
          "Configure Vite variables and keep loader paths under `src/ai` so the CLI and the app read the same base tree.",
        bullets: [
          "Use a single backend URL in both the composable and the loader generation step.",
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
          "Build `useNavaiVoice`, pass `router.push` as `navigate`, and expose a Vue component with start/stop state.",
        bullets: [
          "Mount the component high in the tree if you want one voice session across multiple routes.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "ts",
            code: 'import { createApp } from "vue";\n\nimport App from "./App.vue";\nimport router from "./router";\nimport "./assets/main.css";\n\ncreateApp(App).use(router).mount("#app");',
          },
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "inline",\n      themeMode: "dark",\n      showStatus: true,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Vue.js + NAVAI</span>\n      <h2>Use the NAVAI Orb inside your Vue shell.</h2>\n      <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
          },
          {
            label: "src/App.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { RouterView } from "vue-router";\n\nimport VoiceNavigator from "./components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <VoiceNavigator />\n  <RouterView />\n</template>',
          },
          {
            label: "src/router/index.ts",
            language: "ts",
            code: 'import { createRouter, createWebHistory } from "vue-router";\n\nimport HomeView from "../views/HomeView.vue";\nimport BillingView from "../views/BillingView.vue";\n\nexport default createRouter({\n  history: createWebHistory(import.meta.env.BASE_URL),\n  routes: [\n    {\n      path: "/",\n      name: "home",\n      component: HomeView,\n    },\n    {\n      path: "/billing",\n      name: "billing",\n      component: BillingView,\n    },\n  ],\n});',
          },
          {
            label: "src/views/HomeView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Home</h1>\n    <p>Start NAVAI here, then ask it to open Billing or run show welcome banner.</p>\n  </section>\n</template>",
          },
          {
            label: "src/views/BillingView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing view ready for NAVAI.</p>\n  </section>\n</template>",
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Step 7 Test the web integration",
        description:
          "Regenerate loaders, start Vue, and confirm routing, local function execution, and backend tools in the same session.",
        bullets: [
          "Watch the browser console for warnings emitted while the runtime config resolves.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
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
    value: "vue-js",
    label: "Vue.js",
    title: "Vue.js",
    description:
      "Application Vue 3 avec Composition API, vue-router et un composable vocal reutilisable.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Etape 1 Creer le projet web",
        description:
          "Generez l app avec create-vue en utilisant `--ts --router` pour obtenir `src/main.ts` et `src/router/index.ts`, puis preparez `ai`, `composables` et `components`.",
        bullets: [
          "Si vous voyez `Failed to load url /src/main.ts`, l app a ete creee sans TypeScript ; recreez-la avec ces flags ou adaptez le guide en `.js`.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vue@latest navai-web-demo -- --ts --router\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Etape 2 Installer les dependances",
        description:
          "Installez les paquets NAVAI et assurez-vous que `vue-router` est bien present pour resoudre les paths demandes par l agent.",
        bullets: [
          "Gardez le composable isole afin de reutiliser la meme logique de session dans plusieurs vues.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0 vue-router",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Etape 3 Configurer variables et loaders",
        description:
          "Configurez les variables Vite et gardez les chemins des loaders sous `src/ai` afin que le CLI et l app lisent le meme arbre.",
        bullets: [
          "Utilisez une seule URL backend dans le composable et dans l etape de generation des loaders.",
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
          "Construisez `useNavaiVoice`, passez `router.push` comme `navigate` et exposez un composant Vue avec etat start et stop.",
        bullets: [
          "Montez le composant haut dans l arbre si vous voulez une seule session sur plusieurs routes.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "ts",
            code: 'import { createApp } from "vue";\n\nimport App from "./App.vue";\nimport router from "./router";\nimport "./assets/main.css";\n\ncreateApp(App).use(router).mount("#app");',
          },
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "inline",\n      themeMode: "dark",\n      showStatus: true,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Vue.js + NAVAI</span>\n      <h2>Use the NAVAI Orb inside your Vue shell.</h2>\n      <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
          },
          {
            label: "src/App.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { RouterView } from "vue-router";\n\nimport VoiceNavigator from "./components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <VoiceNavigator />\n  <RouterView />\n</template>',
          },
          {
            label: "src/router/index.ts",
            language: "ts",
            code: 'import { createRouter, createWebHistory } from "vue-router";\n\nimport HomeView from "../views/HomeView.vue";\nimport BillingView from "../views/BillingView.vue";\n\nexport default createRouter({\n  history: createWebHistory(import.meta.env.BASE_URL),\n  routes: [\n    {\n      path: "/",\n      name: "home",\n      component: HomeView,\n    },\n    {\n      path: "/billing",\n      name: "billing",\n      component: BillingView,\n    },\n  ],\n});',
          },
          {
            label: "src/views/HomeView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Home</h1>\n    <p>Start NAVAI here, then ask it to open Billing or run show welcome banner.</p>\n  </section>\n</template>",
          },
          {
            label: "src/views/BillingView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing view ready for NAVAI.</p>\n  </section>\n</template>",
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Etape 7 Tester l integration web",
        description:
          "Regenerez les loaders, lancez Vue et confirmez routing, fonction locale et tools backend dans la meme session.",
        bullets: [
          "Surveillez la console navigateur pour les warnings emis pendant la resolution du runtime.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
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
    value: "vue-js",
    label: "Vue.js",
    title: "Vue.js",
    description:
      "Aplicacion Vue 3 con Composition API, vue-router y un composable reutilizable para voz.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Paso 1 Crear el proyecto web",
        description:
          "Genere la app con create-vue usando `--ts --router` para que el scaffold cree `src/main.ts` y `src/router/index.ts`, y prepare las carpetas de `ai`, `composables` y `components`.",
        bullets: [
          "Si ve `Failed to load url /src/main.ts`, recree la app con esos flags o adapte la guia a archivos `.js`.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vue@latest navai-web-demo -- --ts --router\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Paso 2 Instalar dependencias",
        description:
          "Instale los paquetes de NAVAI y asegure que `vue-router` este disponible para resolver los paths que pida el agente.",
        bullets: [
          "Mantenga el composable aislado para poder reutilizar la misma sesion en varias vistas.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0 vue-router",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Paso 3 Configurar variables y loaders",
        description:
          "Configure las variables Vite y deje los paths de loaders dentro de `src/ai` para que el CLI y la app lean la misma base.",
        bullets: [
          "Use una sola URL backend en el composable y en el proceso de generacion de loaders.",
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
          "Construya `useNavaiVoice`, pase `router.push` como `navigate` y exponga un componente Vue con estado start/stop.",
        bullets: [
          "Monte el componente alto en el arbol si quiere una sola sesion de voz entre varias rutas.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "ts",
            code: 'import { createApp } from "vue";\n\nimport App from "./App.vue";\nimport router from "./router";\nimport "./assets/main.css";\n\ncreateApp(App).use(router).mount("#app");',
          },
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "inline",\n      themeMode: "dark",\n      showStatus: true,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Vue.js + NAVAI</span>\n      <h2>Use the NAVAI Orb inside your Vue shell.</h2>\n      <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
          },
          {
            label: "src/App.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { RouterView } from "vue-router";\n\nimport VoiceNavigator from "./components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <VoiceNavigator />\n  <RouterView />\n</template>',
          },
          {
            label: "src/router/index.ts",
            language: "ts",
            code: 'import { createRouter, createWebHistory } from "vue-router";\n\nimport HomeView from "../views/HomeView.vue";\nimport BillingView from "../views/BillingView.vue";\n\nexport default createRouter({\n  history: createWebHistory(import.meta.env.BASE_URL),\n  routes: [\n    {\n      path: "/",\n      name: "home",\n      component: HomeView,\n    },\n    {\n      path: "/billing",\n      name: "billing",\n      component: BillingView,\n    },\n  ],\n});',
          },
          {
            label: "src/views/HomeView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Home</h1>\n    <p>Start NAVAI here, then ask it to open Billing or run show welcome banner.</p>\n  </section>\n</template>",
          },
          {
            label: "src/views/BillingView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing view ready for NAVAI.</p>\n  </section>\n</template>",
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Paso 7 Probar la integracion web",
        description:
          "Regenere loaders, levante Vue y confirme routing, function local y tools backend desde la misma sesion.",
        bullets: [
          "Revise la consola del navegador por warnings emitidos durante la resolucion del runtime.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
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
    value: "vue-js",
    label: "Vue.js",
    title: "Vue.js",
    description:
      "Aplicacao Vue 3 com Composition API, vue-router e um composable reutilizavel para voz.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Passo 1 Criar o projeto web",
        description:
          "Crie a app com create-vue usando `--ts --router` para que o scaffold gere `src/main.ts` e `src/router/index.ts`, e prepare as pastas `ai`, `composables` e `components`.",
        bullets: [
          "Se aparecer `Failed to load url /src/main.ts`, a app foi criada sem TypeScript; recrie com esses flags ou adapte a guia para arquivos `.js`.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vue@latest navai-web-demo -- --ts --router\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Passo 2 Instalar dependencias",
        description:
          "Instale os pacotes do NAVAI e confirme que `vue-router` esta presente para resolver os paths pedidos pelo agente.",
        bullets: [
          "Mantenha o composable isolado para reutilizar a mesma logica de sessao em varias views.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0 vue-router",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Passo 3 Configurar variaveis e loaders",
        description:
          "Configure as variaveis do Vite e mantenha os caminhos de loaders em `src/ai` para que o CLI e a app leiam a mesma arvore.",
        bullets: [
          "Use uma unica URL backend tanto no composable quanto na geracao dos loaders.",
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
          "Construa `useNavaiVoice`, passe `router.push` como `navigate` e exponha um componente Vue com estado de start e stop.",
        bullets: [
          "Monte o componente em um nivel alto se quiser uma unica sessao entre varias rotas.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "ts",
            code: 'import { createApp } from "vue";\n\nimport App from "./App.vue";\nimport router from "./router";\nimport "./assets/main.css";\n\ncreateApp(App).use(router).mount("#app");',
          },
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "inline",\n      themeMode: "dark",\n      showStatus: true,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Vue.js + NAVAI</span>\n      <h2>Use the NAVAI Orb inside your Vue shell.</h2>\n      <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
          },
          {
            label: "src/App.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { RouterView } from "vue-router";\n\nimport VoiceNavigator from "./components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <VoiceNavigator />\n  <RouterView />\n</template>',
          },
          {
            label: "src/router/index.ts",
            language: "ts",
            code: 'import { createRouter, createWebHistory } from "vue-router";\n\nimport HomeView from "../views/HomeView.vue";\nimport BillingView from "../views/BillingView.vue";\n\nexport default createRouter({\n  history: createWebHistory(import.meta.env.BASE_URL),\n  routes: [\n    {\n      path: "/",\n      name: "home",\n      component: HomeView,\n    },\n    {\n      path: "/billing",\n      name: "billing",\n      component: BillingView,\n    },\n  ],\n});',
          },
          {
            label: "src/views/HomeView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Home</h1>\n    <p>Start NAVAI here, then ask it to open Billing or run show welcome banner.</p>\n  </section>\n</template>",
          },
          {
            label: "src/views/BillingView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing view ready for NAVAI.</p>\n  </section>\n</template>",
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Passo 7 Testar a integracao web",
        description:
          "Regenere loaders, suba o Vue e confirme routing, funcao local e tools backend na mesma sessao.",
        bullets: [
          "Observe o console do navegador para warnings emitidos durante a resolucao do runtime.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
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
    value: "vue-js",
    label: "Vue.js",
    title: "Vue.js",
    description:
      "带 Composition API、vue-router 和 reusable voice composable 的 Vue 3 app。",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "步骤 1 创建 Web 项目",
        description:
          "用带 `--ts --router` 的 create-vue 创建 app，让 scaffold 直接生成 `src/main.ts` 和 `src/router/index.ts`，再准备 `ai`、`composables`、`components` folders。",
        bullets: [
          "如果看到 `Failed to load url /src/main.ts`，说明 app 是按非 TypeScript 创建的；请用这些 flags 重建，或把 guide 改成 `.js` files。",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vue@latest navai-web-demo -- --ts --router\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "步骤 2 安装依赖",
        description:
          "安装 NAVAI packages，并确认 `vue-router` 已经可用来解析 agent 请求的 paths。",
        bullets: [
          "将 composable 独立出来，便于在多个 views 中复用同一套 session logic。",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0 vue-router",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "步骤 3 配置 Env 与 loaders",
        description:
          "配置 Vite variables，并把 loader paths 放在 `src/ai` 下，让 CLI 和 app 读取同一棵目录树。",
        bullets: ["Composable 和 loader generation 都使用同一个 backend URL。"],
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
          "构建 `useNavaiVoice`，把 `router.push` 作为 `navigate` 传入，并暴露一个带 start/stop state 的 Vue component。",
        bullets: [
          "如果希望跨多个 routes 共享一条 voice session，请把 component 挂在更高层。",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "ts",
            code: 'import { createApp } from "vue";\n\nimport App from "./App.vue";\nimport router from "./router";\nimport "./assets/main.css";\n\ncreateApp(App).use(router).mount("#app");',
          },
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "inline",\n      themeMode: "dark",\n      showStatus: true,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Vue.js + NAVAI</span>\n      <h2>Use the NAVAI Orb inside your Vue shell.</h2>\n      <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
          },
          {
            label: "src/App.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { RouterView } from "vue-router";\n\nimport VoiceNavigator from "./components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <VoiceNavigator />\n  <RouterView />\n</template>',
          },
          {
            label: "src/router/index.ts",
            language: "ts",
            code: 'import { createRouter, createWebHistory } from "vue-router";\n\nimport HomeView from "../views/HomeView.vue";\nimport BillingView from "../views/BillingView.vue";\n\nexport default createRouter({\n  history: createWebHistory(import.meta.env.BASE_URL),\n  routes: [\n    {\n      path: "/",\n      name: "home",\n      component: HomeView,\n    },\n    {\n      path: "/billing",\n      name: "billing",\n      component: BillingView,\n    },\n  ],\n});',
          },
          {
            label: "src/views/HomeView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Home</h1>\n    <p>Start NAVAI here, then ask it to open Billing or run show welcome banner.</p>\n  </section>\n</template>",
          },
          {
            label: "src/views/BillingView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing view ready for NAVAI.</p>\n  </section>\n</template>",
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "步骤 7 测试 Web integration",
        description:
          "重新生成 loaders，启动 Vue，并在同一条 session 中确认 routing、local function 与 backend tools。",
        bullets: [
          "注意查看 runtime config 解析期间 browser console 中的 warnings。",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
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
    value: "vue-js",
    label: "Vue.js",
    title: "Vue.js",
    description:
      "Composition API、vue-router、reusable voice composable を持つ Vue 3 app です。",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "ステップ 1 Web プロジェクトを作成",
        description:
          "`--ts --router` を付けて create-vue で app を作成し、scaffold に `src/main.ts` と `src/router/index.ts` を生成させた上で `ai`、`composables`、`components` folders を準備します。",
        bullets: [
          "`Failed to load url /src/main.ts` が出る場合は TypeScript なしで作成されています。これらの flags で作り直すか、guide を `.js` files 向けに合わせてください。",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vue@latest navai-web-demo -- --ts --router\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "ステップ 2 依存関係をインストール",
        description:
          "NAVAI packages を install し、agent が要求する paths を解決するために `vue-router` が存在することを確認します。",
        bullets: [
          "Composable は isolated に保ち、同じ session logic を複数 view で再利用できるようにします。",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0 vue-router",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "ステップ 3 Env と loaders を設定",
        description:
          "Vite variables を設定し、loader paths を `src/ai` 配下に置いて、CLI と app が同じ tree を読むようにします。",
        bullets: [
          "Composable と loader generation の両方で同じ backend URL を使ってください。",
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
          "`useNavaiVoice` を作成し、`router.push` を `navigate` として渡し、start/stop state を持つ Vue component を公開します。",
        bullets: [
          "複数 routes で 1 つの voice session を共有したい場合は component を tree の上位に mount してください。",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "ts",
            code: 'import { createApp } from "vue";\n\nimport App from "./App.vue";\nimport router from "./router";\nimport "./assets/main.css";\n\ncreateApp(App).use(router).mount("#app");',
          },
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "inline",\n      themeMode: "dark",\n      showStatus: true,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Vue.js + NAVAI</span>\n      <h2>Use the NAVAI Orb inside your Vue shell.</h2>\n      <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
          },
          {
            label: "src/App.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { RouterView } from "vue-router";\n\nimport VoiceNavigator from "./components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <VoiceNavigator />\n  <RouterView />\n</template>',
          },
          {
            label: "src/router/index.ts",
            language: "ts",
            code: 'import { createRouter, createWebHistory } from "vue-router";\n\nimport HomeView from "../views/HomeView.vue";\nimport BillingView from "../views/BillingView.vue";\n\nexport default createRouter({\n  history: createWebHistory(import.meta.env.BASE_URL),\n  routes: [\n    {\n      path: "/",\n      name: "home",\n      component: HomeView,\n    },\n    {\n      path: "/billing",\n      name: "billing",\n      component: BillingView,\n    },\n  ],\n});',
          },
          {
            label: "src/views/HomeView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Home</h1>\n    <p>Start NAVAI here, then ask it to open Billing or run show welcome banner.</p>\n  </section>\n</template>",
          },
          {
            label: "src/views/BillingView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing view ready for NAVAI.</p>\n  </section>\n</template>",
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "ステップ 7 Web integration をテスト",
        description:
          "Loaders を再生成し、Vue を起動して、routing、local function、backend tools が同じ session で動くことを確認します。",
        bullets: [
          "Runtime config 解決中に出る browser console warnings も確認してください。",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
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
    value: "vue-js",
    label: "Vue.js",
    title: "Vue.js",
    description:
      "Vue 3 app с Composition API, vue-router и reusable voice composable.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Шаг 1 Создать web-проект",
        description:
          "Создайте app через create-vue с флагами `--ts --router`, чтобы scaffold сразу создал `src/main.ts` и `src/router/index.ts`, и подготовьте folders `ai`, `composables`, `components`.",
        bullets: [
          "Если видите `Failed to load url /src/main.ts`, app была создана без TypeScript; пересоздайте ее с этими flags или адаптируйте guide под `.js` files.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vue@latest navai-web-demo -- --ts --router\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Шаг 2 Установить зависимости",
        description:
          "Установите packages NAVAI и убедитесь, что `vue-router` доступен для paths, которые запрашивает агент.",
        bullets: [
          "Держите composable изолированным, чтобы переиспользовать одну session logic в разных views.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0 vue-router",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Шаг 3 Настроить env и loaders",
        description:
          "Настройте variables Vite и держите loader paths под `src/ai`, чтобы CLI и app читали одно и то же дерево.",
        bullets: [
          "Используйте один backend URL и в composable, и в генерации loaders.",
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
          "Создайте `useNavaiVoice`, передайте `router.push` как `navigate` и опубликуйте Vue component со state start/stop.",
        bullets: [
          "Монтируйте component выше в tree, если нужна одна voice session на несколько routes.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "ts",
            code: 'import { createApp } from "vue";\n\nimport App from "./App.vue";\nimport router from "./router";\nimport "./assets/main.css";\n\ncreateApp(App).use(router).mount("#app");',
          },
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "inline",\n      themeMode: "dark",\n      showStatus: true,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Vue.js + NAVAI</span>\n      <h2>Use the NAVAI Orb inside your Vue shell.</h2>\n      <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
          },
          {
            label: "src/App.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { RouterView } from "vue-router";\n\nimport VoiceNavigator from "./components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <VoiceNavigator />\n  <RouterView />\n</template>',
          },
          {
            label: "src/router/index.ts",
            language: "ts",
            code: 'import { createRouter, createWebHistory } from "vue-router";\n\nimport HomeView from "../views/HomeView.vue";\nimport BillingView from "../views/BillingView.vue";\n\nexport default createRouter({\n  history: createWebHistory(import.meta.env.BASE_URL),\n  routes: [\n    {\n      path: "/",\n      name: "home",\n      component: HomeView,\n    },\n    {\n      path: "/billing",\n      name: "billing",\n      component: BillingView,\n    },\n  ],\n});',
          },
          {
            label: "src/views/HomeView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Home</h1>\n    <p>Start NAVAI here, then ask it to open Billing or run show welcome banner.</p>\n  </section>\n</template>",
          },
          {
            label: "src/views/BillingView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing view ready for NAVAI.</p>\n  </section>\n</template>",
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Шаг 7 Проверить web integration",
        description:
          "Перегенерируйте loaders, запустите Vue и подтвердите routing, local function и backend tools в одной session.",
        bullets: [
          "Следите за browser console warnings во время resolution runtime config.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
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
    value: "vue-js",
    label: "Vue.js",
    title: "Vue.js",
    description:
      "Composition API, vue-router, reusable voice composable 을 갖춘 Vue 3 app 입니다.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "1단계 Web 프로젝트 생성",
        description:
          "`--ts --router` 플래그와 함께 create-vue 로 app 을 만들어 scaffold 가 `src/main.ts` 와 `src/router/index.ts` 를 생성하게 하고 `ai`, `composables`, `components` folders 를 준비하세요.",
        bullets: [
          "`Failed to load url /src/main.ts` 가 보이면 TypeScript 없이 만든 app 입니다. 해당 flags 로 다시 만들거나 guide 를 `.js` files 기준으로 바꾸세요.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vue@latest navai-web-demo -- --ts --router\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "2단계 Dependencies 설치",
        description:
          "NAVAI packages 를 설치하고, agent 가 요청하는 paths 를 처리할 `vue-router` 가 있는지 확인하세요.",
        bullets: [
          "Composable 을 분리해 두면 같은 session logic 을 여러 views 에서 재사용할 수 있습니다.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0 vue-router",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "3단계 Env 와 loaders 설정",
        description:
          "Vite variables 를 설정하고 loader paths 는 `src/ai` 아래에 두어 CLI 와 app 이 같은 tree 를 읽게 하세요.",
        bullets: [
          "Composable 과 loader generation 둘 다 같은 backend URL 을 사용하세요.",
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
          "`useNavaiVoice` 를 만들고 `router.push` 를 `navigate` 로 넘긴 뒤 start/stop state 를 가진 Vue component 를 노출하세요.",
        bullets: [
          "여러 routes 에서 하나의 voice session 을 유지하려면 component 를 tree 상단에 mount 하세요.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "ts",
            code: 'import { createApp } from "vue";\n\nimport App from "./App.vue";\nimport router from "./router";\nimport "./assets/main.css";\n\ncreateApp(App).use(router).mount("#app");',
          },
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "inline",\n      themeMode: "dark",\n      showStatus: true,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Vue.js + NAVAI</span>\n      <h2>Use the NAVAI Orb inside your Vue shell.</h2>\n      <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
          },
          {
            label: "src/App.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { RouterView } from "vue-router";\n\nimport VoiceNavigator from "./components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <VoiceNavigator />\n  <RouterView />\n</template>',
          },
          {
            label: "src/router/index.ts",
            language: "ts",
            code: 'import { createRouter, createWebHistory } from "vue-router";\n\nimport HomeView from "../views/HomeView.vue";\nimport BillingView from "../views/BillingView.vue";\n\nexport default createRouter({\n  history: createWebHistory(import.meta.env.BASE_URL),\n  routes: [\n    {\n      path: "/",\n      name: "home",\n      component: HomeView,\n    },\n    {\n      path: "/billing",\n      name: "billing",\n      component: BillingView,\n    },\n  ],\n});',
          },
          {
            label: "src/views/HomeView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Home</h1>\n    <p>Start NAVAI here, then ask it to open Billing or run show welcome banner.</p>\n  </section>\n</template>",
          },
          {
            label: "src/views/BillingView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing view ready for NAVAI.</p>\n  </section>\n</template>",
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "7단계 Web integration 테스트",
        description:
          "Loaders 를 다시 생성하고 Vue 를 시작해 routing, local function, backend tools 가 같은 session 에서 동작하는지 확인하세요.",
        bullets: [
          "Runtime config 해결 중 출력되는 browser console warnings 도 확인하세요.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
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
    value: "vue-js",
    label: "Vue.js",
    title: "Vue.js",
    description:
      "Vue 3 app जिसमें Composition API, vue-router और reusable voice composable है।",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "चरण 1 Web project बनाएं",
        description:
          "App को create-vue में `--ts --router` flags के साथ बनाएं ताकि scaffold `src/main.ts` और `src/router/index.ts` दे, फिर `ai`, `composables`, `components` folders तैयार करें।",
        bullets: [
          "अगर `Failed to load url /src/main.ts` दिखे, app बिना TypeScript के बनी है; इसे उन flags के साथ दोबारा बनाएं या guide को `.js` files पर ले जाएं।",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vue@latest navai-web-demo -- --ts --router\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/composables src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "चरण 2 Dependencies install करें",
        description:
          "NAVAI packages install करें और सुनिश्चित करें कि agent द्वारा मांगे गए paths resolve करने के लिए `vue-router` मौजूद हो।",
        bullets: [
          "Composable को isolated रखें ताकि वही session logic अलग-अलग views में reuse हो सके।",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0 vue-router",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "चरण 3 Env और loaders configure करें",
        description:
          "Vite variables configure करें और loader paths को `src/ai` के अंदर रखें ताकि CLI और app दोनों same tree पढ़ें।",
        bullets: [
          "Composable और loader generation, दोनों में एक ही backend URL use करें।",
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
          "`useNavaiVoice` बनाएं, `router.push` को `navigate` के रूप में pass करें और start/stop state वाला Vue component expose करें।",
        bullets: [
          "अगर कई routes पर एक ही voice session चाहिए तो component को tree में ऊपर mount करें।",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "ts",
            code: 'import { createApp } from "vue";\n\nimport App from "./App.vue";\nimport router from "./router";\nimport "./assets/main.css";\n\ncreateApp(App).use(router).mount("#app");',
          },
          {
            label: "src/composables/useNavaiVoice.ts",
            language: "ts",
            code: 'import { ref } from "vue";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function useNavaiVoice(navigate: (path: string) => void) {\n  const isConnected = ref(false);\n  const isConnecting = ref(false);\n  const error = ref<string | null>(null);\n  const backendClient = createNavaiBackendClient({ env: NAVAI_ENV });\n  let session: RealtimeSession | null = null;\n\n  async function start() {\n    if (session || isConnecting.value) {\n      return;\n    }\n\n    isConnecting.value = true;\n    error.value = null;\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate,\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: backendClient.executeFunction,\n      });\n\n      session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await session.connect({ apiKey: secret.value });\n      }\n\n      isConnected.value = true;\n    } catch (startError) {\n      console.error(startError);\n      error.value = "NAVAI could not start.";\n      session?.close();\n      session = null;\n      isConnected.value = false;\n    } finally {\n      isConnecting.value = false;\n    }\n  }\n\n  function stop() {\n    session?.close();\n    session = null;\n    isConnected.value = false;\n  }\n\n  return {\n    isConnected,\n    isConnecting,\n    error,\n    start,\n    stop,\n  };\n}',
          },
          {
            label: "src/components/VoiceNavigator.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";\nimport { useRouter } from "vue-router";\n\nimport { useNavaiVoice } from "../composables/useNavaiVoice";\n\nconst router = useRouter();\nconst { isConnected, isConnecting, error, start, stop } = useNavaiVoice((path) => router.push(path));\nconst orbHost = ref<HTMLElement | null>(null);\nlet reactRoot: Root | null = null;\n\nfunction renderOrb() {\n  if (!reactRoot) {\n    return;\n  }\n\n  reactRoot.render(\n    createElement(NavaiVoiceOrbDock, {\n      agent: {\n        status: error.value ? "error" : isConnecting.value ? "connecting" : isConnected.value ? "connected" : "idle",\n        agentVoiceState: "idle",\n        error: error.value,\n        isConnecting: isConnecting.value,\n        isConnected: isConnected.value,\n        isAgentSpeaking: false,\n        start,\n        stop,\n      },\n      placement: "inline",\n      themeMode: "dark",\n      showStatus: true,\n      backgroundColorLight: "#f8fafc",\n      backgroundColorDark: "#050816",\n    })\n  );\n}\n\nonMounted(() => {\n  if (!orbHost.value) {\n    return;\n  }\n\n  reactRoot = createRoot(orbHost.value);\n  renderOrb();\n});\n\nwatchEffect(() => {\n  isConnected.value;\n  isConnecting.value;\n  error.value;\n  renderOrb();\n});\n\nonBeforeUnmount(() => {\n  reactRoot?.unmount();\n  reactRoot = null;\n});\n</script>\n\n<template>\n  <section class="voice-card">\n    <div class="voice-copy">\n      <span class="voice-eyebrow">Vue.js + NAVAI</span>\n      <h2>Use the NAVAI Orb inside your Vue shell.</h2>\n      <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n    </div>\n    <div ref="orbHost"></div>\n    <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n  </section>\n</template>\n\n<style scoped>\n.voice-card {\n  display: grid;\n  gap: 18px;\n  border-radius: 28px;\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.76);\n  padding: 24px;\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n}\n\n.voice-eyebrow {\n  display: inline-block;\n  margin-bottom: 10px;\n  color: #7dd3fc;\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n}\n\n.voice-copy h2,\n.voice-copy p,\n.status-banner {\n  margin: 0;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 14px 16px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #e2e8f0;\n}\n</style>',
          },
          {
            label: "src/App.vue",
            language: "vue",
            code: '<script setup lang="ts">\nimport { RouterView } from "vue-router";\n\nimport VoiceNavigator from "./components/VoiceNavigator.vue";\n</script>\n\n<template>\n  <VoiceNavigator />\n  <RouterView />\n</template>',
          },
          {
            label: "src/router/index.ts",
            language: "ts",
            code: 'import { createRouter, createWebHistory } from "vue-router";\n\nimport HomeView from "../views/HomeView.vue";\nimport BillingView from "../views/BillingView.vue";\n\nexport default createRouter({\n  history: createWebHistory(import.meta.env.BASE_URL),\n  routes: [\n    {\n      path: "/",\n      name: "home",\n      component: HomeView,\n    },\n    {\n      path: "/billing",\n      name: "billing",\n      component: BillingView,\n    },\n  ],\n});',
          },
          {
            label: "src/views/HomeView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Home</h1>\n    <p>Start NAVAI here, then ask it to open Billing or run show welcome banner.</p>\n  </section>\n</template>",
          },
          {
            label: "src/views/BillingView.vue",
            language: "vue",
            code: "<template>\n  <section>\n    <h1>Billing</h1>\n    <p data-navai-status>Billing view ready for NAVAI.</p>\n  </section>\n</template>",
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "चरण 7 Web integration test करें",
        description:
          "Loaders regenerate करें, Vue start करें और उसी session में routing, local function और backend tools confirm करें।",
        bullets: [
          "Runtime config resolve होते समय browser console warnings भी देखें।",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
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

export function getWebVuejsGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return getLocalizedInstallationGuideTab(WEB_VUEJS_GUIDE_TABS, language);
}
