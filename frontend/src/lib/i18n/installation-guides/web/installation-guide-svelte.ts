import type {
  InstallationGuideSection,
  InstallationGuideTab,
  LanguageCode,
} from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";

type LocalizedSectionCopy = {
  title: string;
  description: string;
  bullets: string[];
};

type LocalizedGuideCopy = {
  description: string;
  setup: LocalizedSectionCopy;
  install: LocalizedSectionCopy;
  env: LocalizedSectionCopy;
  routes: LocalizedSectionCopy;
  functions: LocalizedSectionCopy;
  runtime: LocalizedSectionCopy;
  test: LocalizedSectionCopy;
};

const LANGUAGES: LanguageCode[] = [
  "en",
  "fr",
  "es",
  "pt",
  "zh",
  "ja",
  "ru",
  "ko",
  "hi",
];

const SETUP_CODE = `npm create vite@latest navai-web-demo -- --template svelte-ts
cd navai-web-demo
npm install
mkdir -p src/ai/functions-modules src/components`;

const INSTALL_CODE = `npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0`;

const ENV_CODE = `VITE_NAVAI_API_URL=http://localhost:3000
NAVAI_API_URL=http://localhost:3000
NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules
NAVAI_ROUTES_FILE=src/ai/routes.ts`;

const ROUTES_CODE = `import type { NavaiRoute } from "@navai/voice-frontend";

export const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [
  {
    name: "home",
    path: "/",
    description: "Home dashboard",
    synonyms: ["home", "dashboard", "start"],
  },
  {
    name: "billing",
    path: "/billing",
    description: "Billing and subscription screen",
    synonyms: ["billing", "payments", "subscription"],
  },
];`;

const LOCAL_FUNCTION_CODE = `const STATUS_SELECTOR = "[data-navai-status]";

export async function show_welcome_banner() {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(STATUS_SELECTOR),
  );

  if (elements.length === 0) {
    return {
      ok: false,
      action: "show_welcome_banner",
      message: "No status banner was found in the current screen.",
    };
  }

  const nextMessage = "NAVAI ran show_welcome_banner locally.";

  for (const element of elements) {
    element.textContent = nextMessage;
    element.dataset.navaiState = "success";
    element.style.borderColor = "rgba(56, 189, 248, 0.45)";
    element.style.background = "rgba(8, 47, 73, 0.72)";
    element.style.color = "#f8fafc";
  }

  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });

  return {
    ok: true,
    action: "show_welcome_banner",
    updated_elements: elements.length,
    message: nextMessage,
  };
}`;
const VOICE_NAVIGATOR_CODE = `<!-- src/components/VoiceNavigator.svelte -->
<script lang="ts">
  import { RealtimeSession } from "@openai/agents/realtime";
  import {
    NavaiVoiceOrbDock,
    buildNavaiAgent,
    createNavaiBackendClient,
    resolveNavaiFrontendRuntimeConfig,
  } from "@navai/voice-frontend";
  import { createElement } from "react";
  import { createRoot, type Root } from "react-dom/client";
  import { onMount } from "svelte";

  import { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";
  import { NAVAI_ROUTE_ITEMS } from "../ai/routes";

  const NAVAI_ENV = {
    NAVAI_API_URL: import.meta.env.VITE_NAVAI_API_URL ?? "http://localhost:3000",
    NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",
    NAVAI_ROUTES_FILE: "src/ai/routes.ts",
  };

  export let navigate: (path: string) => void;
  export let statusMessage = "Voice demo ready for local actions.";

  let isConnected = false;
  let isConnecting = false;
  let error: string | null = null;
  let orbHost: HTMLDivElement | null = null;
  let reactRoot: Root | null = null;
  let session: RealtimeSession | null = null;

  const backendClient = createNavaiBackendClient({
    apiBaseUrl: NAVAI_ENV.NAVAI_API_URL,
  });

  function renderOrb() {
    if (!reactRoot) {
      return;
    }

    reactRoot.render(
      createElement(NavaiVoiceOrbDock, {
        agent: {
          status: error
            ? "error"
            : isConnecting
              ? "connecting"
              : isConnected
                ? "connected"
                : "idle",
          agentVoiceState: "idle",
          error,
          isConnecting,
          isConnected,
          isAgentSpeaking: false,
          start,
          stop,
        },
        placement: "bottom-right",
        themeMode: "dark",
        showStatus: false,
        backgroundColorLight: "#f8fafc",
        backgroundColorDark: "#050816",
      }),
    );
  }

  async function start() {
    if (session || isConnecting) {
      return;
    }

    isConnecting = true;
    error = null;
    renderOrb();

    try {
      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({
        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,
        defaultRoutes: NAVAI_ROUTE_ITEMS,
        env: NAVAI_ENV,
      });
      const requestPayload = runtimeConfig.modelOverride
        ? { model: runtimeConfig.modelOverride }
        : undefined;
      const secret = await backendClient.createClientSecret(requestPayload);
      const backendFunctions = await backendClient.listFunctions();
      const { agent } = await buildNavaiAgent({
        navigate,
        routes: runtimeConfig.routes,
        functionModuleLoaders: runtimeConfig.functionModuleLoaders,
        backendFunctions: backendFunctions.functions,
        executeBackendFunction: backendClient.executeFunction,
      });

      session = new RealtimeSession(agent);
      if (runtimeConfig.modelOverride) {
        await session.connect({
          apiKey: secret.value,
          model: runtimeConfig.modelOverride,
        });
      } else {
        await session.connect({ apiKey: secret.value });
      }

      isConnected = true;
    } catch (startError) {
      console.error(startError);
      error = "NAVAI could not start.";
      session?.close();
      session = null;
      isConnected = false;
    } finally {
      isConnecting = false;
      renderOrb();
    }
  }

  function stop() {
    session?.close();
    session = null;
    isConnected = false;
    isConnecting = false;
    renderOrb();
  }

  $: {
    isConnected;
    isConnecting;
    error;
    renderOrb();
  }

  onMount(() => {
    if (!orbHost) {
      return;
    }

    reactRoot = createRoot(orbHost);
    renderOrb();

    return () => {
      session?.close();
      session = null;
      reactRoot?.unmount();
      reactRoot = null;
    };
  });
</script>

<section class="voice-card">
  <div class="voice-copy">
    <span class="voice-eyebrow">Svelte + NAVAI</span>
    <h2>Keep the Orb mounted while views change.</h2>
    <p>Start NAVAI once and keep the same session alive across Home and Billing.</p>
  </div>

  <div bind:this={orbHost}></div>

  <p class="status-banner" data-navai-status>{statusMessage}</p>
</section>`;

