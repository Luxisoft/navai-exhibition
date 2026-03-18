import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";

const MOBILE_EXPO_VOICE_NAVIGATOR_CODE = [
  'import { useEffect, useState } from "react";',
  'import { StyleSheet } from "react-native";',
  'import { useLinkTo } from "@react-navigation/native";',
  "import {",
  "  NavaiMobileVoiceOrbButton,",
  "  resolveNavaiMobileApplicationRuntimeConfig,",
  "  useMobileVoiceAgent,",
  "  type ResolveNavaiMobileApplicationRuntimeConfigResult,",
  '} from "@navai/voice-mobile";',
  "",
  'import { NAVAI_ROUTE_ITEMS } from "@/ai/routes";',
  'import { NAVAI_MOBILE_MODULE_LOADERS } from "@/ai/generated-module-loaders";',
  "",
  "const NAVAI_ENV = {",
  '  NAVAI_API_URL: process.env.EXPO_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",',
  '  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",',
  '  NAVAI_ROUTES_FILE: "src/ai/routes.ts",',
  "};",
  "",
  "export function VoiceNavigator() {",
  "  const linkTo = useLinkTo();",
  "  const [runtime, setRuntime] = useState<ResolveNavaiMobileApplicationRuntimeConfigResult | null>(null);",
  "  const [runtimeLoading, setRuntimeLoading] = useState(true);",
  '  const [runtimeError, setRuntimeError] = useState<string | null>(null);',
  "",
  "  useEffect(() => {",
  "    resolveNavaiMobileApplicationRuntimeConfig({",
  "      moduleLoaders: NAVAI_MOBILE_MODULE_LOADERS,",
  "      defaultRoutes: NAVAI_ROUTE_ITEMS,",
  "      env: NAVAI_ENV,",
  "    })",
  "      .then((result) => setRuntime(result))",
  "      .catch((error) => {",
  '        setRuntimeError(error instanceof Error ? error.message : "Unable to resolve NAVAI mobile runtime.");',
  "      })",
  "      .finally(() => setRuntimeLoading(false));",
  "  }, []);",
  "",
  "  const voice = useMobileVoiceAgent({",
  "    runtime,",
  "    runtimeLoading,",
  "    runtimeError,",
  "    navigate: (path) => linkTo(path),",
  "  });",
  "",
  "  return (",
  "    <NavaiMobileVoiceOrbButton",
  "      agent={voice}",
  "      size={92}",
  "      showStatus",
  "      style={styles.voiceDock}",
  "    />",
  "  );",
  "}",
  "",
  "const styles = StyleSheet.create({",
  "  voiceDock: {",
  '    alignSelf: "center",',
  "    marginTop: 16,",
  "  },",
  "});",
].join("\n");

const MOBILE_EXPO_SHARED_CODE_BY_LABEL: Readonly<Record<string, string>> = {
  "src/components/VoiceNavigator.tsx": MOBILE_EXPO_VOICE_NAVIGATOR_CODE,
};

function withMobileExpoSharedCode(tab: InstallationGuideTab): InstallationGuideTab {
  return {
    ...tab,
    sections: tab.sections.map((section) => ({
      ...section,
      codeBlocks: section.codeBlocks?.map((codeBlock) => {
        const sharedCode = MOBILE_EXPO_SHARED_CODE_BY_LABEL[codeBlock.label];

        return sharedCode ? { ...codeBlock, code: sharedCode } : codeBlock;
      }),
    })),
  };
}

