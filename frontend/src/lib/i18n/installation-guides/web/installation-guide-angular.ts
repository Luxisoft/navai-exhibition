import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";

const ANGULAR_NAVAI_VOICE_SERVICE_CODE = [
  'import { Injectable, computed, inject, signal } from "@angular/core";',
  'import { Router } from "@angular/router";',
  'import { RealtimeSession } from "@openai/agents/realtime";',
  'import {',
  '  buildNavaiAgent,',
  '  createNavaiBackendClient,',
  '  resolveNavaiFrontendRuntimeConfig,',
  '} from "@navai/voice-frontend";',
  "",
  'import { NAVAI_ROUTE_ITEMS } from "../ai/routes";',
  'import { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";',
  'import { NAVAI_ENV } from "./navai-env";',
  "",
  '@Injectable({ providedIn: "root" })',
  "export class NavaiVoiceService {",
  "  private readonly router = inject(Router);",
  '  private readonly backendClient = createNavaiBackendClient({ apiBaseUrl: NAVAI_ENV.NAVAI_API_URL });',
  "  private session: RealtimeSession | null = null;",
  "",
  "  readonly isConnected = signal(false);",
  "  readonly isConnecting = signal(false);",
  "  readonly error = signal<string | null>(null);",
  '  readonly agentVoiceState = signal<"idle" | "speaking">("idle");',
  '  readonly isAgentSpeaking = computed(() => this.agentVoiceState() === "speaking");',
  "",
  "  private readonly handleSessionAudioStart = () => {",
  '    this.agentVoiceState.set("speaking");',
  "  };",
  "",
  "  private readonly handleSessionAudioStopped = () => {",
  '    this.agentVoiceState.set("idle");',
  "  };",
  "",
  "  private readonly handleSessionAudioInterrupted = () => {",
  '    this.agentVoiceState.set("idle");',
  "  };",
  "",
  "  private readonly handleSessionError = () => {",
  '    this.agentVoiceState.set("idle");',
  "  };",
  "",
  "  private attachSessionAudioListeners(session: RealtimeSession) {",
  "    this.detachSessionAudioListeners();",
  '    session.on("audio_start", this.handleSessionAudioStart);',
  '    session.on("audio_stopped", this.handleSessionAudioStopped);',
  '    session.on("audio_interrupted", this.handleSessionAudioInterrupted);',
  '    session.on("error", this.handleSessionError);',
  "  }",
  "",
  "  private detachSessionAudioListeners() {",
  "    if (!this.session) {",
  "      return;",
  "    }",
  "",
  '    this.session.off("audio_start", this.handleSessionAudioStart);',
  '    this.session.off("audio_stopped", this.handleSessionAudioStopped);',
  '    this.session.off("audio_interrupted", this.handleSessionAudioInterrupted);',
  '    this.session.off("error", this.handleSessionError);',
  "  }",
  "",
  "  async start() {",
  "    if (this.session || this.isConnecting()) {",
  "      return;",
  "    }",
  "",
  "    this.isConnecting.set(true);",
  "    this.isConnected.set(false);",
  "    this.error.set(null);",
  '    this.agentVoiceState.set("idle");',
  "",
  "    try {",
  "      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({",
  "        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,",
  "        defaultRoutes: NAVAI_ROUTE_ITEMS,",
  "        env: NAVAI_ENV,",
  "      });",
  '      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;',
  "      const secret = await this.backendClient.createClientSecret(requestPayload);",
  "      const backendFunctions = await this.backendClient.listFunctions();",
  "      const { agent } = await buildNavaiAgent({",
  "        navigate: (path) => void this.router.navigateByUrl(path),",
  "        routes: runtimeConfig.routes,",
  "        functionModuleLoaders: runtimeConfig.functionModuleLoaders,",
  "        backendFunctions: backendFunctions.functions,",
  "        executeBackendFunction: this.backendClient.executeFunction,",
  "      });",
  "",
  "      this.session = new RealtimeSession(agent);",
  "      this.attachSessionAudioListeners(this.session);",
  "",
  "      if (runtimeConfig.modelOverride) {",
  '        await this.session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });',
  "      } else {",
  "        await this.session.connect({ apiKey: secret.value });",
  "      }",
  "",
  "      this.isConnected.set(true);",
  "    } catch (startError) {",
  "      console.error(startError);",
  '      this.error.set("NAVAI could not start.");',
  "      this.detachSessionAudioListeners();",
  "      this.session?.close();",
  "      this.session = null;",
  '      this.agentVoiceState.set("idle");',
  "      this.isConnected.set(false);",
  "    } finally {",
  "      this.isConnecting.set(false);",
  "    }",
  "  }",
  "",
  "  stop() {",
  "    this.detachSessionAudioListeners();",
  "    this.session?.close();",
  "    this.session = null;",
  "    this.isConnecting.set(false);",
  "    this.isConnected.set(false);",
  "    this.error.set(null);",
  '    this.agentVoiceState.set("idle");',
  "  }",
  "}",
].join("\n");

const ANGULAR_APP_TS_CODE = [
  'import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject } from "@angular/core";',
  'import { RouterOutlet } from "@angular/router";',
  'import { createElement } from "react";',
  'import { createRoot, type Root } from "react-dom/client";',
  'import { NavaiVoiceOrbDock } from "@navai/voice-frontend";',
  "",
  'import { NavaiVoiceService } from "./navai-voice.service";',
  "",
  "@Component({",
  '  selector: "app-root",',
  "  standalone: true,",
  "  imports: [RouterOutlet],",
  '  templateUrl: "./app.html",',
  "  styles: [`",
  "    :host {",
  "      display: block;",
  "      min-height: 100vh;",
  "      padding: 32px;",
  "      color: #e2e8f0;",
  "      background:",
  "        radial-gradient(circle at top, rgba(14, 165, 233, 0.2), transparent 30%),",
  "        linear-gradient(180deg, #081120 0%, #030712 100%);",
  '      font-family: Inter, "Segoe UI", sans-serif;',
  "    }",
  "",
  "    .voice-shell {",
  "      display: grid;",
  "      gap: 18px;",
  "      width: min(420px, 100%);",
  "      border-radius: 28px;",
  "      border: 1px solid rgba(148, 163, 184, 0.16);",
  "      background: rgba(5, 10, 24, 0.76);",
  "      padding: 24px;",
  "      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);",
  "      margin-bottom: 24px;",
  "    }",
  "",
  "    .voice-eyebrow {",
  "      display: inline-block;",
  "      margin-bottom: 10px;",
  "      color: #7dd3fc;",
  "      font-size: 0.82rem;",
  "      font-weight: 700;",
  "      letter-spacing: 0.16em;",
  "      text-transform: uppercase;",
  "    }",
  "",
  "    .status-banner {",
  "      margin: 0;",
  "      border-radius: 18px;",
  "      border: 1px solid rgba(125, 211, 252, 0.24);",
  "      padding: 14px 16px;",
  "      background: rgba(8, 47, 73, 0.42);",
  "      color: #e2e8f0;",
  "    }",
  "  `],",
  "})",
  "export class App implements AfterViewInit, OnDestroy {",
  '  @ViewChild("orbHost", { static: true }) orbHost?: ElementRef<HTMLDivElement>;',
  "",
  "  readonly voice = inject(NavaiVoiceService);",
  "",
  "  private reactRoot: Root | null = null;",
  "  private readonly orbEffect = effect(() => {",
  "    this.voice.isConnected();",
  "    this.voice.isConnecting();",
  "    this.voice.error();",
  "    this.voice.agentVoiceState();",
  "    this.voice.isAgentSpeaking();",
  "    this.renderOrb();",
  "  });",
  "",
  "  ngAfterViewInit() {",
  "    if (!this.orbHost) {",
  "      return;",
  "    }",
  "",
  "    this.reactRoot = createRoot(this.orbHost.nativeElement);",
  "    this.renderOrb();",
  "  }",
  "",
  "  ngOnDestroy() {",
  "    this.reactRoot?.unmount();",
  "    this.reactRoot = null;",
  "  }",
  "",
  "  private renderOrb() {",
  "    if (!this.reactRoot) {",
  "      return;",
  "    }",
  "",
  "    this.reactRoot.render(",
  "      createElement(NavaiVoiceOrbDock, {",
  "        agent: {",
  '          status: this.voice.error() ? "error" : this.voice.isConnecting() ? "connecting" : this.voice.isConnected() ? "connected" : "idle",',
  "          agentVoiceState: this.voice.agentVoiceState(),",
  "          error: this.voice.error(),",
  "          isConnecting: this.voice.isConnecting(),",
  "          isConnected: this.voice.isConnected(),",
  "          isAgentSpeaking: this.voice.isAgentSpeaking(),",
  "          start: () => this.voice.start(),",
  "          stop: () => this.voice.stop(),",
  "        },",
  '        placement: "bottom-right",',
  '        themeMode: "dark",',
  "        showStatus: false,",
  '        backgroundColorLight: "#f8fafc",',
  '        backgroundColorDark: "#050816",',
  "      })",
  "    );",
  "  }",
  "}",
].join("\n");

const WEB_ANGULAR_SHARED_CODE_BY_LABEL: Readonly<Record<string, string>> = {
  "src/app/navai-voice.service.ts": ANGULAR_NAVAI_VOICE_SERVICE_CODE,
  "src/app/app.ts": ANGULAR_APP_TS_CODE,
};

function withAngularSharedCode(tab: InstallationGuideTab): InstallationGuideTab {
  return {
    ...tab,
    sections: tab.sections.map((section) => ({
      ...section,
      codeBlocks: section.codeBlocks?.map((codeBlock) => {
        const sharedCode = WEB_ANGULAR_SHARED_CODE_BY_LABEL[codeBlock.label];

        return sharedCode ? { ...codeBlock, code: sharedCode } : codeBlock;
      }),
    })),
  };
}