const APP_CODE = `<!-- src/App.svelte -->
<script lang="ts">
  import { onMount } from "svelte";

  import VoiceNavigator from "./components/VoiceNavigator.svelte";

  const HOME_PATH = "/";
  const BILLING_PATH = "/billing";

  function normalizePath(path: string) {
    if (path === BILLING_PATH) {
      return BILLING_PATH;
    }

    return HOME_PATH;
  }

  function readCurrentPath() {
    if (typeof window === "undefined") {
      return HOME_PATH;
    }

    const nextPath = window.location.hash.replace(/^#/, "") || HOME_PATH;
    return normalizePath(nextPath);
  }

  let currentPath = HOME_PATH;

  function navigate(path: string) {
    if (typeof window === "undefined") {
      return;
    }

    const normalizedPath = normalizePath(
      path.startsWith("/") ? path : "/" + path,
    );

    window.location.hash = normalizedPath;
  }

  onMount(() => {
    const sync = () => {
      currentPath = readCurrentPath();
    };

    sync();
    window.addEventListener("hashchange", sync);

    return () => {
      window.removeEventListener("hashchange", sync);
    };
  });
</script>

<svelte:head>
  <title>NAVAI Voice Demo</title>
</svelte:head>

<main class="app-shell">
  <section class="app-frame">
    <aside class="voice-column">
      <VoiceNavigator {navigate} />
    </aside>

    <section class="demo-column">
      <header class="demo-header">
        <div>
          <span class="panel-kicker">Demo routes</span>
          <h1>Keep one NAVAI session across pages.</h1>
          <p>Use the buttons below or ask NAVAI to navigate for you.</p>
        </div>

        <nav class="demo-nav" aria-label="Demo navigation">
          <button
            type="button"
            class={"nav-pill " + (currentPath === HOME_PATH ? "nav-pill--active" : "")}
            onclick={() => navigate(HOME_PATH)}
          >
            Home
          </button>
          <button
            type="button"
            class={"nav-pill " + (currentPath === BILLING_PATH ? "nav-pill--active" : "")}
            onclick={() => navigate(BILLING_PATH)}
          >
            Billing
          </button>
        </nav>
      </header>

      {#if currentPath === BILLING_PATH}
        <article class="panel">
          <span class="panel-kicker">Billing route</span>
          <h2>Billing</h2>
          <p>Ask NAVAI to run show welcome banner or trigger one backend tool.</p>
          <p class="status-banner" data-navai-status>
            Billing page ready for NAVAI.
          </p>
        </article>
      {:else}
        <article class="panel panel--hero">
          <span class="panel-kicker">Home route</span>
          <h2>Home</h2>
          <p>Start the session here, then ask NAVAI to open Billing.</p>
          <ul class="command-list">
            <li>Open Billing.</li>
            <li>Run show welcome banner.</li>
            <li>Call one backend function.</li>
          </ul>
        </article>
      {/if}
    </section>
  </section>
</main>`;
const APP_CSS_CODE = `:root {
  font-family: "Space Grotesk", "Segoe UI", sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #e2e8f0;
  background:
    radial-gradient(circle at top, rgba(56, 189, 248, 0.22), transparent 28%),
    linear-gradient(180deg, #081120 0%, #030712 100%);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  min-width: 320px;
}

button {
  font: inherit;
}

#app {
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  padding: 32px;
}

.app-frame {
  display: grid;
  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
  gap: 24px;
  width: min(1180px, 100%);
  margin: 0 auto;
}

.voice-column,
.demo-column {
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(5, 10, 24, 0.78);
  backdrop-filter: blur(24px);
  box-shadow: 0 24px 80px rgba(2, 6, 23, 0.4);
}

.voice-column {
  border-radius: 28px;
  padding: 28px;
}

.demo-column {
  border-radius: 32px;
  padding: 28px;
}

.voice-card,
.voice-copy,
.panel {
  display: grid;
  gap: 18px;
}

.voice-eyebrow,
.panel-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.voice-copy h2,
.voice-copy p,
.demo-header h1,
.panel h2,
.panel p,
.status-banner,
.command-list {
  margin: 0;
}

.demo-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.demo-nav {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 12px;
}

.nav-pill {
  border-radius: 999px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  padding: 10px 16px;
  background: rgba(14, 165, 233, 0.08);
  color: #e0f2fe;
  cursor: pointer;
}

.nav-pill--active {
  background: rgba(14, 165, 233, 0.18);
  border-color: rgba(125, 211, 252, 0.42);
}

.panel {
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  padding: 24px;
  background: rgba(15, 23, 42, 0.78);
}

.panel--hero {
  background:
    linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(37, 99, 235, 0.08)),
    rgba(15, 23, 42, 0.84);
}

.command-list {
  padding-left: 18px;
  color: #cbd5e1;
}

.status-banner {
  border-radius: 18px;
  border: 1px solid rgba(125, 211, 252, 0.24);
  padding: 16px 18px;
  background: rgba(8, 47, 73, 0.42);
  color: #f8fafc;
}

@media (max-width: 960px) {
  .app-shell {
    padding: 20px;
  }

  .app-frame {
    grid-template-columns: 1fr;
  }

  .demo-header {
    flex-direction: column;
  }
}`;

