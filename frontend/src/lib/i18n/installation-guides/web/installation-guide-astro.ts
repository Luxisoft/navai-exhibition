import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";

const WEB_ASTRO_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  en: {
    value: "astro",
    label: "Astro",
    title: "Astro",
    description:
      "Astro site that mounts a single React shell with `@navai/voice-frontend` so the session lives in one client runtime.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Step 1 Create the web project",
        description:
          "Create the Astro project, keep the site mostly static, and add `src/components` plus `src/ai` for the voice shell.",
        bullets: [
          "This path fits content-heavy sites where voice lives only on selected pages.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create astro@latest navai-web-demo\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Step 2 Install dependencies",
        description:
          "Add the Astro React integration and install NAVAI packages plus `react-router-dom` so routing happens inside the island.",
        bullets: [
          "In Astro this demo uses `HashRouter` inside one client component, not separate `.astro` pages for the voice UI.",
          'Import `react-router-dom` as a namespace (`import * as ReactRouterDom from "react-router-dom"`) because Vite does not expose a `default` export.',
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npx astro add react\nnpm install @navai/voice-frontend @openai/agents@^0.4.14 react-router-dom zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Step 3 Configure env and loaders",
        description:
          "Store `PUBLIC_NAVAI_API_URL` for the browser and keep the CLI `NAVAI_*` keys in the same `.env` file.",
        bullets: [
          "Astro exposes only variables that start with `PUBLIC_` to the client.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
          'Mount `useWebVoiceAgent` in `src/components/VoiceNavigator.tsx`, build a `src/components/VoiceApp.tsx` with `HashRouter`, and load that app once from `src/pages/index.astro` with `client:only="react"`.',
        bullets: [
          'Use `client:only="react"` because `HashRouter` touches browser APIs such as `document`.',
          "This keeps the Orb inside one stable React tree and avoids relying on `transition:persist` between Astro pages.",
          "Use `Link` or `useNavigate()` from `react-router-dom` to switch between `/` and `/billing` inside the shell.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport * as ReactRouterDom from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nconst { useNavigate } = ReactRouterDom;\n\ntype VoiceNavigatorProps = {\n  statusMessage?: string;\n};\n\nexport function VoiceNavigator({\n  statusMessage = "Voice demo ready for local actions.",\n}: VoiceNavigatorProps) {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <article className="panel">\n      <span className="eyebrow">Astro + NAVAI</span>\n      <h1>Talk to your Astro island.</h1>\n      <p>Keep the voice UI inside one React tree so navigation does not tear down the active session.</p>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="status-banner" data-navai-status>\n        {statusMessage}\n      </p>\n    </article>\n  );\n}',
          },
          {
            label: "src/components/VoiceApp.tsx",
            language: "tsx",
            code: 'import * as ReactRouterDom from "react-router-dom";\n\nimport { VoiceNavigator } from "./VoiceNavigator";\n\nconst { HashRouter, Link, Navigate, Route, Routes } = ReactRouterDom;\n\nfunction HomeScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Demo routes</span>\n      <h2>Home</h2>\n      <p>Ask NAVAI to open Billing and then run show welcome banner.</p>\n      <Link className="action-link" to="/billing">\n        Open Billing\n      </Link>\n    </article>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Billing route</span>\n      <h2>Billing details</h2>\n      <p className="status-banner" data-navai-status>\n        Billing page ready for NAVAI.\n      </p>\n      <Link className="action-link" to="/">\n        Back home\n      </Link>\n    </article>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <main className="page-shell">\n      <section className="hero-grid">\n        <VoiceNavigator />\n\n        <Routes>\n          <Route path="/" element={<HomeScreen />} />\n          <Route path="/billing" element={<BillingScreen />} />\n          <Route path="*" element={<Navigate replace to="/" />} />\n        </Routes>\n      </section>\n    </main>\n  );\n}\n\nexport function VoiceApp() {\n  return (\n    <HashRouter>\n      <AppContent />\n    </HashRouter>\n  );\n}',
          },
          {
            label: "src/pages/index.astro",
            language: "astro",
            code: '---\nimport { VoiceApp } from "../components/VoiceApp";\n\nconst pageTitle = "NAVAI Voice Demo";\n---\n\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width" />\n    <title>{pageTitle}</title>\n    <style is:global>:root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}</style>\n  </head>\n  <body>\n    <VoiceApp client:only="react" />\n  </body>\n</html>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Step 7 Test the web integration",
        description:
          "Regenerate loaders, start Astro, and validate that the Orb stays intact and the session remains alive while navigating between `#/` and `#/billing`.",
        bullets: [
          "Test both a local function and one full page navigation.",
          "If Astro moves from 4321 to another port, open the exact `Local` URL shown in the terminal.",
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
    value: "astro",
    label: "Astro",
    title: "Astro",
    description:
      "Site Astro qui monte un seul shell React avec `@navai/voice-frontend` afin que la session vive dans un unique runtime client.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Etape 1 Creer le projet web",
        description:
          "Creez le projet Astro, gardez le site majoritairement statique et ajoutez `src/components` avec `src/ai` pour le shell voix.",
        bullets: [
          "Cette voie convient aux sites riches en contenu ou la voix n apparait que sur quelques pages.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create astro@latest navai-web-demo\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Etape 2 Installer les dependances",
        description:
          "Ajoutez l integration React d Astro et installez les paquets NAVAI ainsi que `react-router-dom` pour gerer les routes dans l ilot.",
        bullets: [
          "Dans Astro cette demo utilise `HashRouter` dans un unique composant client, pas des pages `.astro` separees pour la voix.",
          'Importez `react-router-dom` comme namespace (`import * as ReactRouterDom from "react-router-dom"`) car Vite n expose pas d export `default`.',
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npx astro add react\nnpm install @navai/voice-frontend @openai/agents@^0.4.14 react-router-dom zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Etape 3 Configurer variables et loaders",
        description:
          "Stockez `PUBLIC_NAVAI_API_URL` pour le navigateur et gardez les cles CLI `NAVAI_*` dans le meme `.env`.",
        bullets: [
          "Astro n expose au client que les variables qui commencent par `PUBLIC_`.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
          'Montez `useWebVoiceAgent` dans `src/components/VoiceNavigator.tsx`, creez un `src/components/VoiceApp.tsx` avec `HashRouter` et chargez cette app une seule fois depuis `src/pages/index.astro` avec `client:only="react"`.',
        bullets: [
          'Utilisez `client:only="react"` car `HashRouter` utilise des API du navigateur comme `document`.',
          "Ainsi l Orb reste dans le meme arbre React et ne depend pas de `transition:persist` entre les pages Astro.",
          "Utilisez `Link` ou `useNavigate()` de `react-router-dom` pour passer de `/` a `/billing` a l interieur du shell.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport * as ReactRouterDom from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nconst { useNavigate } = ReactRouterDom;\n\ntype VoiceNavigatorProps = {\n  statusMessage?: string;\n};\n\nexport function VoiceNavigator({\n  statusMessage = "Voice demo ready for local actions.",\n}: VoiceNavigatorProps) {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <article className="panel">\n      <span className="eyebrow">Astro + NAVAI</span>\n      <h1>Talk to your Astro island.</h1>\n      <p>Keep the voice UI inside one React tree so navigation does not tear down the active session.</p>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="status-banner" data-navai-status>\n        {statusMessage}\n      </p>\n    </article>\n  );\n}',
          },
          {
            label: "src/components/VoiceApp.tsx",
            language: "tsx",
            code: 'import * as ReactRouterDom from "react-router-dom";\n\nimport { VoiceNavigator } from "./VoiceNavigator";\n\nconst { HashRouter, Link, Navigate, Route, Routes } = ReactRouterDom;\n\nfunction HomeScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Demo routes</span>\n      <h2>Home</h2>\n      <p>Ask NAVAI to open Billing and then run show welcome banner.</p>\n      <Link className="action-link" to="/billing">\n        Open Billing\n      </Link>\n    </article>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Billing route</span>\n      <h2>Billing details</h2>\n      <p className="status-banner" data-navai-status>\n        Billing page ready for NAVAI.\n      </p>\n      <Link className="action-link" to="/">\n        Back home\n      </Link>\n    </article>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <main className="page-shell">\n      <section className="hero-grid">\n        <VoiceNavigator />\n\n        <Routes>\n          <Route path="/" element={<HomeScreen />} />\n          <Route path="/billing" element={<BillingScreen />} />\n          <Route path="*" element={<Navigate replace to="/" />} />\n        </Routes>\n      </section>\n    </main>\n  );\n}\n\nexport function VoiceApp() {\n  return (\n    <HashRouter>\n      <AppContent />\n    </HashRouter>\n  );\n}',
          },
          {
            label: "src/pages/index.astro",
            language: "astro",
            code: '---\nimport { VoiceApp } from "../components/VoiceApp";\n\nconst pageTitle = "NAVAI Voice Demo";\n---\n\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width" />\n    <title>{pageTitle}</title>\n    <style is:global>:root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}</style>\n  </head>\n  <body>\n    <VoiceApp client:only="react" />\n  </body>\n</html>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Etape 7 Tester l integration web",
        description:
          "Regenerez les loaders, demarrez Astro et validez que l Orb reste intact et que la session reste vivante lors de la navigation entre `#/` et `#/billing`.",
        bullets: [
          "Testez a la fois une fonction locale et une navigation de page complete.",
          "Si Astro passe de 4321 a un autre port, ouvrez l URL `Local` exacte affichee dans le terminal.",
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
    value: "astro",
    label: "Astro",
    title: "Astro",
    description:
      "Sitio Astro que monta un solo shell React con `@navai/voice-frontend` para que la sesion viva en un unico runtime cliente.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Paso 1 Crear el proyecto web",
        description:
          "Cree el proyecto Astro, mantenga el sitio mayormente estatico y agregue `src/components` junto con `src/ai` para el shell de voz.",
        bullets: [
          "Esta ruta funciona bien cuando la voz vive solo en paginas puntuales y no en toda la app.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create astro@latest navai-web-demo\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Paso 2 Instalar dependencias",
        description:
          "Agregue la integracion React de Astro e instale los paquetes de NAVAI junto con `react-router-dom` para resolver rutas dentro de la isla.",
        bullets: [
          "En Astro este demo usa `HashRouter` dentro de un unico componente cliente, no rutas `.astro` separadas para la voz.",
          'Importe `react-router-dom` como namespace (`import * as ReactRouterDom from "react-router-dom"`) porque Vite no expone un export `default`.',
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npx astro add react\nnpm install @navai/voice-frontend @openai/agents@^0.4.14 react-router-dom zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Paso 3 Configurar variables y loaders",
        description:
          "Guarde `PUBLIC_NAVAI_API_URL` para el browser y mantenga los `NAVAI_*` del CLI en el mismo `.env`.",
        bullets: [
          "Astro solo expone al cliente las variables que empiezan por `PUBLIC_`.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
          'Monte `useWebVoiceAgent` en `src/components/VoiceNavigator.tsx`, arme un `src/components/VoiceApp.tsx` con `HashRouter` y cargue esa app una sola vez desde `src/pages/index.astro` con `client:only="react"`.',
        bullets: [
          'Use `client:only="react"` porque `HashRouter` usa APIs del navegador como `document`.',
          "Asi el Orb vive siempre dentro del mismo arbol React y no depende de `transition:persist` entre paginas Astro.",
          "Use `Link` o `useNavigate()` de `react-router-dom` para cambiar entre `/` y `/billing` dentro del shell.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport * as ReactRouterDom from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nconst { useNavigate } = ReactRouterDom;\n\ntype VoiceNavigatorProps = {\n  statusMessage?: string;\n};\n\nexport function VoiceNavigator({\n  statusMessage = "Voice demo ready for local actions.",\n}: VoiceNavigatorProps) {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <article className="panel">\n      <span className="eyebrow">Astro + NAVAI</span>\n      <h1>Talk to your Astro island.</h1>\n      <p>Keep the voice UI inside one React tree so navigation does not tear down the active session.</p>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="status-banner" data-navai-status>\n        {statusMessage}\n      </p>\n    </article>\n  );\n}',
          },
          {
            label: "src/components/VoiceApp.tsx",
            language: "tsx",
            code: 'import * as ReactRouterDom from "react-router-dom";\n\nimport { VoiceNavigator } from "./VoiceNavigator";\n\nconst { HashRouter, Link, Navigate, Route, Routes } = ReactRouterDom;\n\nfunction HomeScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Demo routes</span>\n      <h2>Home</h2>\n      <p>Ask NAVAI to open Billing and then run show welcome banner.</p>\n      <Link className="action-link" to="/billing">\n        Open Billing\n      </Link>\n    </article>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Billing route</span>\n      <h2>Billing details</h2>\n      <p className="status-banner" data-navai-status>\n        Billing page ready for NAVAI.\n      </p>\n      <Link className="action-link" to="/">\n        Back home\n      </Link>\n    </article>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <main className="page-shell">\n      <section className="hero-grid">\n        <VoiceNavigator />\n\n        <Routes>\n          <Route path="/" element={<HomeScreen />} />\n          <Route path="/billing" element={<BillingScreen />} />\n          <Route path="*" element={<Navigate replace to="/" />} />\n        </Routes>\n      </section>\n    </main>\n  );\n}\n\nexport function VoiceApp() {\n  return (\n    <HashRouter>\n      <AppContent />\n    </HashRouter>\n  );\n}',
          },
          {
            label: "src/pages/index.astro",
            language: "astro",
            code: '---\nimport { VoiceApp } from "../components/VoiceApp";\n\nconst pageTitle = "NAVAI Voice Demo";\n---\n\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width" />\n    <title>{pageTitle}</title>\n    <style is:global>:root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}</style>\n  </head>\n  <body>\n    <VoiceApp client:only="react" />\n  </body>\n</html>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Paso 7 Probar la integracion web",
        description:
          "Regenere loaders, levante Astro y valide que el Orb siga intacto y que la sesion continue viva al navegar entre `#/` y `#/billing`.",
        bullets: [
          "Pruebe tanto una function local como una navegacion completa de pagina.",
          "Si Astro cambia de 4321 a otro puerto, abra la URL `Local` exacta que muestra la terminal.",
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
    value: "astro",
    label: "Astro",
    title: "Astro",
    description:
      "Site Astro que monta um unico shell React com `@navai/voice-frontend` para manter a sessao em um unico runtime cliente.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Passo 1 Criar o projeto web",
        description:
          "Crie o projeto Astro, mantenha o site majoritariamente estatico e adicione `src/components` junto de `src/ai` para o shell de voz.",
        bullets: [
          "Esse caminho e bom quando a voz aparece so em paginas selecionadas.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create astro@latest navai-web-demo\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Passo 2 Instalar dependencias",
        description:
          "Adicione a integracao React do Astro e instale os pacotes do NAVAI junto com `react-router-dom` para resolver rotas dentro da ilha.",
        bullets: [
          "No Astro este demo usa `HashRouter` dentro de um unico componente cliente, nao paginas `.astro` separadas para a voz.",
          'Importe `react-router-dom` como namespace (`import * as ReactRouterDom from "react-router-dom"`) porque o Vite nao expoe um export `default`.',
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npx astro add react\nnpm install @navai/voice-frontend @openai/agents@^0.4.14 react-router-dom zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Passo 3 Configurar variaveis e loaders",
        description:
          "Guarde `PUBLIC_NAVAI_API_URL` para o browser e mantenha as chaves `NAVAI_*` do CLI no mesmo `.env`.",
        bullets: [
          "Astro so expose ao cliente variaveis que comecam com `PUBLIC_`.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
          'Monte `useWebVoiceAgent` em `src/components/VoiceNavigator.tsx`, crie um `src/components/VoiceApp.tsx` com `HashRouter` e carregue essa app uma unica vez de `src/pages/index.astro` com `client:only="react"`.',
        bullets: [
          'Use `client:only="react"` porque `HashRouter` usa APIs do navegador como `document`.',
          "Assim o Orb fica sempre no mesmo arvore React e nao depende de `transition:persist` entre paginas Astro.",
          "Use `Link` ou `useNavigate()` de `react-router-dom` para alternar entre `/` e `/billing` dentro do shell.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport * as ReactRouterDom from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nconst { useNavigate } = ReactRouterDom;\n\ntype VoiceNavigatorProps = {\n  statusMessage?: string;\n};\n\nexport function VoiceNavigator({\n  statusMessage = "Voice demo ready for local actions.",\n}: VoiceNavigatorProps) {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <article className="panel">\n      <span className="eyebrow">Astro + NAVAI</span>\n      <h1>Talk to your Astro island.</h1>\n      <p>Keep the voice UI inside one React tree so navigation does not tear down the active session.</p>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="status-banner" data-navai-status>\n        {statusMessage}\n      </p>\n    </article>\n  );\n}',
          },
          {
            label: "src/components/VoiceApp.tsx",
            language: "tsx",
            code: 'import * as ReactRouterDom from "react-router-dom";\n\nimport { VoiceNavigator } from "./VoiceNavigator";\n\nconst { HashRouter, Link, Navigate, Route, Routes } = ReactRouterDom;\n\nfunction HomeScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Demo routes</span>\n      <h2>Home</h2>\n      <p>Ask NAVAI to open Billing and then run show welcome banner.</p>\n      <Link className="action-link" to="/billing">\n        Open Billing\n      </Link>\n    </article>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Billing route</span>\n      <h2>Billing details</h2>\n      <p className="status-banner" data-navai-status>\n        Billing page ready for NAVAI.\n      </p>\n      <Link className="action-link" to="/">\n        Back home\n      </Link>\n    </article>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <main className="page-shell">\n      <section className="hero-grid">\n        <VoiceNavigator />\n\n        <Routes>\n          <Route path="/" element={<HomeScreen />} />\n          <Route path="/billing" element={<BillingScreen />} />\n          <Route path="*" element={<Navigate replace to="/" />} />\n        </Routes>\n      </section>\n    </main>\n  );\n}\n\nexport function VoiceApp() {\n  return (\n    <HashRouter>\n      <AppContent />\n    </HashRouter>\n  );\n}',
          },
          {
            label: "src/pages/index.astro",
            language: "astro",
            code: '---\nimport { VoiceApp } from "../components/VoiceApp";\n\nconst pageTitle = "NAVAI Voice Demo";\n---\n\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width" />\n    <title>{pageTitle}</title>\n    <style is:global>:root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}</style>\n  </head>\n  <body>\n    <VoiceApp client:only="react" />\n  </body>\n</html>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Passo 7 Testar a integracao web",
        description:
          "Regenere loaders, suba o Astro e valide que o Orb continua intacto e a sessao segue viva ao navegar entre `#/` e `#/billing`.",
        bullets: [
          "Teste tanto uma funcao local quanto uma navegacao completa de pagina.",
          "Se o Astro trocar de 4321 para outra porta, abra a URL `Local` exata mostrada no terminal.",
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
    value: "astro",
    label: "Astro",
    title: "Astro",
    description:
      "挂载单一 React shell 的 Astro site，借助 `@navai/voice-frontend` 让 session 保持在同一个 client runtime 中。",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "步骤 1 创建 Web 项目",
        description:
          "创建 Astro project，保持 site mostly static，并添加 `src/components` 与 `src/ai` 来承载 voice shell。",
        bullets: [
          "这个路径适合 content-heavy site，只在部分 pages 上提供 voice。",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create astro@latest navai-web-demo\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "步骤 2 安装依赖",
        description:
          "添加 Astro 的 React integration，并安装 NAVAI packages 与 `react-router-dom`，让路由在 island 内部处理。",
        bullets: [
          "这个 Astro demo 不用多个 `.astro` pages 承载 voice UI，而是在一个 client component 里使用 `HashRouter`。",
          '请把 `react-router-dom` 写成 namespace import（`import * as ReactRouterDom from "react-router-dom"`），因为 Vite 不提供 `default` export。',
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npx astro add react\nnpm install @navai/voice-frontend @openai/agents@^0.4.14 react-router-dom zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "步骤 3 配置 Env 与 loaders",
        description:
          "为 browser 保存 `PUBLIC_NAVAI_API_URL`，并将 CLI 用到的 `NAVAI_*` keys 保留在同一个 `.env` 文件中。",
        bullets: ["Astro 只会把以 `PUBLIC_` 开头的 values 暴露给 client。"],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
          '把 `useWebVoiceAgent` 挂载到 `src/components/VoiceNavigator.tsx`，再创建使用 `HashRouter` 的 `src/components/VoiceApp.tsx`，并从 `src/pages/index.astro` 通过 `client:only="react"` 只加载这一个 app。',
        bullets: [
          '这个 shell 必须通过 `client:only="react"` 加载，因为 `HashRouter` 会使用 `document` 这类浏览器 API。',
          "这样 Orb 始终留在同一个 React tree 中，不再依赖 Astro pages 之间的 `transition:persist`。",
          "使用 `react-router-dom` 的 `Link` 或 `useNavigate()` 在 shell 内部切换 `/` 和 `/billing`。",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport * as ReactRouterDom from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nconst { useNavigate } = ReactRouterDom;\n\ntype VoiceNavigatorProps = {\n  statusMessage?: string;\n};\n\nexport function VoiceNavigator({\n  statusMessage = "Voice demo ready for local actions.",\n}: VoiceNavigatorProps) {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <article className="panel">\n      <span className="eyebrow">Astro + NAVAI</span>\n      <h1>Talk to your Astro island.</h1>\n      <p>Keep the voice UI inside one React tree so navigation does not tear down the active session.</p>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="status-banner" data-navai-status>\n        {statusMessage}\n      </p>\n    </article>\n  );\n}',
          },
          {
            label: "src/components/VoiceApp.tsx",
            language: "tsx",
            code: 'import * as ReactRouterDom from "react-router-dom";\n\nimport { VoiceNavigator } from "./VoiceNavigator";\n\nconst { HashRouter, Link, Navigate, Route, Routes } = ReactRouterDom;\n\nfunction HomeScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Demo routes</span>\n      <h2>Home</h2>\n      <p>Ask NAVAI to open Billing and then run show welcome banner.</p>\n      <Link className="action-link" to="/billing">\n        Open Billing\n      </Link>\n    </article>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Billing route</span>\n      <h2>Billing details</h2>\n      <p className="status-banner" data-navai-status>\n        Billing page ready for NAVAI.\n      </p>\n      <Link className="action-link" to="/">\n        Back home\n      </Link>\n    </article>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <main className="page-shell">\n      <section className="hero-grid">\n        <VoiceNavigator />\n\n        <Routes>\n          <Route path="/" element={<HomeScreen />} />\n          <Route path="/billing" element={<BillingScreen />} />\n          <Route path="*" element={<Navigate replace to="/" />} />\n        </Routes>\n      </section>\n    </main>\n  );\n}\n\nexport function VoiceApp() {\n  return (\n    <HashRouter>\n      <AppContent />\n    </HashRouter>\n  );\n}',
          },
          {
            label: "src/pages/index.astro",
            language: "astro",
            code: '---\nimport { VoiceApp } from "../components/VoiceApp";\n\nconst pageTitle = "NAVAI Voice Demo";\n---\n\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width" />\n    <title>{pageTitle}</title>\n    <style is:global>:root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}</style>\n  </head>\n  <body>\n    <VoiceApp client:only="react" />\n  </body>\n</html>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "步骤 7 测试 Web integration",
        description:
          "重新生成 loaders，启动 Astro，并验证在 `#/` 和 `#/billing` 之间切换时 Orb 不会损坏且 session 保持存活。",
        bullets: [
          "同时测试 local function 和 full page navigation。",
          "如果 Astro 从 4321 切换到别的 port，请打开 terminal 中显示的准确 `Local` URL。",
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
    value: "astro",
    label: "Astro",
    title: "Astro",
    description:
      "`@navai/voice-frontend` を 1 つの React shell として mount し、session を 1 つの client runtime に保つ Astro site です。",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "ステップ 1 Web プロジェクトを作成",
        description:
          "Astro project を作成し、site は mostly static のままにして、voice shell 用に `src/components` と `src/ai` を追加します。",
        bullets: [
          "Voice を一部の pages にだけ置きたい content-heavy site に向いています。",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create astro@latest navai-web-demo\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "ステップ 2 依存関係をインストール",
        description:
          "Astro の React integration を追加し、NAVAI packages と `react-router-dom` を install して、routes を island の中で解決します。",
        bullets: [
          "Astro では voice UI 用に別々の `.astro` pages を使わず、1 つの client component 内で `HashRouter` を使う demo です。",
          '`react-router-dom` は namespace import (`import * as ReactRouterDom from "react-router-dom"`) を使ってください。Vite は `default` export を出しません。',
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npx astro add react\nnpm install @navai/voice-frontend @openai/agents@^0.4.14 react-router-dom zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "ステップ 3 Env と loaders を設定",
        description:
          "Browser 用に `PUBLIC_NAVAI_API_URL` を保存し、CLI 用の `NAVAI_*` keys は同じ `.env` に保持します。",
        bullets: [
          "Astro が client へ公開するのは `PUBLIC_` で始まる values だけです。",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
          '`useWebVoiceAgent` を `src/components/VoiceNavigator.tsx` に mount し、`HashRouter` を使う `src/components/VoiceApp.tsx` を作成して、その app を `src/pages/index.astro` から 1 回だけ `client:only="react"` で読み込みます。',
        bullets: [
          'この shell は `client:only="react"` で読み込んでください。`HashRouter` は `document` などの browser APIs を使います。',
          "これで Orb は常に同じ React tree に残り、Astro pages 間の `transition:persist` に依存しません。",
          "`react-router-dom` の `Link` または `useNavigate()` で shell 内の `/` と `/billing` を切り替えてください。",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport * as ReactRouterDom from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nconst { useNavigate } = ReactRouterDom;\n\ntype VoiceNavigatorProps = {\n  statusMessage?: string;\n};\n\nexport function VoiceNavigator({\n  statusMessage = "Voice demo ready for local actions.",\n}: VoiceNavigatorProps) {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <article className="panel">\n      <span className="eyebrow">Astro + NAVAI</span>\n      <h1>Talk to your Astro island.</h1>\n      <p>Keep the voice UI inside one React tree so navigation does not tear down the active session.</p>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="status-banner" data-navai-status>\n        {statusMessage}\n      </p>\n    </article>\n  );\n}',
          },
          {
            label: "src/components/VoiceApp.tsx",
            language: "tsx",
            code: 'import * as ReactRouterDom from "react-router-dom";\n\nimport { VoiceNavigator } from "./VoiceNavigator";\n\nconst { HashRouter, Link, Navigate, Route, Routes } = ReactRouterDom;\n\nfunction HomeScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Demo routes</span>\n      <h2>Home</h2>\n      <p>Ask NAVAI to open Billing and then run show welcome banner.</p>\n      <Link className="action-link" to="/billing">\n        Open Billing\n      </Link>\n    </article>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Billing route</span>\n      <h2>Billing details</h2>\n      <p className="status-banner" data-navai-status>\n        Billing page ready for NAVAI.\n      </p>\n      <Link className="action-link" to="/">\n        Back home\n      </Link>\n    </article>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <main className="page-shell">\n      <section className="hero-grid">\n        <VoiceNavigator />\n\n        <Routes>\n          <Route path="/" element={<HomeScreen />} />\n          <Route path="/billing" element={<BillingScreen />} />\n          <Route path="*" element={<Navigate replace to="/" />} />\n        </Routes>\n      </section>\n    </main>\n  );\n}\n\nexport function VoiceApp() {\n  return (\n    <HashRouter>\n      <AppContent />\n    </HashRouter>\n  );\n}',
          },
          {
            label: "src/pages/index.astro",
            language: "astro",
            code: '---\nimport { VoiceApp } from "../components/VoiceApp";\n\nconst pageTitle = "NAVAI Voice Demo";\n---\n\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width" />\n    <title>{pageTitle}</title>\n    <style is:global>:root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}</style>\n  </head>\n  <body>\n    <VoiceApp client:only="react" />\n  </body>\n</html>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "ステップ 7 Web integration をテスト",
        description:
          "Loaders を再生成し、Astro を起動して、`#/` と `#/billing` の間を移動しても Orb が崩れず session が生きたままか確認します。",
        bullets: [
          "Local function と full page navigation の両方を test してください。",
          "Astro が 4321 以外の port に切り替わったら、terminal に出た正確な `Local` URL を開いてください。",
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
    value: "astro",
    label: "Astro",
    title: "Astro",
    description:
      "Astro site, где `@navai/voice-frontend` монтируется как единый React shell, чтобы session жила в одном client runtime.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Шаг 1 Создать web-проект",
        description:
          "Создайте Astro project, оставьте сайт mostly static и добавьте `src/components` вместе с `src/ai` для voice shell.",
        bullets: [
          "Этот путь подходит для content-heavy sites, где voice нужна только на отдельных pages.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create astro@latest navai-web-demo\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Шаг 2 Установить зависимости",
        description:
          "Добавьте React integration для Astro и установите packages NAVAI вместе с `react-router-dom`, чтобы routes обрабатывались внутри island.",
        bullets: [
          "В Astro этот demo использует `HashRouter` внутри одного client component, а не отдельные `.astro` pages для voice UI.",
          'Импортируйте `react-router-dom` как namespace (`import * as ReactRouterDom from "react-router-dom"`), потому что Vite не отдает `default` export.',
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npx astro add react\nnpm install @navai/voice-frontend @openai/agents@^0.4.14 react-router-dom zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Шаг 3 Настроить env и loaders",
        description:
          "Сохраните `PUBLIC_NAVAI_API_URL` для browser и оставьте CLI keys `NAVAI_*` в том же `.env` file.",
        bullets: [
          "Astro публикует в client только values, начинающиеся с `PUBLIC_`.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
          'Смонтируйте `useWebVoiceAgent` в `src/components/VoiceNavigator.tsx`, соберите `src/components/VoiceApp.tsx` с `HashRouter` и загрузите это app один раз из `src/pages/index.astro` через `client:only="react"`.',
        bullets: [
          'Загружайте этот shell через `client:only="react"`, потому что `HashRouter` использует browser APIs вроде `document`.',
          "Так Orb всегда остается в одном React tree и не зависит от `transition:persist` между Astro pages.",
          "Используйте `Link` или `useNavigate()` из `react-router-dom`, чтобы переключаться между `/` и `/billing` внутри shell.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport * as ReactRouterDom from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nconst { useNavigate } = ReactRouterDom;\n\ntype VoiceNavigatorProps = {\n  statusMessage?: string;\n};\n\nexport function VoiceNavigator({\n  statusMessage = "Voice demo ready for local actions.",\n}: VoiceNavigatorProps) {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <article className="panel">\n      <span className="eyebrow">Astro + NAVAI</span>\n      <h1>Talk to your Astro island.</h1>\n      <p>Keep the voice UI inside one React tree so navigation does not tear down the active session.</p>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="status-banner" data-navai-status>\n        {statusMessage}\n      </p>\n    </article>\n  );\n}',
          },
          {
            label: "src/components/VoiceApp.tsx",
            language: "tsx",
            code: 'import * as ReactRouterDom from "react-router-dom";\n\nimport { VoiceNavigator } from "./VoiceNavigator";\n\nconst { HashRouter, Link, Navigate, Route, Routes } = ReactRouterDom;\n\nfunction HomeScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Demo routes</span>\n      <h2>Home</h2>\n      <p>Ask NAVAI to open Billing and then run show welcome banner.</p>\n      <Link className="action-link" to="/billing">\n        Open Billing\n      </Link>\n    </article>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Billing route</span>\n      <h2>Billing details</h2>\n      <p className="status-banner" data-navai-status>\n        Billing page ready for NAVAI.\n      </p>\n      <Link className="action-link" to="/">\n        Back home\n      </Link>\n    </article>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <main className="page-shell">\n      <section className="hero-grid">\n        <VoiceNavigator />\n\n        <Routes>\n          <Route path="/" element={<HomeScreen />} />\n          <Route path="/billing" element={<BillingScreen />} />\n          <Route path="*" element={<Navigate replace to="/" />} />\n        </Routes>\n      </section>\n    </main>\n  );\n}\n\nexport function VoiceApp() {\n  return (\n    <HashRouter>\n      <AppContent />\n    </HashRouter>\n  );\n}',
          },
          {
            label: "src/pages/index.astro",
            language: "astro",
            code: '---\nimport { VoiceApp } from "../components/VoiceApp";\n\nconst pageTitle = "NAVAI Voice Demo";\n---\n\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width" />\n    <title>{pageTitle}</title>\n    <style is:global>:root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}</style>\n  </head>\n  <body>\n    <VoiceApp client:only="react" />\n  </body>\n</html>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Шаг 7 Проверить web integration",
        description:
          "Перегенерируйте loaders, запустите Astro и проверьте, что Orb не ломается и session остается живой при переходах между `#/` и `#/billing`.",
        bullets: [
          "Проверьте и local function, и full page navigation.",
          "Если Astro переключится с 4321 на другой port, откройте точный `Local` URL из terminal.",
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
    value: "astro",
    label: "Astro",
    title: "Astro",
    description:
      "`@navai/voice-frontend` 를 하나의 React shell 로 mount 해서 session 을 하나의 client runtime 에 유지하는 Astro site 입니다.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "1단계 Web 프로젝트 생성",
        description:
          "Astro project 를 만들고 site 는 mostly static 으로 유지하며 voice shell 용 `src/components` 와 `src/ai` 를 추가하세요.",
        bullets: [
          "Voice 가 일부 pages 에만 필요한 content-heavy site 에 적합합니다.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create astro@latest navai-web-demo\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "2단계 Dependencies 설치",
        description:
          "Astro 의 React integration 을 추가하고 NAVAI packages 와 `react-router-dom` 를 설치해 routes 를 island 안에서 처리하세요.",
        bullets: [
          "Astro 에서 이 demo 는 voice UI 용 별도 `.astro` pages 대신 하나의 client component 안에서 `HashRouter` 를 사용합니다.",
          '`react-router-dom` 은 namespace import (`import * as ReactRouterDom from "react-router-dom"`) 로 가져오세요. Vite 는 `default` export 를 제공하지 않습니다.',
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npx astro add react\nnpm install @navai/voice-frontend @openai/agents@^0.4.14 react-router-dom zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "3단계 Env 와 loaders 설정",
        description:
          "Browser 용 `PUBLIC_NAVAI_API_URL` 을 저장하고, CLI 용 `NAVAI_*` keys 는 같은 `.env` 에 유지하세요.",
        bullets: [
          "Astro 는 `PUBLIC_` 로 시작하는 values 만 client 에 노출합니다.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
          '`useWebVoiceAgent` 를 `src/components/VoiceNavigator.tsx` 에 mount 하고 `HashRouter` 를 쓰는 `src/components/VoiceApp.tsx` 를 만든 뒤 그 app 을 `src/pages/index.astro` 에서 한 번만 `client:only="react"` 로 불러오세요.',
        bullets: [
          '이 shell 은 `client:only="react"` 로 불러와야 합니다. `HashRouter` 는 `document` 같은 browser APIs 를 사용합니다.',
          "이렇게 하면 Orb 는 항상 같은 React tree 안에 남고 Astro pages 사이의 `transition:persist` 에 의존하지 않습니다.",
          "`react-router-dom` 의 `Link` 나 `useNavigate()` 로 shell 내부의 `/` 와 `/billing` 을 전환하세요.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport * as ReactRouterDom from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nconst { useNavigate } = ReactRouterDom;\n\ntype VoiceNavigatorProps = {\n  statusMessage?: string;\n};\n\nexport function VoiceNavigator({\n  statusMessage = "Voice demo ready for local actions.",\n}: VoiceNavigatorProps) {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <article className="panel">\n      <span className="eyebrow">Astro + NAVAI</span>\n      <h1>Talk to your Astro island.</h1>\n      <p>Keep the voice UI inside one React tree so navigation does not tear down the active session.</p>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="status-banner" data-navai-status>\n        {statusMessage}\n      </p>\n    </article>\n  );\n}',
          },
          {
            label: "src/components/VoiceApp.tsx",
            language: "tsx",
            code: 'import * as ReactRouterDom from "react-router-dom";\n\nimport { VoiceNavigator } from "./VoiceNavigator";\n\nconst { HashRouter, Link, Navigate, Route, Routes } = ReactRouterDom;\n\nfunction HomeScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Demo routes</span>\n      <h2>Home</h2>\n      <p>Ask NAVAI to open Billing and then run show welcome banner.</p>\n      <Link className="action-link" to="/billing">\n        Open Billing\n      </Link>\n    </article>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Billing route</span>\n      <h2>Billing details</h2>\n      <p className="status-banner" data-navai-status>\n        Billing page ready for NAVAI.\n      </p>\n      <Link className="action-link" to="/">\n        Back home\n      </Link>\n    </article>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <main className="page-shell">\n      <section className="hero-grid">\n        <VoiceNavigator />\n\n        <Routes>\n          <Route path="/" element={<HomeScreen />} />\n          <Route path="/billing" element={<BillingScreen />} />\n          <Route path="*" element={<Navigate replace to="/" />} />\n        </Routes>\n      </section>\n    </main>\n  );\n}\n\nexport function VoiceApp() {\n  return (\n    <HashRouter>\n      <AppContent />\n    </HashRouter>\n  );\n}',
          },
          {
            label: "src/pages/index.astro",
            language: "astro",
            code: '---\nimport { VoiceApp } from "../components/VoiceApp";\n\nconst pageTitle = "NAVAI Voice Demo";\n---\n\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width" />\n    <title>{pageTitle}</title>\n    <style is:global>:root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}</style>\n  </head>\n  <body>\n    <VoiceApp client:only="react" />\n  </body>\n</html>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "7단계 Web integration 테스트",
        description:
          "Loaders 를 다시 생성하고 Astro 를 시작해 `#/` 와 `#/billing` 사이를 이동해도 Orb 가 깨지지 않고 session 이 살아 있는지 검증하세요.",
        bullets: [
          "Local function 과 full page navigation 을 모두 테스트하세요.",
          "Astro 가 4321 이 아닌 다른 port 로 바뀌면 terminal 에 표시된 정확한 `Local` URL 을 여세요.",
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
    value: "astro",
    label: "Astro",
    title: "Astro",
    description:
      "ऐसा Astro site जो `@navai/voice-frontend` के साथ एक ही React shell mount करता है ताकि session एक ही client runtime में रहे।",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "चरण 1 Web project बनाएं",
        description:
          "Astro project बनाएं, site को mostly static रखें और voice shell के लिए `src/components` तथा `src/ai` जोड़ें।",
        bullets: [
          "यह setup content-heavy sites के लिए उपयोगी है जहां voice सिर्फ कुछ pages पर चाहिए।",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create astro@latest navai-web-demo\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "चरण 2 Dependencies install करें",
        description:
          "Astro की React integration add करें और NAVAI packages के साथ `react-router-dom` install करें ताकि routes island के अंदर resolve हों।",
        bullets: [
          "Astro में यह demo voice UI के लिए अलग `.astro` pages नहीं, बल्कि एक ही client component के अंदर `HashRouter` उपयोग करता है।",
          '`react-router-dom` को namespace import (`import * as ReactRouterDom from "react-router-dom"`) के रूप में लाएं, क्योंकि Vite `default` export नहीं देता।',
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npx astro add react\nnpm install @navai/voice-frontend @openai/agents@^0.4.14 react-router-dom zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "चरण 3 Env और loaders configure करें",
        description:
          "Browser के लिए `PUBLIC_NAVAI_API_URL` रखें और CLI वाली `NAVAI_*` keys उसी `.env` file में रखें।",
        bullets: [
          "Astro client को सिर्फ `PUBLIC_` से शुरू होने वाली values expose करता है।",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
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
          '`useWebVoiceAgent` को `src/components/VoiceNavigator.tsx` में mount करें, `HashRouter` वाला `src/components/VoiceApp.tsx` बनाएं और उस app को `src/pages/index.astro` से एक बार `client:only="react"` के साथ load करें।',
        bullets: [
          'इस shell को `client:only="react"` से load करें, क्योंकि `HashRouter` `document` जैसी browser APIs इस्तेमाल करता है।',
          "इस तरह Orb हमेशा उसी React tree में रहता है और Astro pages के बीच `transition:persist` पर निर्भर नहीं करता।",
          "`react-router-dom` के `Link` या `useNavigate()` से shell के अंदर `/` और `/billing` के बीच बदलें।",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport * as ReactRouterDom from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nconst { useNavigate } = ReactRouterDom;\n\ntype VoiceNavigatorProps = {\n  statusMessage?: string;\n};\n\nexport function VoiceNavigator({\n  statusMessage = "Voice demo ready for local actions.",\n}: VoiceNavigatorProps) {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <article className="panel">\n      <span className="eyebrow">Astro + NAVAI</span>\n      <h1>Talk to your Astro island.</h1>\n      <p>Keep the voice UI inside one React tree so navigation does not tear down the active session.</p>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="status-banner" data-navai-status>\n        {statusMessage}\n      </p>\n    </article>\n  );\n}',
          },
          {
            label: "src/components/VoiceApp.tsx",
            language: "tsx",
            code: 'import * as ReactRouterDom from "react-router-dom";\n\nimport { VoiceNavigator } from "./VoiceNavigator";\n\nconst { HashRouter, Link, Navigate, Route, Routes } = ReactRouterDom;\n\nfunction HomeScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Demo routes</span>\n      <h2>Home</h2>\n      <p>Ask NAVAI to open Billing and then run show welcome banner.</p>\n      <Link className="action-link" to="/billing">\n        Open Billing\n      </Link>\n    </article>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <article className="panel">\n      <span className="eyebrow">Billing route</span>\n      <h2>Billing details</h2>\n      <p className="status-banner" data-navai-status>\n        Billing page ready for NAVAI.\n      </p>\n      <Link className="action-link" to="/">\n        Back home\n      </Link>\n    </article>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <main className="page-shell">\n      <section className="hero-grid">\n        <VoiceNavigator />\n\n        <Routes>\n          <Route path="/" element={<HomeScreen />} />\n          <Route path="/billing" element={<BillingScreen />} />\n          <Route path="*" element={<Navigate replace to="/" />} />\n        </Routes>\n      </section>\n    </main>\n  );\n}\n\nexport function VoiceApp() {\n  return (\n    <HashRouter>\n      <AppContent />\n    </HashRouter>\n  );\n}',
          },
          {
            label: "src/pages/index.astro",
            language: "astro",
            code: '---\nimport { VoiceApp } from "../components/VoiceApp";\n\nconst pageTitle = "NAVAI Voice Demo";\n---\n\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width" />\n    <title>{pageTitle}</title>\n    <style is:global>:root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}</style>\n  </head>\n  <body>\n    <VoiceApp client:only="react" />\n  </body>\n</html>',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "चरण 7 Web integration test करें",
        description:
          "Loaders regenerate करें, Astro start करें और validate करें कि `#/` और `#/billing` के बीच जाते समय Orb intact रहे और session alive बनी रहे।",
        bullets: [
          "एक local function और एक full page navigation दोनों test करें।",
          "अगर Astro 4321 से किसी दूसरे port पर चला जाए, तो terminal में दिखी exact `Local` URL खोलें।",
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

export function getWebAstroGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return getLocalizedInstallationGuideTab(WEB_ASTRO_GUIDE_TABS, language);
}