const WEB_ANGULAR_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  en: {
    value: "angular",
    label: "Angular",
    title: "Angular",
    description:
      "Angular application with a singleton service that owns the NAVAI session and router navigation.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Step 1 Create the web project",
        description:
          "Create the Angular app with routing enabled and prepare `src/ai` plus a dedicated service for voice orchestration.",
        bullets: [
          "Keep the service as a singleton so navigation does not destroy an active session.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npx @angular/cli@latest new navai-web-demo --routing --style=scss --package-manager npm --skip-git --skip-install --defaults\ncd navai-web-demo\nnpm install\nnpx ng analytics disable\nmkdir -p src/ai/functions-modules src/app",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Step 2 Install dependencies",
        description:
          "Install the NAVAI packages that the service will consume. Angular already provides router and dependency injection.",
        bullets: [
          "The missing layer is not routing but the voice runtime and backend bridge.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0\nnpm install -D @types/react @types/react-dom",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Step 3 Configure env and loaders",
        description:
          "Keep one `.env` file for the loader CLI and one `navai-env.ts` file for the runtime values consumed by browser code.",
        bullets: [
          "Angular does not expose `.env` directly to the browser, so separate build config from runtime config.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "NAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "src/app/navai-env.ts",
            language: "ts",
            code: 'export const NAVAI_ENV = {\n  NAVAI_API_URL: "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n} as const;',
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
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset["navaiState"] = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "Step 6 Integrate the web runtime",
        description:
          "Inject `Router` into the service, build the agent imperatively, and bind the root template to the service signals.",
        bullets: [
          "Call `start()` from the service so session lifecycle stays outside short-lived components.",
        ],
        codeBlocks: [
          {
            label: "src/app/navai-voice.service.ts",
            language: "ts",
            code: 'import { Injectable, inject, signal } from "@angular/core";\nimport { Router } from "@angular/router";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\nimport { NAVAI_ENV } from "./navai-env";\n\n@Injectable({ providedIn: "root" })\nexport class NavaiVoiceService {\n  private readonly router = inject(Router);\n  private readonly backendClient = createNavaiBackendClient({ apiBaseUrl: NAVAI_ENV.NAVAI_API_URL });\n  private session: RealtimeSession | null = null;\n\n  readonly isConnected = signal(false);\n  readonly isConnecting = signal(false);\n  readonly error = signal<string | null>(null);\n\n  async start() {\n    if (this.session || this.isConnecting()) {\n      return;\n    }\n\n    this.isConnecting.set(true);\n    this.error.set(null);\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await this.backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await this.backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate: (path) => void this.router.navigateByUrl(path),\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: this.backendClient.executeFunction,\n      });\n\n      this.session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await this.session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await this.session.connect({ apiKey: secret.value });\n      }\n\n      this.isConnected.set(true);\n    } catch (startError) {\n      console.error(startError);\n      this.error.set("NAVAI could not start.");\n      this.session?.close();\n      this.session = null;\n      this.isConnected.set(false);\n    } finally {\n      this.isConnecting.set(false);\n    }\n  }\n\n  stop() {\n    this.session?.close();\n    this.session = null;\n    this.isConnected.set(false);\n  }\n}',
          },
          {
            label: "src/app/app.ts",
            language: "ts",
            code: 'import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, type EffectRef } from "@angular/core";\nimport { RouterOutlet } from "@angular/router";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\n\nimport { NavaiVoiceService } from "./navai-voice.service";\n\n@Component({\n  selector: "app-root",\n  standalone: true,\n  imports: [RouterOutlet],\n  templateUrl: "./app.html",\n  styles: [`\n    :host {\n      display: block;\n      min-height: 100vh;\n      padding: 32px;\n      color: #e2e8f0;\n      background:\n        radial-gradient(circle at top, rgba(14, 165, 233, 0.2), transparent 30%),\n        linear-gradient(180deg, #081120 0%, #030712 100%);\n      font-family: Inter, "Segoe UI", sans-serif;\n    }\n\n    .voice-shell {\n      display: grid;\n      gap: 18px;\n      width: min(420px, 100%);\n      border-radius: 28px;\n      border: 1px solid rgba(148, 163, 184, 0.16);\n      background: rgba(5, 10, 24, 0.76);\n      padding: 24px;\n      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n      margin-bottom: 24px;\n    }\n\n    .voice-eyebrow {\n      display: inline-block;\n      margin-bottom: 10px;\n      color: #7dd3fc;\n      font-size: 0.82rem;\n      font-weight: 700;\n      letter-spacing: 0.16em;\n      text-transform: uppercase;\n    }\n\n    .status-banner {\n      margin: 0;\n      border-radius: 18px;\n      border: 1px solid rgba(125, 211, 252, 0.24);\n      padding: 14px 16px;\n      background: rgba(8, 47, 73, 0.42);\n      color: #e2e8f0;\n    }\n  `],\n})\nexport class App implements AfterViewInit, OnDestroy {\n  @ViewChild("orbHost", { static: true }) orbHost?: ElementRef<HTMLDivElement>;\n\n  readonly voice = inject(NavaiVoiceService);\n\n  private reactRoot: Root | null = null;\n  private orbEffect?: EffectRef;\n\n  ngAfterViewInit() {\n    if (!this.orbHost) {\n      return;\n    }\n\n    this.reactRoot = createRoot(this.orbHost.nativeElement);\n    this.renderOrb();\n\n    this.orbEffect = effect(() => {\n      this.voice.isConnected();\n      this.voice.isConnecting();\n      this.voice.error();\n      this.renderOrb();\n    });\n  }\n\n  ngOnDestroy() {\n    this.orbEffect?.destroy();\n    this.reactRoot?.unmount();\n    this.reactRoot = null;\n  }\n\n  private renderOrb() {\n    if (!this.reactRoot) {\n      return;\n    }\n\n    this.reactRoot.render(\n      createElement(NavaiVoiceOrbDock, {\n        agent: {\n          status: this.voice.error() ? "error" : this.voice.isConnecting() ? "connecting" : this.voice.isConnected() ? "connected" : "idle",\n          agentVoiceState: "idle",\n          error: this.voice.error(),\n          isConnecting: this.voice.isConnecting(),\n          isConnected: this.voice.isConnected(),\n          isAgentSpeaking: false,\n          start: () => this.voice.start(),\n          stop: () => this.voice.stop(),\n        },\n        placement: "bottom-right",\n        themeMode: "dark",\n        showStatus: false,\n        backgroundColorLight: "#f8fafc",\n        backgroundColorDark: "#050816",\n      })\n    );\n  }\n}',
          },
          {
            label: "src/app/app.html",
            language: "html",
            code: '<section class="voice-shell">\n  <div>\n    <span class="voice-eyebrow">Angular + NAVAI</span>\n    <h2>Mount the NAVAI Orb inside the root shell.</h2>\n    <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n  </div>\n\n  <div #orbHost></div>\n  <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n</section>\n\n<router-outlet />',
          },
          {
            label: "src/app/app.routes.ts",
            language: "ts",
            code: 'import { Routes } from "@angular/router";\n\nimport { BillingPage } from "./billing-page";\nimport { HomePage } from "./home-page";\n\nexport const routes: Routes = [\n  {\n    path: "",\n    component: HomePage,\n  },\n  {\n    path: "billing",\n    component: BillingPage,\n  },\n];',
          },
          {
            label: "src/app/home-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Home</h1>\n      <p>Ask NAVAI to open Billing.</p>\n    </section>\n  `,\n})\nexport class HomePage {}',
          },
          {
            label: "src/app/billing-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Billing</h1>\n      <p data-navai-status>Billing page ready for NAVAI.</p>\n    </section>\n  `,\n})\nexport class BillingPage {}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Step 7 Test the web integration",
        description:
          "Regenerate loaders, disable Angular analytics once, run `npx ng serve`, and validate navigation, local function execution, and backend fallback.",
        bullets: [
          "If the session reconnects on every navigation, confirm that the service remains in `providedIn: root`.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "ng-serve.sh",
            language: "bash",
            code: "npx ng analytics disable\nnpx ng serve",
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
    value: "angular",
    label: "Angular",
    title: "Angular",
    description:
      "Application Angular avec un service singleton qui possede la session NAVAI et la navigation du router.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Etape 1 Creer le projet web",
        description:
          "Creez l app Angular avec le routing actif et preparez `src/ai` plus un service dedie a l orchestration vocale.",
        bullets: [
          "Gardez le service en singleton pour qu une navigation ne detruise pas une session active.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npx @angular/cli@latest new navai-web-demo --routing --style=scss --package-manager npm --skip-git --skip-install --defaults\ncd navai-web-demo\nnpm install\nnpx ng analytics disable\nmkdir -p src/ai/functions-modules src/app",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Etape 2 Installer les dependances",
        description:
          "Installez les paquets NAVAI que le service consommera. Angular fournit deja router et injection de dependances.",
        bullets: [
          "La piece manquante n est pas le routing mais le runtime vocal et le bridge backend.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0\nnpm install -D @types/react @types/react-dom",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Etape 3 Configurer variables et loaders",
        description:
          "Gardez un fichier `.env` pour le CLI et un fichier `navai-env.ts` pour les valeurs runtime consommees par le navigateur.",
        bullets: [
          "Angular n expose pas `.env` directement au navigateur, donc separez config build et config runtime.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "NAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "src/app/navai-env.ts",
            language: "ts",
            code: 'export const NAVAI_ENV = {\n  NAVAI_API_URL: "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n} as const;',
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
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset["navaiState"] = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "Etape 6 Integrer le runtime web",
        description:
          "Injectez `Router` dans le service, construisez l agent de maniere imperative et liez le template racine aux signals du service.",
        bullets: [
          "Appelez `start()` depuis le service pour garder le cycle de vie de la session hors des composants ephemeres.",
        ],
        codeBlocks: [
          {
            label: "src/app/navai-voice.service.ts",
            language: "ts",
            code: 'import { Injectable, inject, signal } from "@angular/core";\nimport { Router } from "@angular/router";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\nimport { NAVAI_ENV } from "./navai-env";\n\n@Injectable({ providedIn: "root" })\nexport class NavaiVoiceService {\n  private readonly router = inject(Router);\n  private readonly backendClient = createNavaiBackendClient({ apiBaseUrl: NAVAI_ENV.NAVAI_API_URL });\n  private session: RealtimeSession | null = null;\n\n  readonly isConnected = signal(false);\n  readonly isConnecting = signal(false);\n  readonly error = signal<string | null>(null);\n\n  async start() {\n    if (this.session || this.isConnecting()) {\n      return;\n    }\n\n    this.isConnecting.set(true);\n    this.error.set(null);\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await this.backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await this.backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate: (path) => void this.router.navigateByUrl(path),\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: this.backendClient.executeFunction,\n      });\n\n      this.session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await this.session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await this.session.connect({ apiKey: secret.value });\n      }\n\n      this.isConnected.set(true);\n    } catch (startError) {\n      console.error(startError);\n      this.error.set("NAVAI could not start.");\n      this.session?.close();\n      this.session = null;\n      this.isConnected.set(false);\n    } finally {\n      this.isConnecting.set(false);\n    }\n  }\n\n  stop() {\n    this.session?.close();\n    this.session = null;\n    this.isConnected.set(false);\n  }\n}',
          },
          {
            label: "src/app/app.ts",
            language: "ts",
            code: 'import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, type EffectRef } from "@angular/core";\nimport { RouterOutlet } from "@angular/router";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\n\nimport { NavaiVoiceService } from "./navai-voice.service";\n\n@Component({\n  selector: "app-root",\n  standalone: true,\n  imports: [RouterOutlet],\n  templateUrl: "./app.html",\n  styles: [`\n    :host {\n      display: block;\n      min-height: 100vh;\n      padding: 32px;\n      color: #e2e8f0;\n      background:\n        radial-gradient(circle at top, rgba(14, 165, 233, 0.2), transparent 30%),\n        linear-gradient(180deg, #081120 0%, #030712 100%);\n      font-family: Inter, "Segoe UI", sans-serif;\n    }\n\n    .voice-shell {\n      display: grid;\n      gap: 18px;\n      width: min(420px, 100%);\n      border-radius: 28px;\n      border: 1px solid rgba(148, 163, 184, 0.16);\n      background: rgba(5, 10, 24, 0.76);\n      padding: 24px;\n      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n      margin-bottom: 24px;\n    }\n\n    .voice-eyebrow {\n      display: inline-block;\n      margin-bottom: 10px;\n      color: #7dd3fc;\n      font-size: 0.82rem;\n      font-weight: 700;\n      letter-spacing: 0.16em;\n      text-transform: uppercase;\n    }\n\n    .status-banner {\n      margin: 0;\n      border-radius: 18px;\n      border: 1px solid rgba(125, 211, 252, 0.24);\n      padding: 14px 16px;\n      background: rgba(8, 47, 73, 0.42);\n      color: #e2e8f0;\n    }\n  `],\n})\nexport class App implements AfterViewInit, OnDestroy {\n  @ViewChild("orbHost", { static: true }) orbHost?: ElementRef<HTMLDivElement>;\n\n  readonly voice = inject(NavaiVoiceService);\n\n  private reactRoot: Root | null = null;\n  private orbEffect?: EffectRef;\n\n  ngAfterViewInit() {\n    if (!this.orbHost) {\n      return;\n    }\n\n    this.reactRoot = createRoot(this.orbHost.nativeElement);\n    this.renderOrb();\n\n    this.orbEffect = effect(() => {\n      this.voice.isConnected();\n      this.voice.isConnecting();\n      this.voice.error();\n      this.renderOrb();\n    });\n  }\n\n  ngOnDestroy() {\n    this.orbEffect?.destroy();\n    this.reactRoot?.unmount();\n    this.reactRoot = null;\n  }\n\n  private renderOrb() {\n    if (!this.reactRoot) {\n      return;\n    }\n\n    this.reactRoot.render(\n      createElement(NavaiVoiceOrbDock, {\n        agent: {\n          status: this.voice.error() ? "error" : this.voice.isConnecting() ? "connecting" : this.voice.isConnected() ? "connected" : "idle",\n          agentVoiceState: "idle",\n          error: this.voice.error(),\n          isConnecting: this.voice.isConnecting(),\n          isConnected: this.voice.isConnected(),\n          isAgentSpeaking: false,\n          start: () => this.voice.start(),\n          stop: () => this.voice.stop(),\n        },\n        placement: "bottom-right",\n        themeMode: "dark",\n        showStatus: false,\n        backgroundColorLight: "#f8fafc",\n        backgroundColorDark: "#050816",\n      })\n    );\n  }\n}',
          },
          {
            label: "src/app/app.html",
            language: "html",
            code: '<section class="voice-shell">\n  <div>\n    <span class="voice-eyebrow">Angular + NAVAI</span>\n    <h2>Mount the NAVAI Orb inside the root shell.</h2>\n    <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n  </div>\n\n  <div #orbHost></div>\n  <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n</section>\n\n<router-outlet />',
          },
          {
            label: "src/app/app.routes.ts",
            language: "ts",
            code: 'import { Routes } from "@angular/router";\n\nimport { BillingPage } from "./billing-page";\nimport { HomePage } from "./home-page";\n\nexport const routes: Routes = [\n  {\n    path: "",\n    component: HomePage,\n  },\n  {\n    path: "billing",\n    component: BillingPage,\n  },\n];',
          },
          {
            label: "src/app/home-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Home</h1>\n      <p>Ask NAVAI to open Billing.</p>\n    </section>\n  `,\n})\nexport class HomePage {}',
          },
          {
            label: "src/app/billing-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Billing</h1>\n      <p data-navai-status>Billing page ready for NAVAI.</p>\n    </section>\n  `,\n})\nexport class BillingPage {}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Etape 7 Tester l integration web",
        description:
          "Regenerez les loaders, desactivez Angular analytics une fois, lancez `npx ng serve` et validez navigation, fonction locale et fallback backend.",
        bullets: [
          "Si la session se reconnecte a chaque navigation, confirmez que le service reste en `providedIn: root`.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "ng-serve.sh",
            language: "bash",
            code: "npx ng analytics disable\nnpx ng serve",
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
    value: "angular",
    label: "Angular",
    title: "Angular",
    description:
      "Aplicacion Angular con un servicio singleton que administra la sesion NAVAI y la navegacion del router.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Paso 1 Crear el proyecto web",
        description:
          "Cree la app Angular con routing habilitado y prepare `src/ai` junto con un servicio dedicado para la orquestacion de voz.",
        bullets: [
          "Mantenga el servicio como singleton para que una navegacion no destruya una sesion activa.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npx @angular/cli@latest new navai-web-demo --routing --style=scss --package-manager npm --skip-git --skip-install --defaults\ncd navai-web-demo\nnpm install\nnpx ng analytics disable\nmkdir -p src/ai/functions-modules src/app",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Paso 2 Instalar dependencias",
        description:
          "Instale los paquetes de NAVAI que consumira el servicio. Angular ya aporta router e inyeccion de dependencias.",
        bullets: [
          "La parte que falta en Angular no es el router sino el runtime de voz y el bridge con backend.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0\nnpm install -D @types/react @types/react-dom",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Paso 3 Configurar variables y loaders",
        description:
          "Mantenga un `.env` para el CLI de loaders y un archivo `navai-env.ts` para los valores que el navegador consumira en runtime.",
        bullets: [
          "Angular no expone `.env` al browser de forma directa, asi que separe configuracion de build y configuracion de runtime.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "NAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "src/app/navai-env.ts",
            language: "ts",
            code: 'export const NAVAI_ENV = {\n  NAVAI_API_URL: "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n} as const;',
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
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset["navaiState"] = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "Paso 6 Integrar el runtime web",
        description:
          "Inyecte `Router` en el servicio, construya el agente de forma imperativa y enlace el template raiz con las signals del servicio.",
        bullets: [
          "Llame `start()` desde el servicio para que el ciclo de vida de la sesion quede fuera de componentes pasajeros.",
        ],
        codeBlocks: [
          {
            label: "src/app/navai-voice.service.ts",
            language: "ts",
            code: 'import { Injectable, inject, signal } from "@angular/core";\nimport { Router } from "@angular/router";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\nimport { NAVAI_ENV } from "./navai-env";\n\n@Injectable({ providedIn: "root" })\nexport class NavaiVoiceService {\n  private readonly router = inject(Router);\n  private readonly backendClient = createNavaiBackendClient({ apiBaseUrl: NAVAI_ENV.NAVAI_API_URL });\n  private session: RealtimeSession | null = null;\n\n  readonly isConnected = signal(false);\n  readonly isConnecting = signal(false);\n  readonly error = signal<string | null>(null);\n\n  async start() {\n    if (this.session || this.isConnecting()) {\n      return;\n    }\n\n    this.isConnecting.set(true);\n    this.error.set(null);\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await this.backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await this.backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate: (path) => void this.router.navigateByUrl(path),\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: this.backendClient.executeFunction,\n      });\n\n      this.session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await this.session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await this.session.connect({ apiKey: secret.value });\n      }\n\n      this.isConnected.set(true);\n    } catch (startError) {\n      console.error(startError);\n      this.error.set("NAVAI could not start.");\n      this.session?.close();\n      this.session = null;\n      this.isConnected.set(false);\n    } finally {\n      this.isConnecting.set(false);\n    }\n  }\n\n  stop() {\n    this.session?.close();\n    this.session = null;\n    this.isConnected.set(false);\n  }\n}',
          },
          {
            label: "src/app/app.ts",
            language: "ts",
            code: 'import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, type EffectRef } from "@angular/core";\nimport { RouterOutlet } from "@angular/router";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\n\nimport { NavaiVoiceService } from "./navai-voice.service";\n\n@Component({\n  selector: "app-root",\n  standalone: true,\n  imports: [RouterOutlet],\n  templateUrl: "./app.html",\n  styles: [`\n    :host {\n      display: block;\n      min-height: 100vh;\n      padding: 32px;\n      color: #e2e8f0;\n      background:\n        radial-gradient(circle at top, rgba(14, 165, 233, 0.2), transparent 30%),\n        linear-gradient(180deg, #081120 0%, #030712 100%);\n      font-family: Inter, "Segoe UI", sans-serif;\n    }\n\n    .voice-shell {\n      display: grid;\n      gap: 18px;\n      width: min(420px, 100%);\n      border-radius: 28px;\n      border: 1px solid rgba(148, 163, 184, 0.16);\n      background: rgba(5, 10, 24, 0.76);\n      padding: 24px;\n      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n      margin-bottom: 24px;\n    }\n\n    .voice-eyebrow {\n      display: inline-block;\n      margin-bottom: 10px;\n      color: #7dd3fc;\n      font-size: 0.82rem;\n      font-weight: 700;\n      letter-spacing: 0.16em;\n      text-transform: uppercase;\n    }\n\n    .status-banner {\n      margin: 0;\n      border-radius: 18px;\n      border: 1px solid rgba(125, 211, 252, 0.24);\n      padding: 14px 16px;\n      background: rgba(8, 47, 73, 0.42);\n      color: #e2e8f0;\n    }\n  `],\n})\nexport class App implements AfterViewInit, OnDestroy {\n  @ViewChild("orbHost", { static: true }) orbHost?: ElementRef<HTMLDivElement>;\n\n  readonly voice = inject(NavaiVoiceService);\n\n  private reactRoot: Root | null = null;\n  private orbEffect?: EffectRef;\n\n  ngAfterViewInit() {\n    if (!this.orbHost) {\n      return;\n    }\n\n    this.reactRoot = createRoot(this.orbHost.nativeElement);\n    this.renderOrb();\n\n    this.orbEffect = effect(() => {\n      this.voice.isConnected();\n      this.voice.isConnecting();\n      this.voice.error();\n      this.renderOrb();\n    });\n  }\n\n  ngOnDestroy() {\n    this.orbEffect?.destroy();\n    this.reactRoot?.unmount();\n    this.reactRoot = null;\n  }\n\n  private renderOrb() {\n    if (!this.reactRoot) {\n      return;\n    }\n\n    this.reactRoot.render(\n      createElement(NavaiVoiceOrbDock, {\n        agent: {\n          status: this.voice.error() ? "error" : this.voice.isConnecting() ? "connecting" : this.voice.isConnected() ? "connected" : "idle",\n          agentVoiceState: "idle",\n          error: this.voice.error(),\n          isConnecting: this.voice.isConnecting(),\n          isConnected: this.voice.isConnected(),\n          isAgentSpeaking: false,\n          start: () => this.voice.start(),\n          stop: () => this.voice.stop(),\n        },\n        placement: "bottom-right",\n        themeMode: "dark",\n        showStatus: false,\n        backgroundColorLight: "#f8fafc",\n        backgroundColorDark: "#050816",\n      })\n    );\n  }\n}',
          },
          {
            label: "src/app/app.html",
            language: "html",
            code: '<section class="voice-shell">\n  <div>\n    <span class="voice-eyebrow">Angular + NAVAI</span>\n    <h2>Mount the NAVAI Orb inside the root shell.</h2>\n    <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n  </div>\n\n  <div #orbHost></div>\n  <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n</section>\n\n<router-outlet />',
          },
          {
            label: "src/app/app.routes.ts",
            language: "ts",
            code: 'import { Routes } from "@angular/router";\n\nimport { BillingPage } from "./billing-page";\nimport { HomePage } from "./home-page";\n\nexport const routes: Routes = [\n  {\n    path: "",\n    component: HomePage,\n  },\n  {\n    path: "billing",\n    component: BillingPage,\n  },\n];',
          },
          {
            label: "src/app/home-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Home</h1>\n      <p>Ask NAVAI to open Billing.</p>\n    </section>\n  `,\n})\nexport class HomePage {}',
          },
          {
            label: "src/app/billing-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Billing</h1>\n      <p data-navai-status>Billing page ready for NAVAI.</p>\n    </section>\n  `,\n})\nexport class BillingPage {}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Paso 7 Probar la integracion web",
        description:
          "Regenere loaders, desactive Angular analytics una vez, ejecute `npx ng serve` y valide navegacion, function local y fallback hacia backend.",
        bullets: [
          "Si la sesion se reconecta en cada navegacion, revise que el servicio siga en `providedIn: root`.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "ng-serve.sh",
            language: "bash",
            code: "npx ng analytics disable\nnpx ng serve",
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
    value: "angular",
    label: "Angular",
    title: "Angular",
    description:
      "Aplicacao Angular com um servico singleton que controla a sessao NAVAI e a navegacao do router.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Passo 1 Criar o projeto web",
        description:
          "Crie a app Angular com routing habilitado e prepare `src/ai` junto com um servico dedicado para a orquestracao de voz.",
        bullets: [
          "Mantenha o servico como singleton para que a navegacao nao destrua uma sessao ativa.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npx @angular/cli@latest new navai-web-demo --routing --style=scss --package-manager npm --skip-git --skip-install --defaults\ncd navai-web-demo\nnpm install\nnpx ng analytics disable\nmkdir -p src/ai/functions-modules src/app",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Passo 2 Instalar dependencias",
        description:
          "Instale os pacotes do NAVAI que o servico vai consumir. Angular ja oferece router e injecao de dependencias.",
        bullets: [
          "A camada ausente nao e o routing, e sim o runtime de voz e a ponte com o backend.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0\nnpm install -D @types/react @types/react-dom",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Passo 3 Configurar variaveis e loaders",
        description:
          "Mantenha um `.env` para o CLI de loaders e um arquivo `navai-env.ts` para os valores de runtime consumidos pelo navegador.",
        bullets: [
          "Angular nao expose `.env` diretamente ao browser, entao separe configuracao de build e configuracao de runtime.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "NAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "src/app/navai-env.ts",
            language: "ts",
            code: 'export const NAVAI_ENV = {\n  NAVAI_API_URL: "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n} as const;',
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
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset["navaiState"] = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "Passo 6 Integrar o runtime web",
        description:
          "Injete `Router` no servico, construa o agente de forma imperativa e conecte o template raiz as signals do servico.",
        bullets: [
          "Chame `start()` a partir do servico para que o ciclo de vida da sessao fique fora de componentes curtos.",
        ],
        codeBlocks: [
          {
            label: "src/app/navai-voice.service.ts",
            language: "ts",
            code: 'import { Injectable, inject, signal } from "@angular/core";\nimport { Router } from "@angular/router";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\nimport { NAVAI_ENV } from "./navai-env";\n\n@Injectable({ providedIn: "root" })\nexport class NavaiVoiceService {\n  private readonly router = inject(Router);\n  private readonly backendClient = createNavaiBackendClient({ apiBaseUrl: NAVAI_ENV.NAVAI_API_URL });\n  private session: RealtimeSession | null = null;\n\n  readonly isConnected = signal(false);\n  readonly isConnecting = signal(false);\n  readonly error = signal<string | null>(null);\n\n  async start() {\n    if (this.session || this.isConnecting()) {\n      return;\n    }\n\n    this.isConnecting.set(true);\n    this.error.set(null);\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await this.backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await this.backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate: (path) => void this.router.navigateByUrl(path),\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: this.backendClient.executeFunction,\n      });\n\n      this.session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await this.session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await this.session.connect({ apiKey: secret.value });\n      }\n\n      this.isConnected.set(true);\n    } catch (startError) {\n      console.error(startError);\n      this.error.set("NAVAI could not start.");\n      this.session?.close();\n      this.session = null;\n      this.isConnected.set(false);\n    } finally {\n      this.isConnecting.set(false);\n    }\n  }\n\n  stop() {\n    this.session?.close();\n    this.session = null;\n    this.isConnected.set(false);\n  }\n}',
          },
          {
            label: "src/app/app.ts",
            language: "ts",
            code: 'import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, type EffectRef } from "@angular/core";\nimport { RouterOutlet } from "@angular/router";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\n\nimport { NavaiVoiceService } from "./navai-voice.service";\n\n@Component({\n  selector: "app-root",\n  standalone: true,\n  imports: [RouterOutlet],\n  templateUrl: "./app.html",\n  styles: [`\n    :host {\n      display: block;\n      min-height: 100vh;\n      padding: 32px;\n      color: #e2e8f0;\n      background:\n        radial-gradient(circle at top, rgba(14, 165, 233, 0.2), transparent 30%),\n        linear-gradient(180deg, #081120 0%, #030712 100%);\n      font-family: Inter, "Segoe UI", sans-serif;\n    }\n\n    .voice-shell {\n      display: grid;\n      gap: 18px;\n      width: min(420px, 100%);\n      border-radius: 28px;\n      border: 1px solid rgba(148, 163, 184, 0.16);\n      background: rgba(5, 10, 24, 0.76);\n      padding: 24px;\n      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n      margin-bottom: 24px;\n    }\n\n    .voice-eyebrow {\n      display: inline-block;\n      margin-bottom: 10px;\n      color: #7dd3fc;\n      font-size: 0.82rem;\n      font-weight: 700;\n      letter-spacing: 0.16em;\n      text-transform: uppercase;\n    }\n\n    .status-banner {\n      margin: 0;\n      border-radius: 18px;\n      border: 1px solid rgba(125, 211, 252, 0.24);\n      padding: 14px 16px;\n      background: rgba(8, 47, 73, 0.42);\n      color: #e2e8f0;\n    }\n  `],\n})\nexport class App implements AfterViewInit, OnDestroy {\n  @ViewChild("orbHost", { static: true }) orbHost?: ElementRef<HTMLDivElement>;\n\n  readonly voice = inject(NavaiVoiceService);\n\n  private reactRoot: Root | null = null;\n  private orbEffect?: EffectRef;\n\n  ngAfterViewInit() {\n    if (!this.orbHost) {\n      return;\n    }\n\n    this.reactRoot = createRoot(this.orbHost.nativeElement);\n    this.renderOrb();\n\n    this.orbEffect = effect(() => {\n      this.voice.isConnected();\n      this.voice.isConnecting();\n      this.voice.error();\n      this.renderOrb();\n    });\n  }\n\n  ngOnDestroy() {\n    this.orbEffect?.destroy();\n    this.reactRoot?.unmount();\n    this.reactRoot = null;\n  }\n\n  private renderOrb() {\n    if (!this.reactRoot) {\n      return;\n    }\n\n    this.reactRoot.render(\n      createElement(NavaiVoiceOrbDock, {\n        agent: {\n          status: this.voice.error() ? "error" : this.voice.isConnecting() ? "connecting" : this.voice.isConnected() ? "connected" : "idle",\n          agentVoiceState: "idle",\n          error: this.voice.error(),\n          isConnecting: this.voice.isConnecting(),\n          isConnected: this.voice.isConnected(),\n          isAgentSpeaking: false,\n          start: () => this.voice.start(),\n          stop: () => this.voice.stop(),\n        },\n        placement: "bottom-right",\n        themeMode: "dark",\n        showStatus: false,\n        backgroundColorLight: "#f8fafc",\n        backgroundColorDark: "#050816",\n      })\n    );\n  }\n}',
          },
          {
            label: "src/app/app.html",
            language: "html",
            code: '<section class="voice-shell">\n  <div>\n    <span class="voice-eyebrow">Angular + NAVAI</span>\n    <h2>Mount the NAVAI Orb inside the root shell.</h2>\n    <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n  </div>\n\n  <div #orbHost></div>\n  <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n</section>\n\n<router-outlet />',
          },
          {
            label: "src/app/app.routes.ts",
            language: "ts",
            code: 'import { Routes } from "@angular/router";\n\nimport { BillingPage } from "./billing-page";\nimport { HomePage } from "./home-page";\n\nexport const routes: Routes = [\n  {\n    path: "",\n    component: HomePage,\n  },\n  {\n    path: "billing",\n    component: BillingPage,\n  },\n];',
          },
          {
            label: "src/app/home-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Home</h1>\n      <p>Ask NAVAI to open Billing.</p>\n    </section>\n  `,\n})\nexport class HomePage {}',
          },
          {
            label: "src/app/billing-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Billing</h1>\n      <p data-navai-status>Billing page ready for NAVAI.</p>\n    </section>\n  `,\n})\nexport class BillingPage {}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Passo 7 Testar a integracao web",
        description:
          "Regenere loaders, desative Angular analytics uma vez, rode `npx ng serve` e valide navegacao, funcao local e fallback para backend.",
        bullets: [
          "Se a sessao reconectar a cada navegacao, confira se o servico continua em `providedIn: root`.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "ng-serve.sh",
            language: "bash",
            code: "npx ng analytics disable\nnpx ng serve",
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
    value: "angular",
    label: "Angular",
    title: "Angular",
    description:
      "由 singleton service 管理 NAVAI session 和 router navigation 的 Angular app。",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "步骤 1 创建 Web 项目",
        description:
          "创建启用 routing 的 Angular app，准备 `src/ai`，并添加一个 dedicated service 来编排 voice flow。",
        bullets: [
          "保持 service 为 singleton，避免 navigation 销毁 active session。",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npx @angular/cli@latest new navai-web-demo --routing --style=scss --package-manager npm --skip-git --skip-install --defaults\ncd navai-web-demo\nnpm install\nnpx ng analytics disable\nmkdir -p src/ai/functions-modules src/app",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "步骤 2 安装依赖",
        description:
          "安装 service 需要消费的 NAVAI packages。Angular 已经提供 router 与 dependency injection。",
        bullets: [
          "缺少的不是 routing，而是 voice runtime 和 backend bridge。",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0\nnpm install -D @types/react @types/react-dom",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "步骤 3 配置 Env 与 loaders",
        description:
          "保留一个给 loader CLI 使用的 `.env`，以及一个给 browser runtime values 使用的 `navai-env.ts` 文件。",
        bullets: [
          "Angular 不会直接把 `.env` 暴露到 browser，因此要分离 build config 与 runtime config。",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "NAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "src/app/navai-env.ts",
            language: "ts",
            code: 'export const NAVAI_ENV = {\n  NAVAI_API_URL: "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n} as const;',
          },
        ],
      },
      {
        id: "paso-4-definir-rutas-navegables-web",
        title: "步骤 4 定义可导航 routes",
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
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset["navaiState"] = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "步骤 6 集成 Web runtime",
        description:
          "在 service 中注入 `Router`，用 imperative 方式构建 agent，并把 root template 绑定到 service signals。",
        bullets: [
          "从 service 调用 `start()`，让 session lifecycle 脱离短生命周期 components。",
        ],
        codeBlocks: [
          {
            label: "src/app/navai-voice.service.ts",
            language: "ts",
            code: 'import { Injectable, inject, signal } from "@angular/core";\nimport { Router } from "@angular/router";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\nimport { NAVAI_ENV } from "./navai-env";\n\n@Injectable({ providedIn: "root" })\nexport class NavaiVoiceService {\n  private readonly router = inject(Router);\n  private readonly backendClient = createNavaiBackendClient({ apiBaseUrl: NAVAI_ENV.NAVAI_API_URL });\n  private session: RealtimeSession | null = null;\n\n  readonly isConnected = signal(false);\n  readonly isConnecting = signal(false);\n  readonly error = signal<string | null>(null);\n\n  async start() {\n    if (this.session || this.isConnecting()) {\n      return;\n    }\n\n    this.isConnecting.set(true);\n    this.error.set(null);\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await this.backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await this.backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate: (path) => void this.router.navigateByUrl(path),\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: this.backendClient.executeFunction,\n      });\n\n      this.session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await this.session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await this.session.connect({ apiKey: secret.value });\n      }\n\n      this.isConnected.set(true);\n    } catch (startError) {\n      console.error(startError);\n      this.error.set("NAVAI could not start.");\n      this.session?.close();\n      this.session = null;\n      this.isConnected.set(false);\n    } finally {\n      this.isConnecting.set(false);\n    }\n  }\n\n  stop() {\n    this.session?.close();\n    this.session = null;\n    this.isConnected.set(false);\n  }\n}',
          },
          {
            label: "src/app/app.ts",
            language: "ts",
            code: 'import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, type EffectRef } from "@angular/core";\nimport { RouterOutlet } from "@angular/router";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\n\nimport { NavaiVoiceService } from "./navai-voice.service";\n\n@Component({\n  selector: "app-root",\n  standalone: true,\n  imports: [RouterOutlet],\n  templateUrl: "./app.html",\n  styles: [`\n    :host {\n      display: block;\n      min-height: 100vh;\n      padding: 32px;\n      color: #e2e8f0;\n      background:\n        radial-gradient(circle at top, rgba(14, 165, 233, 0.2), transparent 30%),\n        linear-gradient(180deg, #081120 0%, #030712 100%);\n      font-family: Inter, "Segoe UI", sans-serif;\n    }\n\n    .voice-shell {\n      display: grid;\n      gap: 18px;\n      width: min(420px, 100%);\n      border-radius: 28px;\n      border: 1px solid rgba(148, 163, 184, 0.16);\n      background: rgba(5, 10, 24, 0.76);\n      padding: 24px;\n      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n      margin-bottom: 24px;\n    }\n\n    .voice-eyebrow {\n      display: inline-block;\n      margin-bottom: 10px;\n      color: #7dd3fc;\n      font-size: 0.82rem;\n      font-weight: 700;\n      letter-spacing: 0.16em;\n      text-transform: uppercase;\n    }\n\n    .status-banner {\n      margin: 0;\n      border-radius: 18px;\n      border: 1px solid rgba(125, 211, 252, 0.24);\n      padding: 14px 16px;\n      background: rgba(8, 47, 73, 0.42);\n      color: #e2e8f0;\n    }\n  `],\n})\nexport class App implements AfterViewInit, OnDestroy {\n  @ViewChild("orbHost", { static: true }) orbHost?: ElementRef<HTMLDivElement>;\n\n  readonly voice = inject(NavaiVoiceService);\n\n  private reactRoot: Root | null = null;\n  private orbEffect?: EffectRef;\n\n  ngAfterViewInit() {\n    if (!this.orbHost) {\n      return;\n    }\n\n    this.reactRoot = createRoot(this.orbHost.nativeElement);\n    this.renderOrb();\n\n    this.orbEffect = effect(() => {\n      this.voice.isConnected();\n      this.voice.isConnecting();\n      this.voice.error();\n      this.renderOrb();\n    });\n  }\n\n  ngOnDestroy() {\n    this.orbEffect?.destroy();\n    this.reactRoot?.unmount();\n    this.reactRoot = null;\n  }\n\n  private renderOrb() {\n    if (!this.reactRoot) {\n      return;\n    }\n\n    this.reactRoot.render(\n      createElement(NavaiVoiceOrbDock, {\n        agent: {\n          status: this.voice.error() ? "error" : this.voice.isConnecting() ? "connecting" : this.voice.isConnected() ? "connected" : "idle",\n          agentVoiceState: "idle",\n          error: this.voice.error(),\n          isConnecting: this.voice.isConnecting(),\n          isConnected: this.voice.isConnected(),\n          isAgentSpeaking: false,\n          start: () => this.voice.start(),\n          stop: () => this.voice.stop(),\n        },\n        placement: "bottom-right",\n        themeMode: "dark",\n        showStatus: false,\n        backgroundColorLight: "#f8fafc",\n        backgroundColorDark: "#050816",\n      })\n    );\n  }\n}',
          },
          {
            label: "src/app/app.html",
            language: "html",
            code: '<section class="voice-shell">\n  <div>\n    <span class="voice-eyebrow">Angular + NAVAI</span>\n    <h2>Mount the NAVAI Orb inside the root shell.</h2>\n    <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n  </div>\n\n  <div #orbHost></div>\n  <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n</section>\n\n<router-outlet />',
          },
          {
            label: "src/app/app.routes.ts",
            language: "ts",
            code: 'import { Routes } from "@angular/router";\n\nimport { BillingPage } from "./billing-page";\nimport { HomePage } from "./home-page";\n\nexport const routes: Routes = [\n  {\n    path: "",\n    component: HomePage,\n  },\n  {\n    path: "billing",\n    component: BillingPage,\n  },\n];',
          },
          {
            label: "src/app/home-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Home</h1>\n      <p>Ask NAVAI to open Billing.</p>\n    </section>\n  `,\n})\nexport class HomePage {}',
          },
          {
            label: "src/app/billing-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Billing</h1>\n      <p data-navai-status>Billing page ready for NAVAI.</p>\n    </section>\n  `,\n})\nexport class BillingPage {}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "步骤 7 测试 Web integration",
        description:
          "Chongxin shengcheng loaders, xian jinyong yi ci Angular analytics, zai zhixing `npx ng serve`, bing yanzheng navigation, local function execution yu backend fallback.",
        bullets: [
          "如果每次 navigation 都会 reconnect，请确认 service 仍然是 `providedIn: root`。",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "ng-serve.sh",
            language: "bash",
            code: "npx ng analytics disable\nnpx ng serve",
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
    value: "angular",
    label: "Angular",
    title: "Angular",
    description:
      "Singleton service が NAVAI session と router navigation を管理する Angular app です。",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "ステップ 1 Web プロジェクトを作成",
        description:
          "Routing を有効にした Angular app を作成し、`src/ai` と voice orchestration 用の dedicated service を準備します。",
        bullets: [
          "Service は singleton にして、navigation で active session が壊れないようにします。",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npx @angular/cli@latest new navai-web-demo --routing --style=scss --package-manager npm --skip-git --skip-install --defaults\ncd navai-web-demo\nnpm install\nnpx ng analytics disable\nmkdir -p src/ai/functions-modules src/app",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "ステップ 2 依存関係をインストール",
        description:
          "Service が使う NAVAI packages を install します。Angular は router と dependency injection を既に提供しています。",
        bullets: [
          "不足しているのは routing ではなく、voice runtime と backend bridge です。",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0\nnpm install -D @types/react @types/react-dom",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "ステップ 3 Env と loaders を設定",
        description:
          "Loader CLI 用に `.env` を、browser runtime values 用に `navai-env.ts` を用意します。",
        bullets: [
          "Angular は `.env` を browser に直接公開しないため、build config と runtime config を分けてください。",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "NAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "src/app/navai-env.ts",
            language: "ts",
            code: 'export const NAVAI_ENV = {\n  NAVAI_API_URL: "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n} as const;',
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
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset["navaiState"] = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "ステップ 6 Web runtime を統合",
        description:
          "Service に `Router` を inject し、agent を imperative に構築して、root template を service signals に bind します。",
        bullets: [
          "`start()` は service から呼び出し、session lifecycle を短命な components の外に置いてください。",
        ],
        codeBlocks: [
          {
            label: "src/app/navai-voice.service.ts",
            language: "ts",
            code: 'import { Injectable, inject, signal } from "@angular/core";\nimport { Router } from "@angular/router";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\nimport { NAVAI_ENV } from "./navai-env";\n\n@Injectable({ providedIn: "root" })\nexport class NavaiVoiceService {\n  private readonly router = inject(Router);\n  private readonly backendClient = createNavaiBackendClient({ apiBaseUrl: NAVAI_ENV.NAVAI_API_URL });\n  private session: RealtimeSession | null = null;\n\n  readonly isConnected = signal(false);\n  readonly isConnecting = signal(false);\n  readonly error = signal<string | null>(null);\n\n  async start() {\n    if (this.session || this.isConnecting()) {\n      return;\n    }\n\n    this.isConnecting.set(true);\n    this.error.set(null);\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await this.backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await this.backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate: (path) => void this.router.navigateByUrl(path),\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: this.backendClient.executeFunction,\n      });\n\n      this.session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await this.session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await this.session.connect({ apiKey: secret.value });\n      }\n\n      this.isConnected.set(true);\n    } catch (startError) {\n      console.error(startError);\n      this.error.set("NAVAI could not start.");\n      this.session?.close();\n      this.session = null;\n      this.isConnected.set(false);\n    } finally {\n      this.isConnecting.set(false);\n    }\n  }\n\n  stop() {\n    this.session?.close();\n    this.session = null;\n    this.isConnected.set(false);\n  }\n}',
          },
          {
            label: "src/app/app.ts",
            language: "ts",
            code: 'import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, type EffectRef } from "@angular/core";\nimport { RouterOutlet } from "@angular/router";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\n\nimport { NavaiVoiceService } from "./navai-voice.service";\n\n@Component({\n  selector: "app-root",\n  standalone: true,\n  imports: [RouterOutlet],\n  templateUrl: "./app.html",\n  styles: [`\n    :host {\n      display: block;\n      min-height: 100vh;\n      padding: 32px;\n      color: #e2e8f0;\n      background:\n        radial-gradient(circle at top, rgba(14, 165, 233, 0.2), transparent 30%),\n        linear-gradient(180deg, #081120 0%, #030712 100%);\n      font-family: Inter, "Segoe UI", sans-serif;\n    }\n\n    .voice-shell {\n      display: grid;\n      gap: 18px;\n      width: min(420px, 100%);\n      border-radius: 28px;\n      border: 1px solid rgba(148, 163, 184, 0.16);\n      background: rgba(5, 10, 24, 0.76);\n      padding: 24px;\n      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n      margin-bottom: 24px;\n    }\n\n    .voice-eyebrow {\n      display: inline-block;\n      margin-bottom: 10px;\n      color: #7dd3fc;\n      font-size: 0.82rem;\n      font-weight: 700;\n      letter-spacing: 0.16em;\n      text-transform: uppercase;\n    }\n\n    .status-banner {\n      margin: 0;\n      border-radius: 18px;\n      border: 1px solid rgba(125, 211, 252, 0.24);\n      padding: 14px 16px;\n      background: rgba(8, 47, 73, 0.42);\n      color: #e2e8f0;\n    }\n  `],\n})\nexport class App implements AfterViewInit, OnDestroy {\n  @ViewChild("orbHost", { static: true }) orbHost?: ElementRef<HTMLDivElement>;\n\n  readonly voice = inject(NavaiVoiceService);\n\n  private reactRoot: Root | null = null;\n  private orbEffect?: EffectRef;\n\n  ngAfterViewInit() {\n    if (!this.orbHost) {\n      return;\n    }\n\n    this.reactRoot = createRoot(this.orbHost.nativeElement);\n    this.renderOrb();\n\n    this.orbEffect = effect(() => {\n      this.voice.isConnected();\n      this.voice.isConnecting();\n      this.voice.error();\n      this.renderOrb();\n    });\n  }\n\n  ngOnDestroy() {\n    this.orbEffect?.destroy();\n    this.reactRoot?.unmount();\n    this.reactRoot = null;\n  }\n\n  private renderOrb() {\n    if (!this.reactRoot) {\n      return;\n    }\n\n    this.reactRoot.render(\n      createElement(NavaiVoiceOrbDock, {\n        agent: {\n          status: this.voice.error() ? "error" : this.voice.isConnecting() ? "connecting" : this.voice.isConnected() ? "connected" : "idle",\n          agentVoiceState: "idle",\n          error: this.voice.error(),\n          isConnecting: this.voice.isConnecting(),\n          isConnected: this.voice.isConnected(),\n          isAgentSpeaking: false,\n          start: () => this.voice.start(),\n          stop: () => this.voice.stop(),\n        },\n        placement: "bottom-right",\n        themeMode: "dark",\n        showStatus: false,\n        backgroundColorLight: "#f8fafc",\n        backgroundColorDark: "#050816",\n      })\n    );\n  }\n}',
          },
          {
            label: "src/app/app.html",
            language: "html",
            code: '<section class="voice-shell">\n  <div>\n    <span class="voice-eyebrow">Angular + NAVAI</span>\n    <h2>Mount the NAVAI Orb inside the root shell.</h2>\n    <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n  </div>\n\n  <div #orbHost></div>\n  <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n</section>\n\n<router-outlet />',
          },
          {
            label: "src/app/app.routes.ts",
            language: "ts",
            code: 'import { Routes } from "@angular/router";\n\nimport { BillingPage } from "./billing-page";\nimport { HomePage } from "./home-page";\n\nexport const routes: Routes = [\n  {\n    path: "",\n    component: HomePage,\n  },\n  {\n    path: "billing",\n    component: BillingPage,\n  },\n];',
          },
          {
            label: "src/app/home-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Home</h1>\n      <p>Ask NAVAI to open Billing.</p>\n    </section>\n  `,\n})\nexport class HomePage {}',
          },
          {
            label: "src/app/billing-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Billing</h1>\n      <p data-navai-status>Billing page ready for NAVAI.</p>\n    </section>\n  `,\n})\nexport class BillingPage {}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "ステップ 7 Web integration をテスト",
        description:
          "Loaders o saiseisei shi, Angular analytics o ichido mukoka shite kara `npx ng serve` o jikko shi, navigation, local function, backend fallback o kakunin shimasu.",
        bullets: [
          "Navigation のたびに reconnect するなら、service が `providedIn: root` のままか確認してください。",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "ng-serve.sh",
            language: "bash",
            code: "npx ng analytics disable\nnpx ng serve",
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
    value: "angular",
    label: "Angular",
    title: "Angular",
    description:
      "Angular app, где singleton service владеет session NAVAI и router navigation.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "Шаг 1 Создать web-проект",
        description:
          "Создайте Angular app с включенным routing, подготовьте `src/ai` и dedicated service для voice orchestration.",
        bullets: [
          "Оставляйте service singleton, чтобы navigation не разрушала активную session.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npx @angular/cli@latest new navai-web-demo --routing --style=scss --package-manager npm --skip-git --skip-install --defaults\ncd navai-web-demo\nnpm install\nnpx ng analytics disable\nmkdir -p src/ai/functions-modules src/app",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "Шаг 2 Установить зависимости",
        description:
          "Установите packages NAVAI, которые будет использовать service. Router и dependency injection Angular уже предоставляет.",
        bullets: [
          "Не хватает не routing, а voice runtime и backend bridge.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0\nnpm install -D @types/react @types/react-dom",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "Шаг 3 Настроить env и loaders",
        description:
          "Держите `.env` для loader CLI и файл `navai-env.ts` для runtime values, которые использует browser code.",
        bullets: [
          "Angular не публикует `.env` напрямую в browser, поэтому разделяйте build config и runtime config.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "NAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "src/app/navai-env.ts",
            language: "ts",
            code: 'export const NAVAI_ENV = {\n  NAVAI_API_URL: "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n} as const;',
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
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset["navaiState"] = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "Шаг 6 Интегрировать web runtime",
        description:
          "Внедрите `Router` в service, соберите agent imperative-способом и свяжите root template с signals сервиса.",
        bullets: [
          "Вызывайте `start()` из service, чтобы lifecycle session не зависел от краткоживущих components.",
        ],
        codeBlocks: [
          {
            label: "src/app/navai-voice.service.ts",
            language: "ts",
            code: 'import { Injectable, inject, signal } from "@angular/core";\nimport { Router } from "@angular/router";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\nimport { NAVAI_ENV } from "./navai-env";\n\n@Injectable({ providedIn: "root" })\nexport class NavaiVoiceService {\n  private readonly router = inject(Router);\n  private readonly backendClient = createNavaiBackendClient({ apiBaseUrl: NAVAI_ENV.NAVAI_API_URL });\n  private session: RealtimeSession | null = null;\n\n  readonly isConnected = signal(false);\n  readonly isConnecting = signal(false);\n  readonly error = signal<string | null>(null);\n\n  async start() {\n    if (this.session || this.isConnecting()) {\n      return;\n    }\n\n    this.isConnecting.set(true);\n    this.error.set(null);\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await this.backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await this.backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate: (path) => void this.router.navigateByUrl(path),\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: this.backendClient.executeFunction,\n      });\n\n      this.session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await this.session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await this.session.connect({ apiKey: secret.value });\n      }\n\n      this.isConnected.set(true);\n    } catch (startError) {\n      console.error(startError);\n      this.error.set("NAVAI could not start.");\n      this.session?.close();\n      this.session = null;\n      this.isConnected.set(false);\n    } finally {\n      this.isConnecting.set(false);\n    }\n  }\n\n  stop() {\n    this.session?.close();\n    this.session = null;\n    this.isConnected.set(false);\n  }\n}',
          },
          {
            label: "src/app/app.ts",
            language: "ts",
            code: 'import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, type EffectRef } from "@angular/core";\nimport { RouterOutlet } from "@angular/router";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\n\nimport { NavaiVoiceService } from "./navai-voice.service";\n\n@Component({\n  selector: "app-root",\n  standalone: true,\n  imports: [RouterOutlet],\n  templateUrl: "./app.html",\n  styles: [`\n    :host {\n      display: block;\n      min-height: 100vh;\n      padding: 32px;\n      color: #e2e8f0;\n      background:\n        radial-gradient(circle at top, rgba(14, 165, 233, 0.2), transparent 30%),\n        linear-gradient(180deg, #081120 0%, #030712 100%);\n      font-family: Inter, "Segoe UI", sans-serif;\n    }\n\n    .voice-shell {\n      display: grid;\n      gap: 18px;\n      width: min(420px, 100%);\n      border-radius: 28px;\n      border: 1px solid rgba(148, 163, 184, 0.16);\n      background: rgba(5, 10, 24, 0.76);\n      padding: 24px;\n      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n      margin-bottom: 24px;\n    }\n\n    .voice-eyebrow {\n      display: inline-block;\n      margin-bottom: 10px;\n      color: #7dd3fc;\n      font-size: 0.82rem;\n      font-weight: 700;\n      letter-spacing: 0.16em;\n      text-transform: uppercase;\n    }\n\n    .status-banner {\n      margin: 0;\n      border-radius: 18px;\n      border: 1px solid rgba(125, 211, 252, 0.24);\n      padding: 14px 16px;\n      background: rgba(8, 47, 73, 0.42);\n      color: #e2e8f0;\n    }\n  `],\n})\nexport class App implements AfterViewInit, OnDestroy {\n  @ViewChild("orbHost", { static: true }) orbHost?: ElementRef<HTMLDivElement>;\n\n  readonly voice = inject(NavaiVoiceService);\n\n  private reactRoot: Root | null = null;\n  private orbEffect?: EffectRef;\n\n  ngAfterViewInit() {\n    if (!this.orbHost) {\n      return;\n    }\n\n    this.reactRoot = createRoot(this.orbHost.nativeElement);\n    this.renderOrb();\n\n    this.orbEffect = effect(() => {\n      this.voice.isConnected();\n      this.voice.isConnecting();\n      this.voice.error();\n      this.renderOrb();\n    });\n  }\n\n  ngOnDestroy() {\n    this.orbEffect?.destroy();\n    this.reactRoot?.unmount();\n    this.reactRoot = null;\n  }\n\n  private renderOrb() {\n    if (!this.reactRoot) {\n      return;\n    }\n\n    this.reactRoot.render(\n      createElement(NavaiVoiceOrbDock, {\n        agent: {\n          status: this.voice.error() ? "error" : this.voice.isConnecting() ? "connecting" : this.voice.isConnected() ? "connected" : "idle",\n          agentVoiceState: "idle",\n          error: this.voice.error(),\n          isConnecting: this.voice.isConnecting(),\n          isConnected: this.voice.isConnected(),\n          isAgentSpeaking: false,\n          start: () => this.voice.start(),\n          stop: () => this.voice.stop(),\n        },\n        placement: "bottom-right",\n        themeMode: "dark",\n        showStatus: false,\n        backgroundColorLight: "#f8fafc",\n        backgroundColorDark: "#050816",\n      })\n    );\n  }\n}',
          },
          {
            label: "src/app/app.html",
            language: "html",
            code: '<section class="voice-shell">\n  <div>\n    <span class="voice-eyebrow">Angular + NAVAI</span>\n    <h2>Mount the NAVAI Orb inside the root shell.</h2>\n    <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n  </div>\n\n  <div #orbHost></div>\n  <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n</section>\n\n<router-outlet />',
          },
          {
            label: "src/app/app.routes.ts",
            language: "ts",
            code: 'import { Routes } from "@angular/router";\n\nimport { BillingPage } from "./billing-page";\nimport { HomePage } from "./home-page";\n\nexport const routes: Routes = [\n  {\n    path: "",\n    component: HomePage,\n  },\n  {\n    path: "billing",\n    component: BillingPage,\n  },\n];',
          },
          {
            label: "src/app/home-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Home</h1>\n      <p>Ask NAVAI to open Billing.</p>\n    </section>\n  `,\n})\nexport class HomePage {}',
          },
          {
            label: "src/app/billing-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Billing</h1>\n      <p data-navai-status>Billing page ready for NAVAI.</p>\n    </section>\n  `,\n})\nexport class BillingPage {}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "Шаг 7 Проверить web integration",
        description:
          "Peregeneriruyte loaders, odin raz otklyuchite Angular analytics, zapustite `npx ng serve` i proverte navigation, local function execution i backend fallback.",
        bullets: [
          "Если session переподключается при каждой navigation, проверьте, что service все еще в `providedIn: root`.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "ng-serve.sh",
            language: "bash",
            code: "npx ng analytics disable\nnpx ng serve",
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
    value: "angular",
    label: "Angular",
    title: "Angular",
    description:
      "Singleton service 가 NAVAI session 과 router navigation 을 관리하는 Angular app 입니다.",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "1단계 Web 프로젝트 생성",
        description:
          "Routing enabled Angular app 을 만들고 `src/ai` 와 voice orchestration 용 dedicated service 를 준비하세요.",
        bullets: [
          "Service 를 singleton 으로 유지해 navigation 이 active session 을 파괴하지 않게 하세요.",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npx @angular/cli@latest new navai-web-demo --routing --style=scss --package-manager npm --skip-git --skip-install --defaults\ncd navai-web-demo\nnpm install\nnpx ng analytics disable\nmkdir -p src/ai/functions-modules src/app",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "2단계 Dependencies 설치",
        description:
          "Service 가 사용할 NAVAI packages 를 설치하세요. Angular 는 router 와 dependency injection 을 이미 제공합니다.",
        bullets: [
          "부족한 부분은 routing 이 아니라 voice runtime 과 backend bridge 입니다.",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0\nnpm install -D @types/react @types/react-dom",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "3단계 Env 와 loaders 설정",
        description:
          "Loader CLI 용 `.env` 와 browser runtime values 용 `navai-env.ts` file 을 각각 유지하세요.",
        bullets: [
          "Angular 는 `.env` 를 browser 에 직접 노출하지 않으므로 build config 와 runtime config 를 분리해야 합니다.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "NAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "src/app/navai-env.ts",
            language: "ts",
            code: 'export const NAVAI_ENV = {\n  NAVAI_API_URL: "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n} as const;',
          },
        ],
      },
      {
        id: "paso-4-definir-rutas-navegables-web",
        title: "4단계 내비게이션 라우트 정의",
        description:
          "자연어에서 navigation 을 해석할 수 있도록 names, paths, business synonyms 를 포함한 `NavaiRoute[]` array 를 선언하세요.",
        bullets: [
          "Voice 로 열어도 되는 stable 한 routes 만 공개하세요.",
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
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset["navaiState"] = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "6단계 Web runtime 통합",
        description:
          "Service 에 `Router` 를 inject 하고 agent 를 imperative 하게 구성한 뒤 root template 를 service signals 에 bind 하세요.",
        bullets: [
          "`start()` 는 service 에서 호출해 session lifecycle 을 short-lived components 밖에 두세요.",
        ],
        codeBlocks: [
          {
            label: "src/app/navai-voice.service.ts",
            language: "ts",
            code: 'import { Injectable, inject, signal } from "@angular/core";\nimport { Router } from "@angular/router";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\nimport { NAVAI_ENV } from "./navai-env";\n\n@Injectable({ providedIn: "root" })\nexport class NavaiVoiceService {\n  private readonly router = inject(Router);\n  private readonly backendClient = createNavaiBackendClient({ apiBaseUrl: NAVAI_ENV.NAVAI_API_URL });\n  private session: RealtimeSession | null = null;\n\n  readonly isConnected = signal(false);\n  readonly isConnecting = signal(false);\n  readonly error = signal<string | null>(null);\n\n  async start() {\n    if (this.session || this.isConnecting()) {\n      return;\n    }\n\n    this.isConnecting.set(true);\n    this.error.set(null);\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await this.backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await this.backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate: (path) => void this.router.navigateByUrl(path),\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: this.backendClient.executeFunction,\n      });\n\n      this.session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await this.session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await this.session.connect({ apiKey: secret.value });\n      }\n\n      this.isConnected.set(true);\n    } catch (startError) {\n      console.error(startError);\n      this.error.set("NAVAI could not start.");\n      this.session?.close();\n      this.session = null;\n      this.isConnected.set(false);\n    } finally {\n      this.isConnecting.set(false);\n    }\n  }\n\n  stop() {\n    this.session?.close();\n    this.session = null;\n    this.isConnected.set(false);\n  }\n}',
          },
          {
            label: "src/app/app.ts",
            language: "ts",
            code: 'import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, type EffectRef } from "@angular/core";\nimport { RouterOutlet } from "@angular/router";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\n\nimport { NavaiVoiceService } from "./navai-voice.service";\n\n@Component({\n  selector: "app-root",\n  standalone: true,\n  imports: [RouterOutlet],\n  templateUrl: "./app.html",\n  styles: [`\n    :host {\n      display: block;\n      min-height: 100vh;\n      padding: 32px;\n      color: #e2e8f0;\n      background:\n        radial-gradient(circle at top, rgba(14, 165, 233, 0.2), transparent 30%),\n        linear-gradient(180deg, #081120 0%, #030712 100%);\n      font-family: Inter, "Segoe UI", sans-serif;\n    }\n\n    .voice-shell {\n      display: grid;\n      gap: 18px;\n      width: min(420px, 100%);\n      border-radius: 28px;\n      border: 1px solid rgba(148, 163, 184, 0.16);\n      background: rgba(5, 10, 24, 0.76);\n      padding: 24px;\n      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n      margin-bottom: 24px;\n    }\n\n    .voice-eyebrow {\n      display: inline-block;\n      margin-bottom: 10px;\n      color: #7dd3fc;\n      font-size: 0.82rem;\n      font-weight: 700;\n      letter-spacing: 0.16em;\n      text-transform: uppercase;\n    }\n\n    .status-banner {\n      margin: 0;\n      border-radius: 18px;\n      border: 1px solid rgba(125, 211, 252, 0.24);\n      padding: 14px 16px;\n      background: rgba(8, 47, 73, 0.42);\n      color: #e2e8f0;\n    }\n  `],\n})\nexport class App implements AfterViewInit, OnDestroy {\n  @ViewChild("orbHost", { static: true }) orbHost?: ElementRef<HTMLDivElement>;\n\n  readonly voice = inject(NavaiVoiceService);\n\n  private reactRoot: Root | null = null;\n  private orbEffect?: EffectRef;\n\n  ngAfterViewInit() {\n    if (!this.orbHost) {\n      return;\n    }\n\n    this.reactRoot = createRoot(this.orbHost.nativeElement);\n    this.renderOrb();\n\n    this.orbEffect = effect(() => {\n      this.voice.isConnected();\n      this.voice.isConnecting();\n      this.voice.error();\n      this.renderOrb();\n    });\n  }\n\n  ngOnDestroy() {\n    this.orbEffect?.destroy();\n    this.reactRoot?.unmount();\n    this.reactRoot = null;\n  }\n\n  private renderOrb() {\n    if (!this.reactRoot) {\n      return;\n    }\n\n    this.reactRoot.render(\n      createElement(NavaiVoiceOrbDock, {\n        agent: {\n          status: this.voice.error() ? "error" : this.voice.isConnecting() ? "connecting" : this.voice.isConnected() ? "connected" : "idle",\n          agentVoiceState: "idle",\n          error: this.voice.error(),\n          isConnecting: this.voice.isConnecting(),\n          isConnected: this.voice.isConnected(),\n          isAgentSpeaking: false,\n          start: () => this.voice.start(),\n          stop: () => this.voice.stop(),\n        },\n        placement: "bottom-right",\n        themeMode: "dark",\n        showStatus: false,\n        backgroundColorLight: "#f8fafc",\n        backgroundColorDark: "#050816",\n      })\n    );\n  }\n}',
          },
          {
            label: "src/app/app.html",
            language: "html",
            code: '<section class="voice-shell">\n  <div>\n    <span class="voice-eyebrow">Angular + NAVAI</span>\n    <h2>Mount the NAVAI Orb inside the root shell.</h2>\n    <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n  </div>\n\n  <div #orbHost></div>\n  <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n</section>\n\n<router-outlet />',
          },
          {
            label: "src/app/app.routes.ts",
            language: "ts",
            code: 'import { Routes } from "@angular/router";\n\nimport { BillingPage } from "./billing-page";\nimport { HomePage } from "./home-page";\n\nexport const routes: Routes = [\n  {\n    path: "",\n    component: HomePage,\n  },\n  {\n    path: "billing",\n    component: BillingPage,\n  },\n];',
          },
          {
            label: "src/app/home-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Home</h1>\n      <p>Ask NAVAI to open Billing.</p>\n    </section>\n  `,\n})\nexport class HomePage {}',
          },
          {
            label: "src/app/billing-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Billing</h1>\n      <p data-navai-status>Billing page ready for NAVAI.</p>\n    </section>\n  `,\n})\nexport class BillingPage {}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "7단계 Web integration 테스트",
        description:
          "Loaders reul dasi saengseonghago Angular analytics reul han beon bihwalseonghwahan dwi `npx ng serve` reul silhaenghae navigation, local function, backend fallback eul geomjeunghaseyo.",
        bullets: [
          "Navigation 마다 reconnect 된다면 service 가 `providedIn: root` 에 남아 있는지 확인하세요.",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "ng-serve.sh",
            language: "bash",
            code: "npx ng analytics disable\nnpx ng serve",
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
    value: "angular",
    label: "Angular",
    title: "Angular",
    description:
      "Angular app जिसमें singleton service NAVAI session और router navigation को own करती है।",
    sections: [
      {
        id: "paso-1-crear-proyecto-web",
        title: "चरण 1 Web project बनाएं",
        description:
          "Routing enabled Angular app बनाएं और `src/ai` के साथ voice orchestration के लिए dedicated service तैयार करें।",
        bullets: [
          "Service को singleton रखें ताकि navigation active session को destroy न करे।",
        ],
        codeBlocks: [
          {
            label: "setup.sh",
            language: "bash",
            code: "npx @angular/cli@latest new navai-web-demo --routing --style=scss --package-manager npm --skip-git --skip-install --defaults\ncd navai-web-demo\nnpm install\nnpx ng analytics disable\nmkdir -p src/ai/functions-modules src/app",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-web",
        title: "चरण 2 Dependencies install करें",
        description:
          "वे NAVAI packages install करें जिन्हें service consume करेगी। Router और DI Angular पहले से देता है।",
        bullets: [
          "Missing layer routing नहीं बल्कि voice runtime और backend bridge है।",
        ],
        codeBlocks: [
          {
            label: "install.sh",
            language: "bash",
            code: "npm install react react-dom @navai/voice-frontend @openai/agents@^0.4.14 zod@^4.0.0\nnpm install -D @types/react @types/react-dom",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables-y-loaders-web",
        title: "चरण 3 Env और loaders configure करें",
        description:
          "Loader CLI के लिए `.env` रखें और browser runtime values के लिए `navai-env.ts` file रखें।",
        bullets: [
          "Angular browser को `.env` सीधे expose नहीं करता, इसलिए build config और runtime config अलग रखें।",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "NAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "src/app/navai-env.ts",
            language: "ts",
            code: 'export const NAVAI_ENV = {\n  NAVAI_API_URL: "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n} as const;',
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
            code: 'const STATUS_SELECTOR = "[data-navai-status]";\n\nexport async function show_welcome_banner() {\n  const elements = Array.from(document.querySelectorAll<HTMLElement>(STATUS_SELECTOR));\n\n  if (elements.length === 0) {\n    return {\n      ok: false,\n      action: "show_welcome_banner",\n      message: "No status banner was found in the current screen.",\n    };\n  }\n\n  const nextMessage = "NAVAI ran show_welcome_banner locally.";\n\n  for (const element of elements) {\n    element.textContent = nextMessage;\n    element.dataset["navaiState"] = "success";\n    element.style.borderColor = "rgba(56, 189, 248, 0.45)";\n    element.style.background = "rgba(8, 47, 73, 0.72)";\n    element.style.color = "#f8fafc";\n  }\n\n  elements[0]?.scrollIntoView({ behavior: "smooth", block: "center" });\n\n  return {\n    ok: true,\n    action: "show_welcome_banner",\n    updated_elements: elements.length,\n    message: nextMessage,\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-web",
        title: "चरण 6 Web runtime integrate करें",
        description:
          "Service में `Router` inject करें, agent को imperative तरीके से build करें और root template को service signals से bind करें।",
        bullets: [
          "`start()` service से call करें ताकि session lifecycle short-lived components से बाहर रहे।",
        ],
        codeBlocks: [
          {
            label: "src/app/navai-voice.service.ts",
            language: "ts",
            code: 'import { Injectable, inject, signal } from "@angular/core";\nimport { Router } from "@angular/router";\nimport { RealtimeSession } from "@openai/agents/realtime";\nimport {\n  buildNavaiAgent,\n  createNavaiBackendClient,\n  resolveNavaiFrontendRuntimeConfig,\n} from "@navai/voice-frontend";\n\nimport { NAVAI_ROUTE_ITEMS } from "../ai/routes";\nimport { NAVAI_WEB_MODULE_LOADERS } from "../ai/generated-module-loaders";\nimport { NAVAI_ENV } from "./navai-env";\n\n@Injectable({ providedIn: "root" })\nexport class NavaiVoiceService {\n  private readonly router = inject(Router);\n  private readonly backendClient = createNavaiBackendClient({ apiBaseUrl: NAVAI_ENV.NAVAI_API_URL });\n  private session: RealtimeSession | null = null;\n\n  readonly isConnected = signal(false);\n  readonly isConnecting = signal(false);\n  readonly error = signal<string | null>(null);\n\n  async start() {\n    if (this.session || this.isConnecting()) {\n      return;\n    }\n\n    this.isConnecting.set(true);\n    this.error.set(null);\n\n    try {\n      const runtimeConfig = await resolveNavaiFrontendRuntimeConfig({\n        moduleLoaders: NAVAI_WEB_MODULE_LOADERS,\n        defaultRoutes: NAVAI_ROUTE_ITEMS,\n        env: NAVAI_ENV,\n      });\n      const requestPayload = runtimeConfig.modelOverride ? { model: runtimeConfig.modelOverride } : undefined;\n      const secret = await this.backendClient.createClientSecret(requestPayload);\n      const backendFunctions = await this.backendClient.listFunctions();\n      const { agent } = await buildNavaiAgent({\n        navigate: (path) => void this.router.navigateByUrl(path),\n        routes: runtimeConfig.routes,\n        functionModuleLoaders: runtimeConfig.functionModuleLoaders,\n        backendFunctions: backendFunctions.functions,\n        executeBackendFunction: this.backendClient.executeFunction,\n      });\n\n      this.session = new RealtimeSession(agent);\n      if (runtimeConfig.modelOverride) {\n        await this.session.connect({ apiKey: secret.value, model: runtimeConfig.modelOverride });\n      } else {\n        await this.session.connect({ apiKey: secret.value });\n      }\n\n      this.isConnected.set(true);\n    } catch (startError) {\n      console.error(startError);\n      this.error.set("NAVAI could not start.");\n      this.session?.close();\n      this.session = null;\n      this.isConnected.set(false);\n    } finally {\n      this.isConnecting.set(false);\n    }\n  }\n\n  stop() {\n    this.session?.close();\n    this.session = null;\n    this.isConnected.set(false);\n  }\n}',
          },
          {
            label: "src/app/app.ts",
            language: "ts",
            code: 'import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, type EffectRef } from "@angular/core";\nimport { RouterOutlet } from "@angular/router";\nimport { createElement } from "react";\nimport { createRoot, type Root } from "react-dom/client";\nimport { NavaiVoiceOrbDock } from "@navai/voice-frontend";\n\nimport { NavaiVoiceService } from "./navai-voice.service";\n\n@Component({\n  selector: "app-root",\n  standalone: true,\n  imports: [RouterOutlet],\n  templateUrl: "./app.html",\n  styles: [`\n    :host {\n      display: block;\n      min-height: 100vh;\n      padding: 32px;\n      color: #e2e8f0;\n      background:\n        radial-gradient(circle at top, rgba(14, 165, 233, 0.2), transparent 30%),\n        linear-gradient(180deg, #081120 0%, #030712 100%);\n      font-family: Inter, "Segoe UI", sans-serif;\n    }\n\n    .voice-shell {\n      display: grid;\n      gap: 18px;\n      width: min(420px, 100%);\n      border-radius: 28px;\n      border: 1px solid rgba(148, 163, 184, 0.16);\n      background: rgba(5, 10, 24, 0.76);\n      padding: 24px;\n      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.36);\n      margin-bottom: 24px;\n    }\n\n    .voice-eyebrow {\n      display: inline-block;\n      margin-bottom: 10px;\n      color: #7dd3fc;\n      font-size: 0.82rem;\n      font-weight: 700;\n      letter-spacing: 0.16em;\n      text-transform: uppercase;\n    }\n\n    .status-banner {\n      margin: 0;\n      border-radius: 18px;\n      border: 1px solid rgba(125, 211, 252, 0.24);\n      padding: 14px 16px;\n      background: rgba(8, 47, 73, 0.42);\n      color: #e2e8f0;\n    }\n  `],\n})\nexport class App implements AfterViewInit, OnDestroy {\n  @ViewChild("orbHost", { static: true }) orbHost?: ElementRef<HTMLDivElement>;\n\n  readonly voice = inject(NavaiVoiceService);\n\n  private reactRoot: Root | null = null;\n  private orbEffect?: EffectRef;\n\n  ngAfterViewInit() {\n    if (!this.orbHost) {\n      return;\n    }\n\n    this.reactRoot = createRoot(this.orbHost.nativeElement);\n    this.renderOrb();\n\n    this.orbEffect = effect(() => {\n      this.voice.isConnected();\n      this.voice.isConnecting();\n      this.voice.error();\n      this.renderOrb();\n    });\n  }\n\n  ngOnDestroy() {\n    this.orbEffect?.destroy();\n    this.reactRoot?.unmount();\n    this.reactRoot = null;\n  }\n\n  private renderOrb() {\n    if (!this.reactRoot) {\n      return;\n    }\n\n    this.reactRoot.render(\n      createElement(NavaiVoiceOrbDock, {\n        agent: {\n          status: this.voice.error() ? "error" : this.voice.isConnecting() ? "connecting" : this.voice.isConnected() ? "connected" : "idle",\n          agentVoiceState: "idle",\n          error: this.voice.error(),\n          isConnecting: this.voice.isConnecting(),\n          isConnected: this.voice.isConnected(),\n          isAgentSpeaking: false,\n          start: () => this.voice.start(),\n          stop: () => this.voice.stop(),\n        },\n        placement: "bottom-right",\n        themeMode: "dark",\n        showStatus: false,\n        backgroundColorLight: "#f8fafc",\n        backgroundColorDark: "#050816",\n      })\n    );\n  }\n}',
          },
          {
            label: "src/app/app.html",
            language: "html",
            code: '<section class="voice-shell">\n  <div>\n    <span class="voice-eyebrow">Angular + NAVAI</span>\n    <h2>Mount the NAVAI Orb inside the root shell.</h2>\n    <p>Start the session here, then ask NAVAI to open Billing or run show welcome banner.</p>\n  </div>\n\n  <div #orbHost></div>\n  <p class="status-banner" data-navai-status>Voice demo ready for local actions.</p>\n</section>\n\n<router-outlet />',
          },
          {
            label: "src/app/app.routes.ts",
            language: "ts",
            code: 'import { Routes } from "@angular/router";\n\nimport { BillingPage } from "./billing-page";\nimport { HomePage } from "./home-page";\n\nexport const routes: Routes = [\n  {\n    path: "",\n    component: HomePage,\n  },\n  {\n    path: "billing",\n    component: BillingPage,\n  },\n];',
          },
          {
            label: "src/app/home-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Home</h1>\n      <p>Ask NAVAI to open Billing.</p>\n    </section>\n  `,\n})\nexport class HomePage {}',
          },
          {
            label: "src/app/billing-page.ts",
            language: "ts",
            code: 'import { Component } from "@angular/core";\n\n@Component({\n  standalone: true,\n  template: `\n    <section class="page-shell">\n      <h1>Billing</h1>\n      <p data-navai-status>Billing page ready for NAVAI.</p>\n    </section>\n  `,\n})\nexport class BillingPage {}',
          },
        ],
      },
      {
        id: "paso-7-probar-integracion-web",
        title: "चरण 7 Web integration test करें",
        description:
          "Loaders regenerate karen, Angular analytics ek bar disable karen, phir `npx ng serve` chalayen aur navigation, local function execution tatha backend fallback validate karen.",
        bullets: [
          "अगर हर navigation पर session reconnect हो रही है तो जांचें कि service `providedIn: root` में ही है।",
        ],
        codeBlocks: [
          {
            label: "generate-loaders.sh",
            language: "bash",
            code: "npm exec navai-generate-web-loaders",
          },
          {
            label: "ng-serve.sh",
            language: "bash",
            code: "npx ng analytics disable\nnpx ng serve",
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

export function getWebAngularGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return withAngularSharedCode(
    getLocalizedInstallationGuideTab(WEB_ANGULAR_GUIDE_TABS, language),
  );
}