const LOCALIZED_CHECKLIST: Record<LanguageCode, string> = {
  en: "1. Start the backend from /documentation/installation-api if it is not running.\n2. Generate loaders and start the selected web stack.\n3. Start NAVAI and allow microphone access.\n4. Ask NAVAI to open Billing and run show welcome banner. Confirm the highlighted status banner changes.\n5. Call one backend function to confirm the HTTP bridge responds.",
  fr: "1. Demarrez le backend depuis /documentation/installation-api s il n est pas deja lance.\n2. Generez les loaders et lancez la stack web choisie.\n3. Demarrez NAVAI et autorisez l acces au microphone.\n4. Demandez a NAVAI d ouvrir Billing puis d executer show welcome banner. Verifiez que la bannere de statut mise en avant change.\n5. Appelez une fonction backend pour confirmer que le pont HTTP repond.",
  es: "1. Inicia el backend desde /documentation/installation-api si todavia no esta corriendo.\n2. Genera los loaders e inicia el stack web seleccionado.\n3. Inicia NAVAI y permite el acceso al microfono.\n4. Pidele a NAVAI que abra Billing y ejecute show welcome banner. Confirma que cambia el banner de estado resaltado.\n5. Llama una funcion del backend para confirmar que el puente HTTP responde.",
  pt: "1. Inicie o backend em /documentation/installation-api se ele ainda nao estiver em execucao.\n2. Gere os loaders e inicie a stack web selecionada.\n3. Inicie o NAVAI e permita o acesso ao microfone.\n4. Peca ao NAVAI para abrir Billing e executar show welcome banner. Confirme que o banner de status destacado muda.\n5. Chame uma funcao de backend para confirmar que a ponte HTTP responde.",
  zh: "1. 如果后端还没启动，请先在 /documentation/installation-api 中启动它。\n2. 生成 loaders 并启动所选的 Web stack。\n3. 启动 NAVAI 并允许麦克风访问。\n4. 让 NAVAI 打开 Billing 并执行 show welcome banner，确认高亮状态横幅发生变化。\n5. 调用一个后端函数，确认 HTTP bridge 可以响应。",
  ja: "1. バックエンドがまだ起動していない場合は /documentation/installation-api から先に起動します。\n2. loaders を生成して選択した Web stack を起動します。\n3. NAVAI を開始し、マイク権限を許可します。\n4. NAVAI に Billing を開いて show welcome banner を実行するよう依頼し、強調表示されたステータスバナーが変わることを確認します。\n5. バックエンド関数も 1 つ呼び出して HTTP bridge の応答を確認します。",
  ru: "1. Если backend еще не запущен, сначала поднимите его из /documentation/installation-api.\n2. Сгенерируйте loaders и запустите выбранный web stack.\n3. Запустите NAVAI и дайте доступ к микрофону.\n4. Попросите NAVAI открыть Billing и выполнить show welcome banner. Подтвердите, что выделенный статусный баннер меняется.\n5. Вызовите одну backend-функцию, чтобы подтвердить ответ HTTP bridge.",
  ko: "1. Backend가 아직 실행 중이 아니면 /documentation/installation-api 에서 먼저 시작하세요.\n2. Loaders를 생성하고 선택한 Web stack 을 시작하세요.\n3. NAVAI를 시작하고 마이크 권한을 허용하세요.\n4. NAVAI에게 Billing 을 열고 show welcome banner 를 실행하라고 요청한 뒤 강조된 상태 배너가 바뀌는지 확인하세요.\n5. Backend 함수도 하나 호출해서 HTTP bridge 응답을 확인하세요.",
  hi: "1. यदि backend अभी नहीं चल रहा है तो पहले उसे /documentation/installation-api से शुरू करें।\n2. Loaders generate करें और चुना गया web stack शुरू करें।\n3. NAVAI शुरू करें और microphone access की अनुमति दें।\n4. NAVAI से Billing खोलने और show welcome banner चलाने को कहें। पुष्टि करें कि highlighted status banner बदलता है।\n5. एक backend function भी चलाकर HTTP bridge response की पुष्टि करें।",
};

