import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";

const WEB_REACTJS_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  en: {
    value: "react-js",
    label: "React.js",
    title: "React.js + Vite",
    description: "React SPA with hook-based integration on top of Vite.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Step 1 Create the web project",
        description:
          "Scaffold the React app with Vite and prepare the folders where NAVAI will discover routes, local tools, and the voice component.",
        bullets: [
          "Keep `BrowserRouter` mounted before rendering the voice control.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vite@latest navai-web-demo -- --template react-ts\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Step 2 Install dependencies",
        description:
          "Install the NAVAI web runtime, the realtime SDK, and `react-router-dom` so path navigation lives in the same UI layer.",
        bullets: [
          "If the project already exists, add only the packages that are still missing.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react-router-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Step 3 Configure env and loaders",
        description:
          "Configure `.env` with `VITE_NAVAI_API_URL` and the paths the loader generator will use to index `routes` and `functions`.",
        bullets: [
          "Only variables prefixed with `VITE_` are exposed to browser code.",
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
          "Mount `useWebVoiceAgent` inside `VoiceNavigator`, wire it to `useNavigate()`, and pass loaders, default routes, and the `env` object.",
        bullets: [
          "Render the button inside the tree already wrapped by `BrowserRouter`.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport { useNavigate } from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <section className="voice-card">\n      <div className="voice-copy">\n        <span className="voice-eyebrow">NAVAI Voice</span>\n        <h1>Talk to your web app.</h1>\n        <p>\n          Use the Orb to open routes like Billing and to run local functions such\n          as <code>show_welcome_banner</code>.\n        </p>\n      </div>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="voice-status-banner" data-navai-status>\n        Voice demo ready for local actions.\n      </p>\n\n      <p className="voice-hint">Try: "Open billing" or "Run show welcome banner".</p>\n    </section>\n  );\n}',
          },
          {
            label: "src/App.tsx",
            language: "tsx",
            code: 'import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";\n\nimport { VoiceNavigator } from "./components/VoiceNavigator";\n\nfunction HomeScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Demo route</span>\n        <h2>Home dashboard</h2>\n        <p>\n          Start the Orb, then ask NAVAI to open Billing or navigate manually with the\n          links in the header.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Voice commands</span>\n        <ul className="command-list">\n          <li>Open billing</li>\n          <li>Go back home</li>\n          <li>Run show welcome banner</li>\n        </ul>\n      </article>\n    </section>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Billing route</span>\n        <h2>Billing</h2>\n        <p>\n          This route exposes a <code>data-navai-status</code> banner so NAVAI can\n          update the interface when a local function runs.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Local function result</span>\n        <p className="status-banner" data-navai-status>\n          Billing screen ready for NAVAI.\n        </p>\n      </article>\n    </section>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <div className="app-shell">\n      <div className="app-frame">\n        <aside className="voice-column">\n          <VoiceNavigator />\n        </aside>\n\n        <main className="demo-column">\n          <header className="demo-header">\n            <div>\n              <span className="panel-kicker">React.js + NAVAI</span>\n              <h2>Test navigation, voice status, and local functions in one screen.</h2>\n            </div>\n\n            <nav className="demo-nav" aria-label="Primary">\n              <Link to="/">Home</Link>\n              <Link to="/billing">Billing</Link>\n            </nav>\n          </header>\n\n          <Routes>\n            <Route path="/" element={<HomeScreen />} />\n            <Route path="/billing" element={<BillingScreen />} />\n            <Route path="*" element={<Navigate replace to="/" />} />\n          </Routes>\n        </main>\n      </div>\n    </div>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <AppContent />\n    </BrowserRouter>\n  );\n}',
          },
          {
            label: "src/main.tsx",
            language: "tsx",
            code: 'import React from "react";\nimport ReactDOM from "react-dom/client";\n\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);',
          },
          {
            label: "src/index.css",
            language: "css",
            code: ':root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Step 7 Test the web integration",
        description:
          "Regenerate loaders, start Vite, and validate microphone access, route navigation, local function execution, and backend fallback.",
        bullets: [
          "Confirm that `generated-module-loaders.ts` changes when you add a new tool.",
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
    value: "react-js",
    label: "React.js",
    title: "React.js + Vite",
    description:
      "SPA React avec integration basee sur le hook officiel au-dessus de Vite.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Etape 1 Creer le projet web",
        description:
          "Generez l application React avec Vite et preparez les dossiers ou NAVAI decouvrira routes, tools locales et composant de voix.",
        bullets: [
          "Gardez `BrowserRouter` monte avant de rendre le controle vocal.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vite@latest navai-web-demo -- --template react-ts\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Etape 2 Installer les dependances",
        description:
          "Installez le runtime web NAVAI, le SDK realtime et `react-router-dom` pour garder la navigation par path dans la meme couche UI.",
        bullets: [
          "Si le projet existe deja, ajoutez seulement les paquets manquants.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react-router-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Etape 3 Configurer variables et loaders",
        description:
          "Configurez `.env` avec `VITE_NAVAI_API_URL` et les chemins que le generateur utilisera pour indexer `routes` et `functions`.",
        bullets: [
          "Seules les variables prefixees par `VITE_` sont exposees au navigateur.",
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
          "Montez `useWebVoiceAgent` dans `VoiceNavigator`, branchez-le a `useNavigate()` et passez loaders, routes par defaut et objet `env`.",
        bullets: [
          "Rendez le bouton dans l arbre deja enveloppe par `BrowserRouter`.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport { useNavigate } from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <section className="voice-card">\n      <div className="voice-copy">\n        <span className="voice-eyebrow">NAVAI Voice</span>\n        <h1>Talk to your web app.</h1>\n        <p>\n          Use the Orb to open routes like Billing and to run local functions such\n          as <code>show_welcome_banner</code>.\n        </p>\n      </div>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="voice-status-banner" data-navai-status>\n        Voice demo ready for local actions.\n      </p>\n\n      <p className="voice-hint">Try: "Open billing" or "Run show welcome banner".</p>\n    </section>\n  );\n}',
          },
          {
            label: "src/App.tsx",
            language: "tsx",
            code: 'import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";\n\nimport { VoiceNavigator } from "./components/VoiceNavigator";\n\nfunction HomeScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Demo route</span>\n        <h2>Home dashboard</h2>\n        <p>\n          Start the Orb, then ask NAVAI to open Billing or navigate manually with the\n          links in the header.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Voice commands</span>\n        <ul className="command-list">\n          <li>Open billing</li>\n          <li>Go back home</li>\n          <li>Run show welcome banner</li>\n        </ul>\n      </article>\n    </section>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Billing route</span>\n        <h2>Billing</h2>\n        <p>\n          This route exposes a <code>data-navai-status</code> banner so NAVAI can\n          update the interface when a local function runs.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Local function result</span>\n        <p className="status-banner" data-navai-status>\n          Billing screen ready for NAVAI.\n        </p>\n      </article>\n    </section>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <div className="app-shell">\n      <div className="app-frame">\n        <aside className="voice-column">\n          <VoiceNavigator />\n        </aside>\n\n        <main className="demo-column">\n          <header className="demo-header">\n            <div>\n              <span className="panel-kicker">React.js + NAVAI</span>\n              <h2>Test navigation, voice status, and local functions in one screen.</h2>\n            </div>\n\n            <nav className="demo-nav" aria-label="Primary">\n              <Link to="/">Home</Link>\n              <Link to="/billing">Billing</Link>\n            </nav>\n          </header>\n\n          <Routes>\n            <Route path="/" element={<HomeScreen />} />\n            <Route path="/billing" element={<BillingScreen />} />\n            <Route path="*" element={<Navigate replace to="/" />} />\n          </Routes>\n        </main>\n      </div>\n    </div>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <AppContent />\n    </BrowserRouter>\n  );\n}',
          },
          {
            label: "src/main.tsx",
            language: "tsx",
            code: 'import React from "react";\nimport ReactDOM from "react-dom/client";\n\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);',
          },
          {
            label: "src/index.css",
            language: "css",
            code: ':root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Etape 7 Tester l integration web",
        description:
          "Regenerez les loaders, lancez Vite et validez micro, navigation, fonction locale et fallback backend.",
        bullets: [
          "Verifiez que `generated-module-loaders.ts` change quand vous ajoutez une nouvelle tool.",
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
    value: "react-js",
    label: "React.js",
    title: "React.js + Vite",
    description: "SPA React con integracion basada en hooks sobre Vite.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Paso 1 Crear el proyecto web",
        description:
          "Genere la app React con Vite y deje listas las carpetas donde NAVAI descubrira rutas, tools locales y el componente de voz.",
        bullets: [
          "Mantenga `BrowserRouter` montado antes de renderizar el control de voz.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vite@latest navai-web-demo -- --template react-ts\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Paso 2 Instalar dependencias",
        description:
          "Instale el runtime web de NAVAI, el SDK realtime y `react-router-dom` para que la navegacion por path viva en la misma capa de UI.",
        bullets: [
          "Si el proyecto ya existe, agregue solo los paquetes que realmente falten.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react-router-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Paso 3 Configurar variables y loaders",
        description:
          "Configure `.env` con `VITE_NAVAI_API_URL` y las rutas que el generador de loaders usara para indexar `routes` y `functions`.",
        bullets: [
          "Solo las variables con prefijo `VITE_` quedan disponibles en el navegador.",
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
          "Monte `useWebVoiceAgent` dentro de `VoiceNavigator`, conectelo con `useNavigate()` y pase loaders, rutas por defecto y el objeto `env`.",
        bullets: [
          "Renderice el boton dentro del arbol que ya esta cubierto por `BrowserRouter`.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport { useNavigate } from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <section className="voice-card">\n      <div className="voice-copy">\n        <span className="voice-eyebrow">NAVAI Voice</span>\n        <h1>Talk to your web app.</h1>\n        <p>\n          Use the Orb to open routes like Billing and to run local functions such\n          as <code>show_welcome_banner</code>.\n        </p>\n      </div>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="voice-status-banner" data-navai-status>\n        Voice demo ready for local actions.\n      </p>\n\n      <p className="voice-hint">Try: "Open billing" or "Run show welcome banner".</p>\n    </section>\n  );\n}',
          },
          {
            label: "src/App.tsx",
            language: "tsx",
            code: 'import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";\n\nimport { VoiceNavigator } from "./components/VoiceNavigator";\n\nfunction HomeScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Demo route</span>\n        <h2>Home dashboard</h2>\n        <p>\n          Start the Orb, then ask NAVAI to open Billing or navigate manually with the\n          links in the header.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Voice commands</span>\n        <ul className="command-list">\n          <li>Open billing</li>\n          <li>Go back home</li>\n          <li>Run show welcome banner</li>\n        </ul>\n      </article>\n    </section>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Billing route</span>\n        <h2>Billing</h2>\n        <p>\n          This route exposes a <code>data-navai-status</code> banner so NAVAI can\n          update the interface when a local function runs.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Local function result</span>\n        <p className="status-banner" data-navai-status>\n          Billing screen ready for NAVAI.\n        </p>\n      </article>\n    </section>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <div className="app-shell">\n      <div className="app-frame">\n        <aside className="voice-column">\n          <VoiceNavigator />\n        </aside>\n\n        <main className="demo-column">\n          <header className="demo-header">\n            <div>\n              <span className="panel-kicker">React.js + NAVAI</span>\n              <h2>Test navigation, voice status, and local functions in one screen.</h2>\n            </div>\n\n            <nav className="demo-nav" aria-label="Primary">\n              <Link to="/">Home</Link>\n              <Link to="/billing">Billing</Link>\n            </nav>\n          </header>\n\n          <Routes>\n            <Route path="/" element={<HomeScreen />} />\n            <Route path="/billing" element={<BillingScreen />} />\n            <Route path="*" element={<Navigate replace to="/" />} />\n          </Routes>\n        </main>\n      </div>\n    </div>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <AppContent />\n    </BrowserRouter>\n  );\n}',
          },
          {
            label: "src/main.tsx",
            language: "tsx",
            code: 'import React from "react";\nimport ReactDOM from "react-dom/client";\n\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);',
          },
          {
            label: "src/index.css",
            language: "css",
            code: ':root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Paso 7 Probar la integracion web",
        description:
          "Regenere loaders, levante Vite y valide microfono, navegacion por rutas, function local y fallback hacia backend.",
        bullets: [
          "Confirme que `generated-module-loaders.ts` se actualiza cuando agregue una tool nueva.",
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
    value: "react-js",
    label: "React.js",
    title: "React.js + Vite",
    description: "SPA React com integracao baseada em hooks sobre Vite.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Passo 1 Criar o projeto web",
        description:
          "Crie a app React com Vite e prepare as pastas onde o NAVAI vai descobrir rotas, tools locais e o componente de voz.",
        bullets: [
          "Mantenha `BrowserRouter` montado antes de renderizar o controle de voz.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vite@latest navai-web-demo -- --template react-ts\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Passo 2 Instalar dependencias",
        description:
          "Instale o runtime web do NAVAI, o SDK realtime e `react-router-dom` para que a navegacao por path fique na mesma camada de UI.",
        bullets: [
          "Se o projeto ja existir, adicione apenas os pacotes que ainda faltam.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react-router-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Passo 3 Configurar variaveis e loaders",
        description:
          "Configure `.env` com `VITE_NAVAI_API_URL` e os caminhos que o gerador de loaders usara para indexar `routes` e `functions`.",
        bullets: [
          "Apenas variaveis com prefixo `VITE_` ficam disponiveis no navegador.",
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
          "Monte `useWebVoiceAgent` dentro de `VoiceNavigator`, conecte com `useNavigate()` e passe loaders, rotas padrao e `env`.",
        bullets: [
          "Renderize o botao dentro da arvore que ja esta coberta por `BrowserRouter`.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport { useNavigate } from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <section className="voice-card">\n      <div className="voice-copy">\n        <span className="voice-eyebrow">NAVAI Voice</span>\n        <h1>Talk to your web app.</h1>\n        <p>\n          Use the Orb to open routes like Billing and to run local functions such\n          as <code>show_welcome_banner</code>.\n        </p>\n      </div>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="voice-status-banner" data-navai-status>\n        Voice demo ready for local actions.\n      </p>\n\n      <p className="voice-hint">Try: "Open billing" or "Run show welcome banner".</p>\n    </section>\n  );\n}',
          },
          {
            label: "src/App.tsx",
            language: "tsx",
            code: 'import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";\n\nimport { VoiceNavigator } from "./components/VoiceNavigator";\n\nfunction HomeScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Demo route</span>\n        <h2>Home dashboard</h2>\n        <p>\n          Start the Orb, then ask NAVAI to open Billing or navigate manually with the\n          links in the header.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Voice commands</span>\n        <ul className="command-list">\n          <li>Open billing</li>\n          <li>Go back home</li>\n          <li>Run show welcome banner</li>\n        </ul>\n      </article>\n    </section>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Billing route</span>\n        <h2>Billing</h2>\n        <p>\n          This route exposes a <code>data-navai-status</code> banner so NAVAI can\n          update the interface when a local function runs.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Local function result</span>\n        <p className="status-banner" data-navai-status>\n          Billing screen ready for NAVAI.\n        </p>\n      </article>\n    </section>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <div className="app-shell">\n      <div className="app-frame">\n        <aside className="voice-column">\n          <VoiceNavigator />\n        </aside>\n\n        <main className="demo-column">\n          <header className="demo-header">\n            <div>\n              <span className="panel-kicker">React.js + NAVAI</span>\n              <h2>Test navigation, voice status, and local functions in one screen.</h2>\n            </div>\n\n            <nav className="demo-nav" aria-label="Primary">\n              <Link to="/">Home</Link>\n              <Link to="/billing">Billing</Link>\n            </nav>\n          </header>\n\n          <Routes>\n            <Route path="/" element={<HomeScreen />} />\n            <Route path="/billing" element={<BillingScreen />} />\n            <Route path="*" element={<Navigate replace to="/" />} />\n          </Routes>\n        </main>\n      </div>\n    </div>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <AppContent />\n    </BrowserRouter>\n  );\n}',
          },
          {
            label: "src/main.tsx",
            language: "tsx",
            code: 'import React from "react";\nimport ReactDOM from "react-dom/client";\n\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);',
          },
          {
            label: "src/index.css",
            language: "css",
            code: ':root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Passo 7 Testar a integracao web",
        description:
          "Regenere loaders, suba o Vite e valide microfone, navegacao, funcao local e fallback para backend.",
        bullets: [
          "Confirme que `generated-module-loaders.ts` muda quando voce adiciona uma tool nova.",
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
    value: "react-js",
    label: "React.js",
    title: "React.js + Vite",
    description: "基于 Vite 的 hook-based React SPA integration。",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "步骤 1 创建 Web 项目",
        description:
          "使用 Vite 创建 React app，并准备好 NAVAI 发现 routes、local tools 和 voice component 所需的 folders。",
        bullets: [
          "在 render voice control 之前，确保 `BrowserRouter` 已经 mounted。",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vite@latest navai-web-demo -- --template react-ts\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "步骤 2 安装依赖",
        description:
          "安装 NAVAI web runtime、realtime SDK 和 `react-router-dom`，让 path navigation 保持在同一层 UI 中。",
        bullets: ["如果 project 已存在，只添加缺失的 packages。"],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react-router-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "步骤 3 配置 Env 与 loaders",
        description:
          "在 `.env` 中配置 `VITE_NAVAI_API_URL`，以及 loader generator 用来索引 `routes` 和 `functions` 的 paths。",
        bullets: ["只有带 `VITE_` 前缀的 variables 会暴露给 browser code。"],
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
          "在 `VoiceNavigator` 中挂载 `useWebVoiceAgent`，连接 `useNavigate()`，并传入 loaders、default routes 与 `env`。",
        bullets: ["按钮应当渲染在已经位于 `BrowserRouter` 下的 tree 内。"],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport { useNavigate } from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <section className="voice-card">\n      <div className="voice-copy">\n        <span className="voice-eyebrow">NAVAI Voice</span>\n        <h1>Talk to your web app.</h1>\n        <p>\n          Use the Orb to open routes like Billing and to run local functions such\n          as <code>show_welcome_banner</code>.\n        </p>\n      </div>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="voice-status-banner" data-navai-status>\n        Voice demo ready for local actions.\n      </p>\n\n      <p className="voice-hint">Try: "Open billing" or "Run show welcome banner".</p>\n    </section>\n  );\n}',
          },
          {
            label: "src/App.tsx",
            language: "tsx",
            code: 'import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";\n\nimport { VoiceNavigator } from "./components/VoiceNavigator";\n\nfunction HomeScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Demo route</span>\n        <h2>Home dashboard</h2>\n        <p>\n          Start the Orb, then ask NAVAI to open Billing or navigate manually with the\n          links in the header.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Voice commands</span>\n        <ul className="command-list">\n          <li>Open billing</li>\n          <li>Go back home</li>\n          <li>Run show welcome banner</li>\n        </ul>\n      </article>\n    </section>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Billing route</span>\n        <h2>Billing</h2>\n        <p>\n          This route exposes a <code>data-navai-status</code> banner so NAVAI can\n          update the interface when a local function runs.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Local function result</span>\n        <p className="status-banner" data-navai-status>\n          Billing screen ready for NAVAI.\n        </p>\n      </article>\n    </section>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <div className="app-shell">\n      <div className="app-frame">\n        <aside className="voice-column">\n          <VoiceNavigator />\n        </aside>\n\n        <main className="demo-column">\n          <header className="demo-header">\n            <div>\n              <span className="panel-kicker">React.js + NAVAI</span>\n              <h2>Test navigation, voice status, and local functions in one screen.</h2>\n            </div>\n\n            <nav className="demo-nav" aria-label="Primary">\n              <Link to="/">Home</Link>\n              <Link to="/billing">Billing</Link>\n            </nav>\n          </header>\n\n          <Routes>\n            <Route path="/" element={<HomeScreen />} />\n            <Route path="/billing" element={<BillingScreen />} />\n            <Route path="*" element={<Navigate replace to="/" />} />\n          </Routes>\n        </main>\n      </div>\n    </div>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <AppContent />\n    </BrowserRouter>\n  );\n}',
          },
          {
            label: "src/main.tsx",
            language: "tsx",
            code: 'import React from "react";\nimport ReactDOM from "react-dom/client";\n\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);',
          },
          {
            label: "src/index.css",
            language: "css",
            code: ':root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "步骤 7 测试 Web integration",
        description:
          "重新生成 loaders，启动 Vite，并验证 microphone、route navigation、local function 和 backend fallback。",
        bullets: [
          "新增 tool 时，也要确认 `generated-module-loaders.ts` 会同步更新。",
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
    value: "react-js",
    label: "React.js",
    title: "React.js + Vite",
    description: "Vite 上で動く hook-based React SPA integration です。",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "ステップ 1 Web プロジェクトを作成",
        description:
          "Vite で React app を scaffold し、NAVAI が routes、local tools、voice component を見つける folders を準備します。",
        bullets: [
          "Voice control を render する前に `BrowserRouter` を mounted にしておいてください。",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vite@latest navai-web-demo -- --template react-ts\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "ステップ 2 依存関係をインストール",
        description:
          "NAVAI web runtime、realtime SDK、`react-router-dom` を install し、path navigation を同じ UI layer に置きます。",
        bullets: [
          "既存 project の場合は不足している packages だけを追加してください。",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react-router-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "ステップ 3 Env と loaders を設定",
        description:
          "`.env` に `VITE_NAVAI_API_URL` と、loader generator が `routes` と `functions` を index する paths を設定します。",
        bullets: [
          "Browser code から参照できるのは `VITE_` prefix の variables だけです。",
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
          "`VoiceNavigator` の中に `useWebVoiceAgent` を mount し、`useNavigate()`、loaders、default routes、`env` を渡します。",
        bullets: [
          "Button は `BrowserRouter` 配下の tree に render してください。",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport { useNavigate } from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <section className="voice-card">\n      <div className="voice-copy">\n        <span className="voice-eyebrow">NAVAI Voice</span>\n        <h1>Talk to your web app.</h1>\n        <p>\n          Use the Orb to open routes like Billing and to run local functions such\n          as <code>show_welcome_banner</code>.\n        </p>\n      </div>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="voice-status-banner" data-navai-status>\n        Voice demo ready for local actions.\n      </p>\n\n      <p className="voice-hint">Try: "Open billing" or "Run show welcome banner".</p>\n    </section>\n  );\n}',
          },
          {
            label: "src/App.tsx",
            language: "tsx",
            code: 'import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";\n\nimport { VoiceNavigator } from "./components/VoiceNavigator";\n\nfunction HomeScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Demo route</span>\n        <h2>Home dashboard</h2>\n        <p>\n          Start the Orb, then ask NAVAI to open Billing or navigate manually with the\n          links in the header.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Voice commands</span>\n        <ul className="command-list">\n          <li>Open billing</li>\n          <li>Go back home</li>\n          <li>Run show welcome banner</li>\n        </ul>\n      </article>\n    </section>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Billing route</span>\n        <h2>Billing</h2>\n        <p>\n          This route exposes a <code>data-navai-status</code> banner so NAVAI can\n          update the interface when a local function runs.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Local function result</span>\n        <p className="status-banner" data-navai-status>\n          Billing screen ready for NAVAI.\n        </p>\n      </article>\n    </section>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <div className="app-shell">\n      <div className="app-frame">\n        <aside className="voice-column">\n          <VoiceNavigator />\n        </aside>\n\n        <main className="demo-column">\n          <header className="demo-header">\n            <div>\n              <span className="panel-kicker">React.js + NAVAI</span>\n              <h2>Test navigation, voice status, and local functions in one screen.</h2>\n            </div>\n\n            <nav className="demo-nav" aria-label="Primary">\n              <Link to="/">Home</Link>\n              <Link to="/billing">Billing</Link>\n            </nav>\n          </header>\n\n          <Routes>\n            <Route path="/" element={<HomeScreen />} />\n            <Route path="/billing" element={<BillingScreen />} />\n            <Route path="*" element={<Navigate replace to="/" />} />\n          </Routes>\n        </main>\n      </div>\n    </div>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <AppContent />\n    </BrowserRouter>\n  );\n}',
          },
          {
            label: "src/main.tsx",
            language: "tsx",
            code: 'import React from "react";\nimport ReactDOM from "react-dom/client";\n\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);',
          },
          {
            label: "src/index.css",
            language: "css",
            code: ':root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "ステップ 7 Web integration をテスト",
        description:
          "Loaders を再生成し、Vite を起動して、microphone、route navigation、local function、backend fallback を確認します。",
        bullets: [
          "新しい tool を追加したときに `generated-module-loaders.ts` が更新されるかも確認してください。",
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
    value: "react-js",
    label: "React.js",
    title: "React.js + Vite",
    description: "React SPA с hook-based integration поверх Vite.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Шаг 1 Создать web-проект",
        description:
          "Создайте React app на Vite и подготовьте folders, где NAVAI найдет routes, local tools и voice component.",
        bullets: ["Держите `BrowserRouter` mounted до рендера voice control."],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vite@latest navai-web-demo -- --template react-ts\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Шаг 2 Установить зависимости",
        description:
          "Установите NAVAI web runtime, realtime SDK и `react-router-dom`, чтобы path navigation жила в том же UI layer.",
        bullets: [
          "Если проект уже существует, добавьте только недостающие packages.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react-router-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Шаг 3 Настроить env и loaders",
        description:
          "Настройте `.env` с `VITE_NAVAI_API_URL` и paths, которые loader generator будет использовать для индексации `routes` и `functions`.",
        bullets: [
          "В browser code попадают только variables с префиксом `VITE_`.",
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
          "Смонтируйте `useWebVoiceAgent` внутри `VoiceNavigator`, свяжите его с `useNavigate()` и передайте loaders, default routes и `env`.",
        bullets: [
          "Рендерьте кнопку внутри tree, уже обернутого в `BrowserRouter`.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport { useNavigate } from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <section className="voice-card">\n      <div className="voice-copy">\n        <span className="voice-eyebrow">NAVAI Voice</span>\n        <h1>Talk to your web app.</h1>\n        <p>\n          Use the Orb to open routes like Billing and to run local functions such\n          as <code>show_welcome_banner</code>.\n        </p>\n      </div>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="voice-status-banner" data-navai-status>\n        Voice demo ready for local actions.\n      </p>\n\n      <p className="voice-hint">Try: "Open billing" or "Run show welcome banner".</p>\n    </section>\n  );\n}',
          },
          {
            label: "src/App.tsx",
            language: "tsx",
            code: 'import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";\n\nimport { VoiceNavigator } from "./components/VoiceNavigator";\n\nfunction HomeScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Demo route</span>\n        <h2>Home dashboard</h2>\n        <p>\n          Start the Orb, then ask NAVAI to open Billing or navigate manually with the\n          links in the header.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Voice commands</span>\n        <ul className="command-list">\n          <li>Open billing</li>\n          <li>Go back home</li>\n          <li>Run show welcome banner</li>\n        </ul>\n      </article>\n    </section>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Billing route</span>\n        <h2>Billing</h2>\n        <p>\n          This route exposes a <code>data-navai-status</code> banner so NAVAI can\n          update the interface when a local function runs.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Local function result</span>\n        <p className="status-banner" data-navai-status>\n          Billing screen ready for NAVAI.\n        </p>\n      </article>\n    </section>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <div className="app-shell">\n      <div className="app-frame">\n        <aside className="voice-column">\n          <VoiceNavigator />\n        </aside>\n\n        <main className="demo-column">\n          <header className="demo-header">\n            <div>\n              <span className="panel-kicker">React.js + NAVAI</span>\n              <h2>Test navigation, voice status, and local functions in one screen.</h2>\n            </div>\n\n            <nav className="demo-nav" aria-label="Primary">\n              <Link to="/">Home</Link>\n              <Link to="/billing">Billing</Link>\n            </nav>\n          </header>\n\n          <Routes>\n            <Route path="/" element={<HomeScreen />} />\n            <Route path="/billing" element={<BillingScreen />} />\n            <Route path="*" element={<Navigate replace to="/" />} />\n          </Routes>\n        </main>\n      </div>\n    </div>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <AppContent />\n    </BrowserRouter>\n  );\n}',
          },
          {
            label: "src/main.tsx",
            language: "tsx",
            code: 'import React from "react";\nimport ReactDOM from "react-dom/client";\n\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);',
          },
          {
            label: "src/index.css",
            language: "css",
            code: ':root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Шаг 7 Проверить web integration",
        description:
          "Перегенерируйте loaders, запустите Vite и проверьте microphone, route navigation, local function и backend fallback.",
        bullets: [
          "Убедитесь, что `generated-module-loaders.ts` меняется при добавлении новой tool.",
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
    value: "react-js",
    label: "React.js",
    title: "React.js + Vite",
    description:
      "Vite 위에서 동작하는 hook-based React SPA integration 입니다.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "1단계 Web 프로젝트 생성",
        description:
          "Vite 로 React app 을 생성하고, NAVAI 가 routes, local tools, voice component 를 찾을 folders 를 준비하세요.",
        bullets: [
          "Voice control 을 render 하기 전에 `BrowserRouter` 가 mounted 되어 있어야 합니다.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vite@latest navai-web-demo -- --template react-ts\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "2단계 Dependencies 설치",
        description:
          "NAVAI web runtime, realtime SDK, `react-router-dom` 을 설치해 path navigation 이 같은 UI layer 에 머물도록 하세요.",
        bullets: ["기존 project 라면 부족한 packages 만 추가하세요."],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react-router-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "3단계 Env 와 loaders 설정",
        description:
          "`.env` 에 `VITE_NAVAI_API_URL` 과 loader generator 가 `routes` 와 `functions` 를 index 할 paths 를 설정하세요.",
        bullets: [
          "Browser code 에 노출되는 것은 `VITE_` prefix 가 붙은 variables 뿐입니다.",
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
          "`VoiceNavigator` 안에 `useWebVoiceAgent` 를 mount 하고 `useNavigate()` 와 loaders, default routes, `env` 를 연결하세요.",
        bullets: ["Button 은 `BrowserRouter` 아래 tree 안에서 render 하세요."],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport { useNavigate } from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <section className="voice-card">\n      <div className="voice-copy">\n        <span className="voice-eyebrow">NAVAI Voice</span>\n        <h1>Talk to your web app.</h1>\n        <p>\n          Use the Orb to open routes like Billing and to run local functions such\n          as <code>show_welcome_banner</code>.\n        </p>\n      </div>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="voice-status-banner" data-navai-status>\n        Voice demo ready for local actions.\n      </p>\n\n      <p className="voice-hint">Try: "Open billing" or "Run show welcome banner".</p>\n    </section>\n  );\n}',
          },
          {
            label: "src/App.tsx",
            language: "tsx",
            code: 'import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";\n\nimport { VoiceNavigator } from "./components/VoiceNavigator";\n\nfunction HomeScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Demo route</span>\n        <h2>Home dashboard</h2>\n        <p>\n          Start the Orb, then ask NAVAI to open Billing or navigate manually with the\n          links in the header.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Voice commands</span>\n        <ul className="command-list">\n          <li>Open billing</li>\n          <li>Go back home</li>\n          <li>Run show welcome banner</li>\n        </ul>\n      </article>\n    </section>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Billing route</span>\n        <h2>Billing</h2>\n        <p>\n          This route exposes a <code>data-navai-status</code> banner so NAVAI can\n          update the interface when a local function runs.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Local function result</span>\n        <p className="status-banner" data-navai-status>\n          Billing screen ready for NAVAI.\n        </p>\n      </article>\n    </section>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <div className="app-shell">\n      <div className="app-frame">\n        <aside className="voice-column">\n          <VoiceNavigator />\n        </aside>\n\n        <main className="demo-column">\n          <header className="demo-header">\n            <div>\n              <span className="panel-kicker">React.js + NAVAI</span>\n              <h2>Test navigation, voice status, and local functions in one screen.</h2>\n            </div>\n\n            <nav className="demo-nav" aria-label="Primary">\n              <Link to="/">Home</Link>\n              <Link to="/billing">Billing</Link>\n            </nav>\n          </header>\n\n          <Routes>\n            <Route path="/" element={<HomeScreen />} />\n            <Route path="/billing" element={<BillingScreen />} />\n            <Route path="*" element={<Navigate replace to="/" />} />\n          </Routes>\n        </main>\n      </div>\n    </div>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <AppContent />\n    </BrowserRouter>\n  );\n}',
          },
          {
            label: "src/main.tsx",
            language: "tsx",
            code: 'import React from "react";\nimport ReactDOM from "react-dom/client";\n\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);',
          },
          {
            label: "src/index.css",
            language: "css",
            code: ':root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "7단계 Web integration 테스트",
        description:
          "Loaders 를 다시 생성하고 Vite 를 시작한 다음 microphone, route navigation, local function, backend fallback 을 검증하세요.",
        bullets: [
          "새 tool 을 추가할 때 `generated-module-loaders.ts` 가 갱신되는지도 확인하세요.",
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
    value: "react-js",
    label: "React.js",
    title: "React.js + Vite",
    description: "Vite पर बनी hook-based React SPA integration.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "चरण 1 Web project बनाएं",
        description:
          "Vite के साथ React app scaffold करें और वे folders तैयार करें जहां NAVAI routes, local tools और voice component पाएगा।",
        bullets: [
          "Voice control render करने से पहले `BrowserRouter` mounted रखें।",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npm create vite@latest navai-web-demo -- --template react-ts\ncd navai-web-demo\nnpm install\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "चरण 2 Dependencies install करें",
        description:
          "NAVAI web runtime, realtime SDK और `react-router-dom` install करें ताकि path navigation उसी UI layer में रहे।",
        bullets: [
          "अगर project पहले से मौजूद है तो केवल missing packages ही add करें।",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react-router-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "चरण 3 Env और loaders configure करें",
        description:
          "`.env` में `VITE_NAVAI_API_URL` और वे paths configure करें जिनसे loader generator `routes` और `functions` index करेगा।",
        bullets: [
          "Browser code में केवल `VITE_` prefixed variables ही पहुंचती हैं।",
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
          "`VoiceNavigator` के अंदर `useWebVoiceAgent` mount करें, इसे `useNavigate()` से wire करें और loaders, default routes तथा `env` pass करें।",
        bullets: [
          "Button उसी tree के अंदर render करें जो पहले से `BrowserRouter` के नीचे है।",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { NavaiVoiceOrbDock, useWebVoiceAgent } from "@navai/voice-frontend";\nimport { useNavigate } from "react-router-dom";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const navigate = useNavigate();\n  const voice = useWebVoiceAgent({\n    navigate: (path) => navigate(path),\n    moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n    defaultRoutes: NAVAI_ROUTE_ITEMS,\n    env: NAVAI_ENV,\n  });\n\n  return (\n    <section className="voice-card">\n      <div className="voice-copy">\n        <span className="voice-eyebrow">NAVAI Voice</span>\n        <h1>Talk to your web app.</h1>\n        <p>\n          Use the Orb to open routes like Billing and to run local functions such\n          as <code>show_welcome_banner</code>.\n        </p>\n      </div>\n\n      <NavaiVoiceOrbDock\n        agent={voice}\n        placement="inline"\n        themeMode="dark"\n        showStatus\n        backgroundColorLight="#f8fafc"\n        backgroundColorDark="#050816"\n        messages={{\n          ariaStart: "Start NAVAI voice session",\n          ariaStop: "Stop NAVAI voice session",\n          idle: "NAVAI is ready",\n          connecting: "Connecting NAVAI...",\n          listening: "NAVAI is listening",\n          speaking: "NAVAI is speaking",\n          errorPrefix: "NAVAI error",\n        }}\n      />\n\n      <p className="voice-status-banner" data-navai-status>\n        Voice demo ready for local actions.\n      </p>\n\n      <p className="voice-hint">Try: "Open billing" or "Run show welcome banner".</p>\n    </section>\n  );\n}',
          },
          {
            label: "src/App.tsx",
            language: "tsx",
            code: 'import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";\n\nimport { VoiceNavigator } from "./components/VoiceNavigator";\n\nfunction HomeScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Demo route</span>\n        <h2>Home dashboard</h2>\n        <p>\n          Start the Orb, then ask NAVAI to open Billing or navigate manually with the\n          links in the header.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Voice commands</span>\n        <ul className="command-list">\n          <li>Open billing</li>\n          <li>Go back home</li>\n          <li>Run show welcome banner</li>\n        </ul>\n      </article>\n    </section>\n  );\n}\n\nfunction BillingScreen() {\n  return (\n    <section className="screen-grid">\n      <article className="demo-panel demo-panel--hero">\n        <span className="panel-kicker">Billing route</span>\n        <h2>Billing</h2>\n        <p>\n          This route exposes a <code>data-navai-status</code> banner so NAVAI can\n          update the interface when a local function runs.\n        </p>\n      </article>\n\n      <article className="demo-panel">\n        <span className="panel-kicker">Local function result</span>\n        <p className="status-banner" data-navai-status>\n          Billing screen ready for NAVAI.\n        </p>\n      </article>\n    </section>\n  );\n}\n\nfunction AppContent() {\n  return (\n    <div className="app-shell">\n      <div className="app-frame">\n        <aside className="voice-column">\n          <VoiceNavigator />\n        </aside>\n\n        <main className="demo-column">\n          <header className="demo-header">\n            <div>\n              <span className="panel-kicker">React.js + NAVAI</span>\n              <h2>Test navigation, voice status, and local functions in one screen.</h2>\n            </div>\n\n            <nav className="demo-nav" aria-label="Primary">\n              <Link to="/">Home</Link>\n              <Link to="/billing">Billing</Link>\n            </nav>\n          </header>\n\n          <Routes>\n            <Route path="/" element={<HomeScreen />} />\n            <Route path="/billing" element={<BillingScreen />} />\n            <Route path="*" element={<Navigate replace to="/" />} />\n          </Routes>\n        </main>\n      </div>\n    </div>\n  );\n}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <AppContent />\n    </BrowserRouter>\n  );\n}',
          },
          {
            label: "src/main.tsx",
            language: "tsx",
            code: 'import React from "react";\nimport ReactDOM from "react-dom/client";\n\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);',
          },
          {
            label: "src/index.css",
            language: "css",
            code: ':root {\n  font-family: Inter, "Segoe UI", sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n  color: #e2e8f0;\n  background:\n    radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 30%),\n    linear-gradient(180deg, #081120 0%, #030712 100%);\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nbutton,\na {\n  font: inherit;\n}\n\na {\n  color: inherit;\n  text-decoration: none;\n}\n\ncode {\n  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\n}\n\n#root {\n  min-height: 100vh;\n}\n\n.app-shell {\n  min-height: 100vh;\n  padding: 32px;\n}\n\n.app-frame {\n  display: grid;\n  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);\n  gap: 24px;\n  width: min(1180px, 100%);\n  margin: 0 auto;\n}\n\n.voice-column,\n.demo-column {\n  border: 1px solid rgba(148, 163, 184, 0.16);\n  background: rgba(5, 10, 24, 0.74);\n  backdrop-filter: blur(24px);\n  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);\n}\n\n.voice-column {\n  border-radius: 28px;\n  padding: 28px;\n}\n\n.demo-column {\n  border-radius: 32px;\n  padding: 28px;\n}\n\n.voice-card,\n.screen-grid {\n  display: grid;\n  gap: 20px;\n}\n\n.voice-copy h1,\n.demo-header h2,\n.demo-panel h2 {\n  margin: 0;\n  line-height: 1.1;\n}\n\n.voice-copy p,\n.demo-panel p,\n.command-list {\n  margin: 0;\n  color: #cbd5e1;\n}\n\n.voice-eyebrow,\n.panel-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 0.78rem;\n  font-weight: 700;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: #7dd3fc;\n}\n\n.voice-hint {\n  margin: 0;\n  color: #94a3b8;\n  font-size: 0.92rem;\n}\n\n.voice-status-banner {\n  margin: 0;\n  border-radius: 18px;\n  border: 1px solid rgba(148, 163, 184, 0.18);\n  padding: 14px 16px;\n  background: rgba(15, 23, 42, 0.9);\n  color: #e2e8f0;\n}\n\n.demo-header {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 20px;\n  margin-bottom: 24px;\n}\n\n.demo-nav {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n\n.demo-nav a {\n  border-radius: 999px;\n  border: 1px solid rgba(125, 211, 252, 0.2);\n  padding: 10px 16px;\n  color: #e0f2fe;\n  background: rgba(14, 165, 233, 0.08);\n}\n\n.demo-panel {\n  border-radius: 24px;\n  border: 1px solid rgba(148, 163, 184, 0.14);\n  padding: 24px;\n  background: rgba(15, 23, 42, 0.76);\n}\n\n.demo-panel--hero {\n  background:\n    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),\n    rgba(15, 23, 42, 0.84);\n}\n\n.command-list {\n  padding-left: 18px;\n}\n\n.status-banner {\n  border-radius: 18px;\n  border: 1px solid rgba(125, 211, 252, 0.24);\n  padding: 16px 18px;\n  background: rgba(8, 47, 73, 0.42);\n  color: #f8fafc;\n}\n\n@media (max-width: 960px) {\n  .app-shell {\n    padding: 20px;\n  }\n\n  .app-frame {\n    grid-template-columns: 1fr;\n  }\n\n  .demo-header {\n    flex-direction: column;\n  }\n}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "चरण 7 Web integration test करें",
        description:
          "Loaders regenerate करें, Vite start करें और microphone, route navigation, local function execution तथा backend fallback validate करें।",
        bullets: [
          "जब आप नई tool जोड़ें तब `generated-module-loaders.ts` update हो रहा है या नहीं, यह भी जांचें।",
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

export function getWebReactjsGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return getLocalizedInstallationGuideTab(WEB_REACTJS_GUIDE_TABS, language);
}