const MOBILE_EXPO_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  es: {
    value: "expo",
    label: "Expo",
    title: "Expo + React Navigation",
    description: "Expo con linking por path usando React Navigation.",
    sections: [
      {
        id: "paso-1-crear-app-mobile",
        title: "Paso 1 Crear app",
        description:
          "Cree la app con Expo y prepare `src/ai/functions-modules` para que NAVAI pueda cargar routes y functions locales desde el principio.",
        bullets: [
          "Para voz realtime necesitara Development Build, no Expo Go.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npx create-expo-app@latest navai-mobile-demo\ncd navai-mobile-demo\nmkdir -p src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-nativas-mobile",
        title: "Paso 2 Dependencias",
        description:
          "Instale `@navai/voice-mobile`, `@openai/agents`, `zod`, `react-native-webrtc` y la navegacion que traducira un path a cambio de pantalla.",
        bullets: [
          "En Expo conviene instalar dependencias nativas con `npx expo install`.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install @navai/voice-mobile @openai/agents zod@^4\nnpx expo install react-native-webrtc @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context",
          },
        ],
      },
      {
        id: "paso-3-configurar-entorno-y-red-mobile",
        title: "Paso 3 Entorno",
        description:
          "Guarde la URL de la API en `.env` usando `EXPO_PUBLIC_NAVAI_API_URL` para runtime cliente y mantenga `NAVAI_*` para el CLI que genera loaders.",
        bullets: [
          "En dispositivo fisico use la IP LAN de su computadora, no `localhost`.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "EXPO_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
        ],
      },
      {
        id: "paso-4-definir-rutas-de-voz-mobile",
        title: "Paso 4 Definir rutas de navegacion",
        description:
          "Defina `NavaiRoute[]` con las pantallas que el asistente realmente puede abrir por voz y agregue sinonimos de negocio que mejoren el matching.",
        bullets: [
          "Si usa React Navigation, habilite linking por path para que `navigate(path)` llegue a la screen correcta.",
        ],
        codeBlocks: [
          {
            label: "src/ai/routes.ts",
            language: "typescript",
            code: 'import type { NavaiRoute } from "@navai/voice-mobile";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home screen",\n    synonyms: ["home", "start", "dashboard"],\n  },\n  {\n    name: "orders",\n    path: "/orders",\n    description: "Orders screen",\n    synonyms: ["orders", "purchases", "sales"],\n  },\n];',
          },
        ],
      },
      {
        id: "paso-5-crear-functions-locales-mobile",
        title: "Paso 5 Definir funciones",
        description:
          "Empiece con una function local sencilla para verificar que el runtime mobile ejecuta codigo local antes de delegar en backend.",
        bullets: [
          "Las functions locales pueden usar APIs de React Native como `Vibration`.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/vibrateDevice.ts",
            language: "typescript",
            code: 'import { Vibration } from "react-native";\n\nexport async function vibrateDevice() {\n  Vibration.vibrate(180);\n\n  return {\n    ok: true,\n    action: "vibrate_device",\n    message: "Local mobile function executed.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-mobile",
        title: "Paso 6 Integrar el runtime mobile",
        description:
          "Resuelva `runtime` con `resolveNavaiMobileApplicationRuntimeConfig`, conecte `useMobileVoiceAgent` y navegue por path con `useLinkTo()` desde React Navigation.",
        bullets: [
          "El hook carga `react-native-webrtc`, pide permiso de microfono en Android y hace `session.update` automaticamente.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { useEffect, useState } from "react";\nimport { Pressable, Text } from "react-native";\nimport { useLinkTo } from "@react-navigation/native";\nimport {\n  resolveNavaiMobileApplicationRuntimeConfig,\n  useMobileVoiceAgent,\n  type ResolveNavaiMobileApplicationRuntimeConfigResult,\n} from "@navai/voice-mobile";\n\nimport { NAVAI_ROUTE_ITEMS } from "@/ai/routes";\nimport { NAVAI_MOBILE_MODULE_LOADERS } from "@/ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: process.env.EXPO_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const linkTo = useLinkTo();\n  const [runtime, setRuntime] = useState<ResolveNavaiMobileApplicationRuntimeConfigResult | null>(null);\n  const [runtimeLoading, setRuntimeLoading] = useState(true);\n  const [runtimeError, setRuntimeError] = useState<string | null>(null);\n\n  useEffect(() => {\n    resolveNavaiMobileApplicationRuntimeConfig({\n      moduleLoaders: NAVAI_MOBILE_MODULE_LOADERS,\n      defaultRoutes: NAVAI_ROUTE_ITEMS,\n      env: NAVAI_ENV,\n    })\n      .then((result) => setRuntime(result))\n      .catch((error) => {\n        setRuntimeError(error instanceof Error ? error.message : "Unable to resolve NAVAI mobile runtime.");\n      })\n      .finally(() => setRuntimeLoading(false));\n  }, []);\n\n  const voice = useMobileVoiceAgent({\n    runtime,\n    runtimeLoading,\n    runtimeError,\n    navigate: (path) => linkTo(path),\n  });\n\n  return (\n    <Pressable onPress={() => (voice.isConnected ? void voice.stop() : void voice.start())}>\n      <Text>{voice.isConnected ? "Stop NAVAI" : "Start NAVAI"}</Text>\n    </Pressable>\n  );\n}',
          },
        ],
      },
      {
        id: "paso-7-compilar-y-probar-mobile",
        title: "Paso 7 Compilar y probar en dispositivo",
        description:
          "Genere loaders, construya el dev client y valide la sesion en un emulador o en un dispositivo que pueda alcanzar la API.",
        bullets: [
          "Use `10.0.2.2` solo en Android emulator; en dispositivo fisico use la IP LAN.",
        ],
        codeBlocks: [
          {
            label: "Generar module loaders",
            language: "bash",
            code: "npm exec navai-generate-mobile-loaders",
          },
          {
            label: "Development build",
            language: "bash",
            code: "npx expo run:android",
          },
          {
            label: "Levantar Metro",
            language: "bash",
            code: "npx expo start --dev-client",
          },
          {
            label: "Checklist de validacion",
            language: "text",
            code: "1. Start the backend on a LAN-reachable URL.\n2. Generate loaders and build the development client.\n3. Open the app on Android emulator or physical device.\n4. Allow microphone access.\n5. Ask NAVAI to open Orders and run vibrate device.",
          },
        ],
      },
    ],
  },
  en: {
    value: "expo",
    label: "Expo",
    title: "Expo + React Navigation",
    description: "Expo runtime with path linking through React Navigation.",
    sections: [
      {
        id: "paso-1-crear-app-mobile",
        title: "Step 1 App setup",
        description:
          "Create the app with Expo and prepare `src/ai/functions-modules` so NAVAI can load routes and local functions from day one.",
        bullets: [
          "For realtime voice you need a Development Build, not Expo Go.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npx create-expo-app@latest navai-mobile-demo\ncd navai-mobile-demo\nmkdir -p src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-nativas-mobile",
        title: "Step 2 Dependencies",
        description:
          "Install `@navai/voice-mobile`, `@openai/agents`, `zod`, `react-native-webrtc`, and the navigation packages that will translate a path into a screen change.",
        bullets: ["Install native Expo dependencies with `npx expo install`."],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install @navai/voice-mobile @openai/agents zod@^4\nnpx expo install react-native-webrtc @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context",
          },
        ],
      },
      {
        id: "paso-3-configurar-entorno-y-red-mobile",
        title: "Step 3 Environment",
        description:
          "Store the API URL in `.env` with `EXPO_PUBLIC_NAVAI_API_URL` for the client runtime and keep `NAVAI_*` for the loader CLI.",
        bullets: [
          "On a physical device use your computer LAN IP, not `localhost`.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "EXPO_PUBLIC_NAVAI_API_URL=http://localhost:3000\nNAVAI_API_URL=http://localhost:3000\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
        ],
      },
      {
        id: "paso-4-definir-rutas-de-voz-mobile",
        title: "Step 4 Define navigation routes",
        description:
          "Define `NavaiRoute[]` entries for the screens the assistant is allowed to open and add business synonyms that match how users speak.",
        bullets: [
          "If you use React Navigation, enable path-based linking so `navigate(path)` reaches the right screen.",
        ],
        codeBlocks: [
          {
            label: "src/ai/routes.ts",
            language: "typescript",
            code: 'import type { NavaiRoute } from "@navai/voice-mobile";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home screen",\n    synonyms: ["home", "start", "dashboard"],\n  },\n  {\n    name: "orders",\n    path: "/orders",\n    description: "Orders screen",\n    synonyms: ["orders", "purchases", "sales"],\n  },\n];',
          },
        ],
      },
      {
        id: "paso-5-crear-functions-locales-mobile",
        title: "Step 5 Define functions",
        description:
          "Start with one simple local function so the mobile runtime can prove local execution before delegating to the backend.",
        bullets: [
          "Local functions can use React Native APIs like `Vibration`.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/vibrateDevice.ts",
            language: "typescript",
            code: 'import { Vibration } from "react-native";\n\nexport async function vibrateDevice() {\n  Vibration.vibrate(180);\n\n  return {\n    ok: true,\n    action: "vibrate_device",\n    message: "Local mobile function executed.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-mobile",
        title: "Step 6 Integrate the mobile runtime",
        description:
          "Resolve `runtime` with `resolveNavaiMobileApplicationRuntimeConfig`, connect `useMobileVoiceAgent`, and navigate by path with `useLinkTo()` from React Navigation.",
        bullets: [
          "The hook loads `react-native-webrtc`, requests Android microphone permission, and sends `session.update` automatically.",
        ],
        codeBlocks: [
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { useEffect, useState } from "react";\nimport { Pressable, Text } from "react-native";\nimport { useLinkTo } from "@react-navigation/native";\nimport {\n  resolveNavaiMobileApplicationRuntimeConfig,\n  useMobileVoiceAgent,\n  type ResolveNavaiMobileApplicationRuntimeConfigResult,\n} from "@navai/voice-mobile";\n\nimport { NAVAI_ROUTE_ITEMS } from "@/ai/routes";\nimport { NAVAI_MOBILE_MODULE_LOADERS } from "@/ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: process.env.EXPO_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const linkTo = useLinkTo();\n  const [runtime, setRuntime] = useState<ResolveNavaiMobileApplicationRuntimeConfigResult | null>(null);\n  const [runtimeLoading, setRuntimeLoading] = useState(true);\n  const [runtimeError, setRuntimeError] = useState<string | null>(null);\n\n  useEffect(() => {\n    resolveNavaiMobileApplicationRuntimeConfig({\n      moduleLoaders: NAVAI_MOBILE_MODULE_LOADERS,\n      defaultRoutes: NAVAI_ROUTE_ITEMS,\n      env: NAVAI_ENV,\n    })\n      .then((result) => setRuntime(result))\n      .catch((error) => {\n        setRuntimeError(error instanceof Error ? error.message : "Unable to resolve NAVAI mobile runtime.");\n      })\n      .finally(() => setRuntimeLoading(false));\n  }, []);\n\n  const voice = useMobileVoiceAgent({\n    runtime,\n    runtimeLoading,\n    runtimeError,\n    navigate: (path) => linkTo(path),\n  });\n\n  return (\n    <Pressable onPress={() => (voice.isConnected ? void voice.stop() : void voice.start())}>\n      <Text>{voice.isConnected ? "Stop NAVAI" : "Start NAVAI"}</Text>\n    </Pressable>\n  );\n}',
          },
        ],
      },
      {
        id: "paso-7-compilar-y-probar-mobile",
        title: "Step 7 Build and test on device",
        description:
          "Generate loaders, build the dev client, and validate the session on an emulator or a device that can reach the API.",
        bullets: [
          "Use `10.0.2.2` only for the Android emulator; use your LAN IP on a physical device.",
        ],
        codeBlocks: [
          {
            label: "Generate module loaders",
            language: "bash",
            code: "npm exec navai-generate-mobile-loaders",
          },
          {
            label: "Development build",
            language: "bash",
            code: "npx expo run:android",
          },
          {
            label: "Start Metro",
            language: "bash",
            code: "npx expo start --dev-client",
          },
          {
            label: "Validation checklist",
            language: "text",
            code: "1. Start the backend on a LAN-reachable URL.\n2. Generate loaders and build the development client.\n3. Open the app on Android emulator or physical device.\n4. Allow microphone access.\n5. Ask NAVAI to open Orders and run vibrate device.",
          },
        ],
      },
    ],
  },
};

export function getMobileExpoGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return withMobileExpoSharedCode(
    getLocalizedInstallationGuideTab(MOBILE_EXPO_GUIDE_TABS, language),
  );
}