const WEB_SVELTE_GUIDE_COPY: Record<LanguageCode, LocalizedGuideCopy> = {
  en: {
    description:
      "Svelte app on Vite that keeps NAVAI inside one persistent shell while the Orb runs through a small React host.",
    setup: {
      title: "Step 1 Create the web project",
      description:
        "Scaffold the app with Vite and the Svelte TypeScript template, then prepare `src/ai` and `src/components` for NAVAI.",
      bullets: [
        "This guide uses plain Svelte on Vite, not SvelteKit, so the voice session stays in one client runtime.",
      ],
    },
    install: {
      title: "Step 2 Install dependencies",
      description:
        "Install NAVAI packages plus `react` and `react-dom`; the Orb itself is a React component mounted inside Svelte.",
      bullets: [
        "No extra router dependency is required for this demo because navigation stays in the hash.",
      ],
    },
    env: {
      title: "Step 3 Configure env and loaders",
      description:
        "Keep Vite browser variables and CLI `NAVAI_*` paths aligned so loader generation and runtime read the same tree.",
      bullets: [
        "Use the same backend URL in `.env` and in the running API service.",
      ],
    },
    routes: {
      title: "Step 4 Define navigation routes",
      description:
        "Declare the routes that NAVAI may open by voice, including clear names, paths, and business synonyms.",
      bullets: [
        "Publish only stable pages that should really be reachable by voice.",
      ],
    },
    functions: {
      title: "Step 5 Define functions",
      description:
        "Start with one small frontend function so you can verify local execution before backend fallback.",
      bullets: [
        "The sample updates every `[data-navai-status]` element on screen.",
      ],
    },
    runtime: {
      title: "Step 6 Integrate the web runtime",
      description:
        "Mount one `VoiceNavigator.svelte`, create the session imperatively, and switch between Home and Billing with hash navigation so the Orb never unmounts.",
      bullets: [
        "The guide uses `window.location.hash` instead of another router dependency to keep the demo reproducible.",
        "React and ReactDOM are used only to host `NavaiVoiceOrbDock` inside `VoiceNavigator.svelte`.",
      ],
    },
    test: {
      title: "Step 7 Test the web integration",
      description:
        "Regenerate loaders, start Vite, and verify that the same voice session survives while you move between `#/` and `#/billing`.",
      bullets: [
        "Test one local function and one backend call before adapting the shell to your real routes.",
      ],
    },
  },
  fr: {
    description:
      "Application Svelte sur Vite qui garde NAVAI dans un shell persistant pendant que l Orb tourne dans un petit host React.",
    setup: {
      title: "Etape 1 Creer le projet web",
      description:
        "Generez l application avec Vite et le template TypeScript de Svelte, puis preparez `src/ai` et `src/components` pour NAVAI.",
      bullets: [
        "Ce guide utilise Svelte simple sur Vite, pas SvelteKit, afin que la session vocale reste dans un seul runtime client.",
      ],
    },
    install: {
      title: "Etape 2 Installer les dependances",
      description:
        "Installez les paquets NAVAI ainsi que `react` et `react-dom` ; l Orb lui-meme est un composant React monte dans Svelte.",
      bullets: [
        "Aucune dependance de routeur supplementaire n est necessaire ici car la navigation reste dans le hash.",
      ],
    },
    env: {
      title: "Etape 3 Configurer les variables et loaders",
      description:
        "Gardez les variables navigateur de Vite et les chemins CLI `NAVAI_*` alignes afin que la generation des loaders et le runtime lisent le meme arbre.",
      bullets: [
        "Utilisez la meme URL backend dans `.env` et dans le service API en execution.",
      ],
    },
    routes: {
      title: "Etape 4 Definir les routes de navigation",
      description:
        "Declarez les routes que NAVAI peut ouvrir par la voix avec des noms, chemins et synonymes metier clairs.",
      bullets: [
        "Publiez seulement des pages stables qui doivent vraiment etre accessibles par la voix.",
      ],
    },
    functions: {
      title: "Etape 5 Definir les fonctions",
      description:
        "Commencez par une petite fonction frontend afin de verifier l execution locale avant le fallback backend.",
      bullets: [
        "L exemple met a jour chaque element `[data-navai-status]` present a l ecran.",
      ],
    },
    runtime: {
      title: "Etape 6 Integrer le runtime web",
      description:
        "Montez un seul `VoiceNavigator.svelte`, creez la session de facon imperative et passez entre Home et Billing avec une navigation hash afin que l Orb ne soit jamais detruit.",
      bullets: [
        "Le guide utilise `window.location.hash` au lieu d une autre dependance de routeur pour garder une demo reproductible.",
        "React et ReactDOM servent uniquement a heberger `NavaiVoiceOrbDock` dans `VoiceNavigator.svelte`.",
      ],
    },
    test: {
      title: "Etape 7 Tester l integration web",
      description:
        "Regenerez les loaders, lancez Vite et verifiez que la meme session vocale survit pendant les passages entre `#/` et `#/billing`.",
      bullets: [
        "Testez une fonction locale et un appel backend avant d adapter le shell a vos vraies routes.",
      ],
    },
  },
  es: {
    description:
      "Aplicacion Svelte sobre Vite que mantiene NAVAI dentro de un shell persistente mientras el Orb corre en un pequeno host de React.",
    setup: {
      title: "Paso 1 Crear el proyecto web",
      description:
        "Crea la app con Vite y el template TypeScript de Svelte, luego prepara `src/ai` y `src/components` para NAVAI.",
      bullets: [
        "Esta guia usa Svelte puro sobre Vite, no SvelteKit, para que la sesion de voz viva en un solo runtime cliente.",
      ],
    },
    install: {
      title: "Paso 2 Instalar dependencias",
      description:
        "Instala los paquetes de NAVAI junto con `react` y `react-dom`; el Orb es un componente React montado dentro de Svelte.",
      bullets: [
        "No necesitas otra dependencia de router para esta demo porque la navegacion queda en el hash.",
      ],
    },
    env: {
      title: "Paso 3 Configurar variables y loaders",
      description:
        "Mantiene alineadas las variables del navegador de Vite y las rutas CLI `NAVAI_*` para que la generacion de loaders y el runtime lean el mismo arbol.",
      bullets: [
        "Usa la misma URL del backend en `.env` y en el servicio API que este corriendo.",
      ],
    },
    routes: {
      title: "Paso 4 Definir rutas de navegacion",
      description:
        "Declara las rutas que NAVAI puede abrir por voz con nombres, paths y sinonimos de negocio claros.",
      bullets: [
        "Publica solo pantallas estables que realmente deban abrirse por voz.",
      ],
    },
    functions: {
      title: "Paso 5 Definir funciones",
      description:
        "Empieza con una pequena funcion frontend para verificar la ejecucion local antes del fallback al backend.",
      bullets: [
        "El ejemplo actualiza cada elemento `[data-navai-status]` que este en pantalla.",
      ],
    },
    runtime: {
      title: "Paso 6 Integrar el runtime web",
      description:
        "Monta un solo `VoiceNavigator.svelte`, crea la sesion de forma imperativa y cambia entre Home y Billing con navegacion hash para que el Orb nunca se desmonte.",
      bullets: [
        "La guia usa `window.location.hash` en lugar de otra dependencia de router para mantener la demo reproducible.",
        "React y ReactDOM se usan solo para hospedar `NavaiVoiceOrbDock` dentro de `VoiceNavigator.svelte`.",
      ],
    },
    test: {
      title: "Paso 7 Probar la integracion web",
      description:
        "Regenera los loaders, inicia Vite y verifica que la misma sesion de voz siga viva mientras te mueves entre `#/` y `#/billing`.",
      bullets: [
        "Prueba una funcion local y una llamada al backend antes de adaptar el shell a tus rutas reales.",
      ],
    },
  },
  pt: {
    description:
      "Aplicativo Svelte em Vite que mantem o NAVAI dentro de um shell persistente enquanto o Orb roda em um pequeno host React.",
    setup: {
      title: "Etapa 1 Criar o projeto web",
      description:
        "Crie a aplicacao com Vite e o template TypeScript do Svelte, depois prepare `src/ai` e `src/components` para o NAVAI.",
      bullets: [
        "Este guia usa Svelte puro sobre Vite, nao SvelteKit, para que a sessao de voz fique em um unico runtime cliente.",
      ],
    },
    install: {
      title: "Etapa 2 Instalar dependencias",
      description:
        "Instale os pacotes do NAVAI junto com `react` e `react-dom`; o Orb em si e um componente React montado dentro do Svelte.",
      bullets: [
        "Nao e necessario adicionar outra dependencia de roteamento porque a demo usa navegacao por hash.",
      ],
    },
    env: {
      title: "Etapa 3 Configurar variaveis e loaders",
      description:
        "Mantenha alinhadas as variaveis de navegador do Vite e os caminhos CLI `NAVAI_*` para que a geracao dos loaders e o runtime leiam a mesma arvore.",
      bullets: [
        "Use a mesma URL de backend no `.env` e no servico de API em execucao.",
      ],
    },
    routes: {
      title: "Etapa 4 Definir rotas de navegacao",
      description:
        "Declare as rotas que o NAVAI pode abrir por voz com nomes, caminhos e sinonimos de negocio claros.",
      bullets: [
        "Publique apenas paginas estaveis que realmente devam ser abertas por voz.",
      ],
    },
    functions: {
      title: "Etapa 5 Definir funcoes",
      description:
        "Comece com uma pequena funcao frontend para validar a execucao local antes do fallback para o backend.",
      bullets: [
        "O exemplo atualiza cada elemento `[data-navai-status]` exibido na tela.",
      ],
    },
    runtime: {
      title: "Etapa 6 Integrar o runtime web",
      description:
        "Monte apenas um `VoiceNavigator.svelte`, crie a sessao de forma imperativa e alterne entre Home e Billing com navegacao por hash para que o Orb nunca seja desmontado.",
      bullets: [
        "O guia usa `window.location.hash` em vez de outra dependencia de roteador para manter a demo reproduzivel.",
        "React e ReactDOM sao usados apenas para hospedar `NavaiVoiceOrbDock` dentro de `VoiceNavigator.svelte`.",
      ],
    },
    test: {
      title: "Etapa 7 Testar a integracao web",
      description:
        "Regenere os loaders, inicie o Vite e confirme que a mesma sessao de voz continua viva ao navegar entre `#/` e `#/billing`.",
      bullets: [
        "Teste uma funcao local e uma chamada backend antes de adaptar o shell as suas rotas reais.",
      ],
    },
  },
  zh: {
    description:
      "基于 Vite 的 Svelte 应用，将 NAVAI 保持在一个持久外壳中，Orb 通过一个很小的 React 宿主运行。",
    setup: {
      title: "第 1 步 创建 Web 项目",
      description:
        "使用 Vite 和 Svelte TypeScript 模板创建应用，然后准备 NAVAI 需要的 `src/ai` 与 `src/components`。",
      bullets: [
        "本指南使用 Vite 上的纯 Svelte，而不是 SvelteKit，这样语音会话会一直留在同一个客户端运行时中。",
      ],
    },
    install: {
      title: "第 2 步 安装依赖",
      description:
        "安装 NAVAI 包以及 `react` 和 `react-dom`；因为 Orb 本身是挂载在 Svelte 内部的 React 组件。",
      bullets: ["这个示例不需要额外的路由依赖，因为导航保持在 hash 中。"],
    },
    env: {
      title: "第 3 步 配置环境变量和 loaders",
      description:
        "让 Vite 的浏览器变量和 CLI 的 `NAVAI_*` 路径保持一致，这样 loader 生成和运行时都会读取同一棵目录树。",
      bullets: ["请在 `.env` 和正在运行的 API 服务中使用同一个后端地址。"],
    },
    routes: {
      title: "第 4 步 定义导航路由",
      description:
        "声明 NAVAI 可通过语音打开的路由，并提供清晰的名称、路径和业务同义词。",
      bullets: ["只发布那些真正应该允许语音打开的稳定页面。"],
    },
    functions: {
      title: "第 5 步 定义函数",
      description:
        "先添加一个很小的前端函数，用来验证本地执行会先于后端回退发生。",
      bullets: ["示例会更新页面上所有 `[data-navai-status]` 元素。"],
    },
    runtime: {
      title: "第 6 步 集成 Web runtime",
      description:
        "只挂载一个 `VoiceNavigator.svelte`，以命令式方式创建会话，并用 hash 导航在 Home 与 Billing 间切换，这样 Orb 就不会被卸载。",
      bullets: [
        "本指南使用 `window.location.hash`，避免再引入一个路由依赖，并让示例更容易复现。",
        "React 和 ReactDOM 只用于在 `VoiceNavigator.svelte` 内承载 `NavaiVoiceOrbDock`。",
      ],
    },
    test: {
      title: "第 7 步 测试 Web 集成",
      description:
        "重新生成 loaders，启动 Vite，并确认在 `#/` 与 `#/billing` 之间切换时，同一个语音会话仍然保持存活。",
      bullets: [
        "在把这个 shell 改成你的真实路由之前，先测试一个本地函数和一个后端调用。",
      ],
    },
  },
  ja: {
    description:
      "Vite 上の Svelte アプリで、NAVAI を 1 つの永続シェルに保持し、Orb は小さな React ホスト経由で動作します。",
    setup: {
      title: "ステップ 1 Web プロジェクトを作成",
      description:
        "Vite の Svelte TypeScript テンプレートでアプリを作成し、NAVAI 用に `src/ai` と `src/components` を準備します。",
      bullets: [
        "このガイドは SvelteKit ではなく Vite 上の素の Svelte を使うため、音声セッションは 1 つのクライアントランタイムに残ります。",
      ],
    },
    install: {
      title: "ステップ 2 依存関係をインストール",
      description:
        "NAVAI パッケージに加えて `react` と `react-dom` を入れます。Orb 自体は Svelte 内でマウントする React コンポーネントです。",
      bullets: [
        "このデモではナビゲーションを hash に置くので、追加のルーター依存は不要です。",
      ],
    },
    env: {
      title: "ステップ 3 環境変数と loaders を設定",
      description:
        "Vite のブラウザ変数と CLI の `NAVAI_*` パスをそろえ、loader 生成と runtime が同じツリーを読むようにします。",
      bullets: [
        "`.env` と実行中の API サービスで同じバックエンド URL を使ってください。",
      ],
    },
    routes: {
      title: "ステップ 4 ナビゲーションルートを定義",
      description:
        "NAVAI が音声で開けるルートを宣言し、分かりやすい名前、パス、業務上の同義語を与えます。",
      bullets: ["本当に音声遷移させたい安定したページだけを公開してください。"],
    },
    functions: {
      title: "ステップ 5 関数を定義",
      description:
        "まずは小さなフロントエンド関数を追加し、バックエンド fallback より前にローカル実行されることを確認します。",
      bullets: [
        "このサンプルは画面上のすべての `[data-navai-status]` 要素を更新します。",
      ],
    },
    runtime: {
      title: "ステップ 6 Web runtime を統合",
      description:
        "`VoiceNavigator.svelte` を 1 回だけマウントし、命令的にセッションを作成し、hash ナビゲーションで Home と Billing を切り替えても Orb がアンマウントされないようにします。",
      bullets: [
        "このガイドは `window.location.hash` を使い、追加のルーター依存を避けて再現しやすいデモにしています。",
        "React と ReactDOM は `VoiceNavigator.svelte` 内で `NavaiVoiceOrbDock` をホストするためだけに使います。",
      ],
    },
    test: {
      title: "ステップ 7 Web 統合をテスト",
      description:
        "loaders を再生成して Vite を起動し、`#/` と `#/billing` の間を移動しても同じ音声セッションが維持されることを確認します。",
      bullets: [
        "実際のルートに合わせて shell を変える前に、ローカル関数とバックエンド呼び出しを 1 つずつ試してください。",
      ],
    },
  },
  ru: {
    description:
      "Приложение Svelte на Vite, где NAVAI живет в одной постоянной оболочке, а Orb работает через небольшой React-хост.",
    setup: {
      title: "Шаг 1 Создайте web-проект",
      description:
        "Создайте приложение через Vite с шаблоном Svelte TypeScript, затем подготовьте `src/ai` и `src/components` для NAVAI.",
      bullets: [
        "Это руководство использует обычный Svelte на Vite, а не SvelteKit, чтобы голосовая сессия жила в одном клиентском runtime.",
      ],
    },
    install: {
      title: "Шаг 2 Установите зависимости",
      description:
        "Установите пакеты NAVAI, а также `react` и `react-dom`; сам Orb является React-компонентом, который монтируется внутри Svelte.",
      bullets: [
        "Дополнительная router-зависимость не нужна, потому что навигация остается в hash.",
      ],
    },
    env: {
      title: "Шаг 3 Настройте переменные и loaders",
      description:
        "Синхронизируйте браузерные переменные Vite и CLI-пути `NAVAI_*`, чтобы генерация loaders и runtime читали одно и то же дерево.",
      bullets: [
        "Используйте один и тот же backend URL в `.env` и в запущенном API сервисе.",
      ],
    },
    routes: {
      title: "Шаг 4 Определите маршруты навигации",
      description:
        "Опишите маршруты, которые NAVAI может открывать голосом, с понятными именами, путями и бизнес-синонимами.",
      bullets: [
        "Публикуйте только стабильные страницы, которые действительно должны открываться голосом.",
      ],
    },
    functions: {
      title: "Шаг 5 Определите функции",
      description:
        "Начните с небольшой frontend-функции, чтобы проверить локальное выполнение до backend fallback.",
      bullets: [
        "Пример обновляет каждый элемент `[data-navai-status]` на текущем экране.",
      ],
    },
    runtime: {
      title: "Шаг 6 Интегрируйте web runtime",
      description:
        "Смонтируйте один `VoiceNavigator.svelte`, создайте сессию императивно и переключайтесь между Home и Billing через hash-навигацию, чтобы Orb никогда не размонтировался.",
      bullets: [
        "Руководство использует `window.location.hash`, чтобы не добавлять еще одну router-зависимость и сохранить пример воспроизводимым.",
        "React и ReactDOM нужны только для размещения `NavaiVoiceOrbDock` внутри `VoiceNavigator.svelte`.",
      ],
    },
    test: {
      title: "Шаг 7 Проверьте web-интеграцию",
      description:
        "Сгенерируйте loaders заново, запустите Vite и убедитесь, что одна и та же голосовая сессия сохраняется при переходах между `#/` и `#/billing`.",
      bullets: [
        "Протестируйте одну локальную функцию и один backend-вызов, прежде чем адаптировать shell под реальные маршруты.",
      ],
    },
  },
  ko: {
    description:
      "Vite 기반 Svelte 앱으로, NAVAI를 하나의 지속적인 셸에 유지하고 Orb는 작은 React 호스트를 통해 실행합니다.",
    setup: {
      title: "1단계 Web 프로젝트 생성",
      description:
        "Vite의 Svelte TypeScript 템플릿으로 앱을 만들고, NAVAI용 `src/ai`와 `src/components`를 준비하세요.",
      bullets: [
        "이 가이드는 SvelteKit이 아니라 Vite 위의 순수 Svelte를 사용하므로 음성 세션이 하나의 클라이언트 런타임에 유지됩니다.",
      ],
    },
    install: {
      title: "2단계 의존성 설치",
      description:
        "NAVAI 패키지와 함께 `react`, `react-dom`을 설치하세요. Orb 자체는 Svelte 안에 마운트되는 React 컴포넌트입니다.",
      bullets: [
        "이 데모는 navigation을 hash에 두기 때문에 추가 router 의존성이 필요하지 않습니다.",
      ],
    },
    env: {
      title: "3단계 환경 변수와 loaders 설정",
      description:
        "Vite 브라우저 변수와 CLI `NAVAI_*` 경로를 맞춰서 loader 생성과 runtime이 같은 트리를 읽게 하세요.",
      bullets: [
        "`.env`와 실행 중인 API 서비스에서 같은 backend URL을 사용하세요.",
      ],
    },
    routes: {
      title: "4단계 내비게이션 라우트 정의",
      description:
        "NAVAI가 음성으로 열 수 있는 라우트를 선언하고, 명확한 이름, 경로, 업무 동의어를 넣으세요.",
      bullets: ["음성으로 실제로 열려야 하는 안정적인 페이지들만 공개하세요."],
    },
    functions: {
      title: "5단계 함수 정의",
      description:
        "작은 프론트엔드 함수를 먼저 추가해서 backend fallback 전에 로컬 실행이 되는지 확인하세요.",
      bullets: [
        "예제는 화면의 모든 `[data-navai-status]` 요소를 업데이트합니다.",
      ],
    },
    runtime: {
      title: "6단계 Web runtime 통합",
      description:
        "`VoiceNavigator.svelte`를 한 번만 마운트하고, 세션을 명령형으로 만들고, hash navigation으로 Home과 Billing 사이를 바꿔도 Orb가 언마운트되지 않게 하세요.",
      bullets: [
        "이 가이드는 `window.location.hash`를 사용해 추가 router 의존성을 피하면서 데모를 재현 가능하게 유지합니다.",
        "React와 ReactDOM은 `VoiceNavigator.svelte` 안에서 `NavaiVoiceOrbDock`를 호스팅할 때만 사용됩니다.",
      ],
    },
    test: {
      title: "7단계 Web 통합 테스트",
      description:
        "loaders를 다시 생성하고 Vite를 시작한 뒤, `#/`와 `#/billing` 사이를 이동해도 같은 음성 세션이 유지되는지 확인하세요.",
      bullets: [
        "실제 라우트에 맞게 shell을 바꾸기 전에 로컬 함수 하나와 backend 호출 하나를 테스트하세요.",
      ],
    },
  },
  hi: {
    description:
      "Vite पर आधारित Svelte ऐप जिसमें NAVAI एक स्थायी shell के भीतर रहता है और Orb एक छोटे React host के जरिए चलता है।",
    setup: {
      title: "चरण 1 Web project बनाएं",
      description:
        "Vite के Svelte TypeScript template से app बनाएं, फिर NAVAI के लिए `src/ai` और `src/components` तैयार करें।",
      bullets: [
        "यह guide SvelteKit नहीं बल्कि Vite पर plain Svelte उपयोग करती है, ताकि voice session एक ही client runtime में रहे।",
      ],
    },
    install: {
      title: "चरण 2 Dependencies install करें",
      description:
        "NAVAI packages के साथ `react` और `react-dom` install करें; Orb खुद Svelte के अंदर mount होने वाला React component है।",
      bullets: [
        "इस demo के लिए अलग router dependency की जरूरत नहीं है क्योंकि navigation hash में रहती है।",
      ],
    },
    env: {
      title: "चरण 3 Env और loaders configure करें",
      description:
        "Vite browser variables और CLI `NAVAI_*` paths को aligned रखें ताकि loader generation और runtime दोनों एक ही tree पढ़ें।",
      bullets: [
        "`.env` और चल रही API service में वही backend URL इस्तेमाल करें।",
      ],
    },
    routes: {
      title: "चरण 4 Navigation routes define करें",
      description:
        "वे routes declare करें जिन्हें NAVAI voice से खोल सके, और उनमें साफ names, paths तथा business synonyms रखें।",
      bullets: [
        "सिर्फ वही stable pages expose करें जिन्हें सच में voice से खोला जाना चाहिए।",
      ],
    },
    functions: {
      title: "चरण 5 Functions define करें",
      description:
        "एक छोटी frontend function से शुरू करें ताकि backend fallback से पहले local execution verify हो सके।",
      bullets: [
        "यह sample screen पर मौजूद हर `[data-navai-status]` element को update करता है।",
      ],
    },
    runtime: {
      title: "चरण 6 Web runtime integrate करें",
      description:
        "एक ही `VoiceNavigator.svelte` mount करें, session को imperative तरीके से बनाएं, और Home तथा Billing के बीच hash navigation रखें ताकि Orb कभी unmount न हो।",
      bullets: [
        "Guide `window.location.hash` का उपयोग करती है ताकि अतिरिक्त router dependency से बचा जा सके और demo reproducible रहे।",
        "React और ReactDOM का उपयोग केवल `VoiceNavigator.svelte` के अंदर `NavaiVoiceOrbDock` host करने के लिए होता है।",
      ],
    },
    test: {
      title: "चरण 7 Web integration test करें",
      description:
        "Loaders दोबारा generate करें, Vite शुरू करें, और verify करें कि `#/` तथा `#/billing` के बीच जाने पर वही voice session जीवित रहे।",
      bullets: [
        "Shell को अपनी real routes के अनुसार बदलने से पहले एक local function और एक backend call test करें।",
      ],
    },
  },
};

function buildSvelteSections(
  language: LanguageCode,
  copy: LocalizedGuideCopy,
): InstallationGuideSection[] {
  return [
    {
      id: "paso-1-crear-proyecto-web",
      title: copy.setup.title,
      description: copy.setup.description,
      bullets: copy.setup.bullets,
      codeBlocks: [
        {
          label: "setup.sh",
          language: "bash",
          code: SETUP_CODE,
        },
      ],
    },
    {
      id: "paso-2-instalar-dependencias-web",
      title: copy.install.title,
      description: copy.install.description,
      bullets: copy.install.bullets,
      codeBlocks: [
        {
          label: "install.sh",
          language: "bash",
          code: INSTALL_CODE,
        },
      ],
    },
    {
      id: "paso-3-configurar-variables-y-loaders-web",
      title: copy.env.title,
      description: copy.env.description,
      bullets: copy.env.bullets,
      codeBlocks: [
        {
          label: ".env",
          language: "ini",
          code: ENV_CODE,
        },
      ],
    },
    {
      id: "paso-4-definir-rutas-navegables-web",
      title: copy.routes.title,
      description: copy.routes.description,
      bullets: copy.routes.bullets,
      codeBlocks: [
        {
          label: "src/ai/routes.ts",
          language: "typescript",
          code: ROUTES_CODE,
        },
      ],
    },
    {
      id: "paso-5-crear-functions-locales-web",
      title: copy.functions.title,
      description: copy.functions.description,
      bullets: copy.functions.bullets,
      codeBlocks: [
        {
          label: "src/ai/functions-modules/show_welcome_banner.ts",
          language: "typescript",
          code: LOCAL_FUNCTION_CODE,
        },
      ],
    },
    {
      id: "paso-6-integrar-runtime-web",
      title: copy.runtime.title,
      description: copy.runtime.description,
      bullets: copy.runtime.bullets,
      codeBlocks: [
        {
          label: "src/components/VoiceNavigator.svelte",
          language: "svelte",
          code: VOICE_NAVIGATOR_CODE,
        },
        {
          label: "src/App.svelte",
          language: "svelte",
          code: APP_CODE,
        },
        {
          label: "src/app.css",
          language: "css",
          code: APP_CSS_CODE,
        },
      ],
    },
    {
      id: "paso-7-probar-integracion-web",
      title: copy.test.title,
      description: copy.test.description,
      bullets: copy.test.bullets,
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
          code: LOCALIZED_CHECKLIST[language],
        },
      ],
    },
  ];
}

const WEB_SVELTE_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = Object.fromEntries(
  LANGUAGES.map((language) => {
    const copy = WEB_SVELTE_GUIDE_COPY[language];

    return [
      language,
      {
        value: "svelte",
        label: "Svelte",
        title: "Svelte",
        description: copy.description,
        sections: buildSvelteSections(language, copy),
      },
    ];
  }),
) as Partial<Record<LanguageCode, InstallationGuideTab>>;

export function getWebSvelteGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return getLocalizedInstallationGuideTab(WEB_SVELTE_GUIDE_TABS, language);
}
