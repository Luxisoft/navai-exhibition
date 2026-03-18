import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import {
  getLocalizedInstallationGuideTab,
  getLocalizedInstallationGuideValue,
} from "../helpers";

const MOBILE_EXPO_ROUTER_VOICE_NAVIGATOR_CODE = [
  'import { useEffect, useState } from "react";',
  'import {',
  "  Linking,",
  "  PermissionsAndroid,",
  "  Platform,",
  "  Pressable,",
  "  StyleSheet,",
  "  Text,",
  "  View,",
  '} from "react-native";',
  'import { useRouter } from "expo-router";',
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
  'const MICROPHONE_PERMISSION = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;',
  "",
  "const NAVAI_ENV = {",
  '  NAVAI_API_URL: process.env.EXPO_PUBLIC_NAVAI_API_URL ?? "https://your-subdomain.ngrok.app",',
  '  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",',
  '  NAVAI_ROUTES_FILE: "src/ai/routes.ts",',
  "};",
  "",
  'type MicrophoneAccessState = "checking" | "granted" | "denied" | "blocked";',
  "",
  "function getMicrophoneHelperText(permissionState: MicrophoneAccessState) {",
  '  if (permissionState === "checking") {',
  '    return "Checking microphone access...";',
  "  }",
  "",
  '  if (permissionState === "blocked") {',
  '    return "Microphone access is blocked. Open Android settings and enable it for NAVAI.";',
  "  }",
  "",
  '  if (permissionState === "denied") {',
  '    return "Microphone access is required to start NAVAI.";',
  "  }",
  "",
  "  return null;",
  "}",
  "",
  "async function readAndroidMicrophoneAccess(): Promise<MicrophoneAccessState> {",
  "  const hasPermission = await PermissionsAndroid.check(MICROPHONE_PERMISSION);",
  '  return hasPermission ? "granted" : "denied";',
  "}",
  "",
  "async function requestAndroidMicrophoneAccess(): Promise<MicrophoneAccessState> {",
  "  const hasPermission = await PermissionsAndroid.check(MICROPHONE_PERMISSION);",
  "",
  "  if (hasPermission) {",
  '    return "granted";',
  "  }",
  "",
  "  const result = await PermissionsAndroid.request(MICROPHONE_PERMISSION, {",
  '    title: "Microphone access",',
  '    message: "NAVAI needs microphone access to start realtime voice sessions.",',
  '    buttonPositive: "Allow",',
  '    buttonNegative: "Not now",',
  "  });",
  "",
  "  if (result === PermissionsAndroid.RESULTS.GRANTED) {",
  '    return "granted";',
  "  }",
  "",
  "  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {",
  '    return "blocked";',
  "  }",
  "",
  '  return "denied";',
  "}",
  "",
  "export function VoiceNavigator() {",
  "  const router = useRouter();",
  "  const [runtime, setRuntime] = useState<ResolveNavaiMobileApplicationRuntimeConfigResult | null>(null);",
  "  const [runtimeLoading, setRuntimeLoading] = useState(true);",
  '  const [runtimeError, setRuntimeError] = useState<string | null>(null);',
  "  const [permissionState, setPermissionState] = useState<MicrophoneAccessState>(",
  '    Platform.OS === "android" ? "checking" : "granted",',
  "  );",
  '  const [permissionHint, setPermissionHint] = useState<string | null>(null);',
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
  "    navigate: (path) => router.push(path),",
  "  });",
  "",
  "  async function syncMicrophoneAccess(requestAccess: boolean) {",
  '    if (Platform.OS !== "android") {',
  '      setPermissionState("granted");',
  "      setPermissionHint(null);",
  "      return;",
  "    }",
  "",
  "    try {",
  "      const nextState = requestAccess",
  "        ? await requestAndroidMicrophoneAccess()",
  "        : await readAndroidMicrophoneAccess();",
  "",
  "      setPermissionState(nextState);",
  "      setPermissionHint(getMicrophoneHelperText(nextState));",
  "    } catch {",
  '      setPermissionState("denied");',
  '      setPermissionHint("Unable to request microphone permission.");',
  "    }",
  "  }",
  "",
  "  useEffect(() => {",
  '    if (Platform.OS !== "android") {',
  "      return;",
  "    }",
  "",
  "    void syncMicrophoneAccess(true);",
  "  }, []);",
  "",
  "  useEffect(() => {",
  "    const nextError = voice.error?.toLowerCase() ?? null;",
  "",
  "    if (!nextError || Platform.OS !== \"android\") {",
  "      return;",
  "    }",
  "",
  '    if (nextError.includes("settings") || nextError.includes("blocked")) {',
  '      setPermissionState("blocked");',
  '      setPermissionHint(getMicrophoneHelperText("blocked"));',
  "      return;",
  "    }",
  "",
  '    if (nextError.includes("denied")) {',
  '      setPermissionState("denied");',
  '      setPermissionHint(getMicrophoneHelperText("denied"));',
  "    }",
  "  }, [voice.error]);",
  "",
  "  const helperText =",
  "    voice.error ??",
  "    permissionHint ??",
  "    (runtimeLoading",
  '      ? "Preparing NAVAI runtime..."',
  '      : \'Tap the Orb and say "Open orders" to validate voice navigation.\');',
  "",
  "  return (",
  "    <View style={styles.voiceDock}>",
  "      <NavaiMobileVoiceOrbButton",
  "        agent={voice}",
  "        size={96}",
  "        showStatus",
  "      />",
  "      <Text",
  "        style={[styles.helperText, voice.error ? styles.helperTextError : null]}",
  "      >",
  "        {helperText}",
  "      </Text>",
  '      {Platform.OS === "android" && permissionState !== "granted" ? (',
  "        <Pressable",
  "          onPress={() => {",
  '            if (permissionState === "blocked") {',
  "              void Linking.openSettings();",
  "              return;",
  "            }",
  "",
  "            void syncMicrophoneAccess(true);",
  "          }}",
  "          style={styles.actionButton}",
  "        >",
  "          <Text style={styles.actionButtonText}>",
  '            {permissionState === "blocked"',
  '              ? "Open Android settings"',
  '              : "Retry microphone permission"}',
  "          </Text>",
  "        </Pressable>",
  "      ) : null}",
  "    </View>",
  "  );",
  "}",
  "",
  "const styles = StyleSheet.create({",
  "  voiceDock: {",
  '    alignItems: "center",',
  "    gap: 12,",
  "    marginTop: 20,",
  "  },",
  "  helperText: {",
  '    color: "#475569",',
  '    fontSize: 14,',
  '    textAlign: "center",',
  "  },",
  "  helperTextError: {",
  '    color: "#991B1B",',
  "  },",
  "  actionButton: {",
  '    backgroundColor: "#E2E8F0",',
  "    borderRadius: 999,",
  "    paddingHorizontal: 16,",
  "    paddingVertical: 10,",
  "  },",
  "  actionButtonText: {",
  '    color: "#0F172A",',
  '    fontSize: 14,',
  '    fontWeight: "600",',
  "  },",
  "});",
].join("\n");

const MOBILE_EXPO_ROUTER_HOME_SCREEN_CODE = [
  'import { Link } from "expo-router";',
  'import { StyleSheet, Text, View } from "react-native";',
  "",
  'import { VoiceNavigator } from "@/components/VoiceNavigator";',
  "",
  "export default function HomeScreen() {",
  "  return (",
  '    <View style={styles.screen}>',
  '      <View style={styles.card}>',
  '        <Text style={styles.eyebrow}>NAVAI MOBILE DEMO</Text>',
  '        <Text style={styles.title}>Realtime voice sandbox</Text>',
  '        <Text style={styles.copy}>',
  '          Use the Orb below to start a session and ask NAVAI to open Orders.',
  "        </Text>",
  "        <VoiceNavigator />",
  '        <Link href="/orders" style={styles.link}>',
  "          Open Orders manually",
  "        </Link>",
  "      </View>",
  "    </View>",
  "  );",
  "}",
  "",
  "const styles = StyleSheet.create({",
  "  screen: {",
  "    alignItems: \"center\",",
  '    backgroundColor: "#F8FAFC",',
  "    flex: 1,",
  "    justifyContent: \"center\",",
  "    padding: 24,",
  "  },",
  "  card: {",
  '    backgroundColor: "#FFFFFF",',
  "    borderRadius: 24,",
  "    elevation: 4,",
  "    gap: 12,",
  "    maxWidth: 360,",
  "    padding: 24,",
  '    shadowColor: "#0F172A",',
  "    shadowOffset: { width: 0, height: 14 },",
  "    shadowOpacity: 0.08,",
  "    shadowRadius: 30,",
  "    width: \"100%\",",
  "  },",
  "  eyebrow: {",
  '    color: "#0F766E",',
  '    fontSize: 12,',
  '    fontWeight: "700",',
  '    letterSpacing: 1.1,',
  "  },",
  "  title: {",
  '    color: "#0F172A",',
  '    fontSize: 28,',
  '    fontWeight: "700",',
  "  },",
  "  copy: {",
  '    color: "#475569",',
  '    fontSize: 15,',
  '    lineHeight: 22,',
  "  },",
  "  link: {",
  '    color: "#0F766E",',
  '    fontSize: 15,',
  '    fontWeight: "600",',
  '    textAlign: "center",',
  "  },",
  "});",
].join("\n");

const MOBILE_EXPO_ROUTER_TABS_LAYOUT_CODE = [
  'import { Tabs } from "expo-router";',
  'import React from "react";',
  "",
  "export default function TabLayout() {",
  "  return (",
  "    <Tabs",
  "      screenOptions={{",
  "        headerShown: false,",
  "        tabBarStyle: { display: \"none\" },",
  "      }}",
  "    >",
  '      <Tabs.Screen name="index" options={{ title: "Home" }} />',
  '      <Tabs.Screen name="explore" options={{ href: null }} />',
  "    </Tabs>",
  "  );",
  "}",
].join("\n");

const MOBILE_EXPO_ROUTER_ORDERS_SCREEN_CODE = [
  'import { Link } from "expo-router";',
  'import { StyleSheet, Text, View } from "react-native";',
  "",
  "export default function OrdersScreen() {",
  "  return (",
  '    <View style={styles.screen}>',
  '      <Text style={styles.title}>Orders</Text>',
  '      <Text style={styles.copy}>',
  '        NAVAI reached this route. Keep one simple real screen like this to validate voice navigation.',
  "      </Text>",
  '      <Link href="/" style={styles.link}>',
  "        Back to home",
  "      </Link>",
  "    </View>",
  "  );",
  "}",
  "",
  "const styles = StyleSheet.create({",
  "  screen: {",
  '    alignItems: "center",',
  '    backgroundColor: "#F8FAFC",',
  "    flex: 1,",
  '    justifyContent: "center",',
  "    padding: 24,",
  "  },",
  "  title: {",
  '    color: "#0F172A",',
  '    fontSize: 30,',
  '    fontWeight: "700",',
  "  },",
  "  copy: {",
  '    color: "#475569",',
  '    fontSize: 15,',
  '    lineHeight: 22,',
  '    marginTop: 12,',
  '    maxWidth: 320,',
  '    textAlign: "center",',
  "  },",
  "  link: {",
  '    color: "#0F766E",',
  '    fontSize: 15,',
  '    fontWeight: "600",',
  '    marginTop: 20,',
  "  },",
  "});",
].join("\n");

const MOBILE_EXPO_ROUTER_SHARED_CODE_BY_LABEL: Readonly<Record<string, string>> = {
  "app/(tabs)/_layout.tsx": MOBILE_EXPO_ROUTER_TABS_LAYOUT_CODE,
  "app/(tabs)/index.tsx": MOBILE_EXPO_ROUTER_HOME_SCREEN_CODE,
  "app/orders.tsx": MOBILE_EXPO_ROUTER_ORDERS_SCREEN_CODE,
  "src/components/VoiceNavigator.tsx": MOBILE_EXPO_ROUTER_VOICE_NAVIGATOR_CODE,
};

function withMobileExpoRouterSharedCode(
  tab: InstallationGuideTab,
): InstallationGuideTab {
  return {
    ...tab,
    sections: tab.sections.map((section) => ({
      ...section,
      codeBlocks: section.codeBlocks?.map((codeBlock) => {
        const sharedCode =
          MOBILE_EXPO_ROUTER_SHARED_CODE_BY_LABEL[codeBlock.label];

        return sharedCode ? { ...codeBlock, code: sharedCode } : codeBlock;
      }),
    })),
  };
}

const MOBILE_EXPO_ROUTER_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  es: {
    value: "expo-router",
    label: "Expo Router",
    title: "Expo Router",
    description: "Expo con filesystem routing y navegacion por path directa.",
    sections: [
      {
        id: "paso-1-crear-app-mobile",
        title: "Paso 1 Crear app",
        description:
          "Cree el proyecto con el template `default` de Expo para mantener `expo-router` desde el inicio sin arrastrar el setup extra del template `tabs`.",
        bullets: [
          "Expo Router tambien requiere Development Build para usar `react-native-webrtc`.",
          "Si solo necesita validar NAVAI + routing por path, `default` reduce la superficie nativa frente a `tabs`.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npx create-expo-app@latest navai-mobile-demo --template default\ncd navai-mobile-demo\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-nativas-mobile",
        title: "Paso 2 Dependencias",
        description:
          "Instale `@navai/voice-mobile`, `@openai/agents`, `zod` y `react-native-webrtc`. El template `default` ya incluye `expo-router`.",
        bullets: [
          "Mantenga sus pantallas dentro de `app/` y sus tools dentro de `src/ai/functions-modules`.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install @navai/voice-mobile @openai/agents zod@^4\nnpx expo install react-native-webrtc",
          },
        ],
      },
      {
        id: "paso-3-configurar-entorno-y-red-mobile",
        title: "Paso 3 Entorno",
        description:
          "Use `.env` con `EXPO_PUBLIC_NAVAI_API_URL` para el runtime, conserve `NAVAI_*` para el CLI que genera `generated-module-loaders.ts` y agregue `RECORD_AUDIO` en `app.json` para Android.",
        bullets: [
          "En pruebas mobile reales use la URL HTTPS publica que entrega `ngrok http 3000`, no `localhost`.",
          "Si cambia permisos en `app.json`, reconstruya el dev client para que Android regenere el manifiesto.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "EXPO_PUBLIC_NAVAI_API_URL=https://your-subdomain.ngrok.app\nNAVAI_API_URL=https://your-subdomain.ngrok.app\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "app.json",
            language: "json",
            code: '{\n  "expo": {\n    "android": {\n      "permissions": ["android.permission.RECORD_AUDIO"]\n    }\n  }\n}',
          },
        ],
      },
      {
        id: "paso-4-definir-rutas-de-voz-mobile",
        title: "Paso 4 Definir rutas de navegacion",
        description:
          "Defina `NavaiRoute[]` con las pantallas que el asistente realmente puede abrir por voz y agregue sinonimos de negocio que mejoren el matching.",
        bullets: [
          "En Expo Router mantenga alineado el path declarado con el archivo real que representa la pantalla.",
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
          "Reemplace el home placeholder del template, oculte la tab extra y conecte `useMobileVoiceAgent` a un Orb real con `useRouter()` desde `expo-router`. El ejemplo tambien solicita microfono al abrir la pantalla y ofrece reintento o enlace a Ajustes si Android lo bloquea.",
        bullets: [
          "No mezcle el estado del microfono con `runtimeError`; deje que el Orb pueda reintentar `start()`.",
        ],
        codeBlocks: [
          {
            label: "app/(tabs)/_layout.tsx",
            language: "tsx",
            code: 'import { Tabs } from "expo-router";\nimport React from "react";\n\nexport default function TabLayout() {\n  return (\n    <Tabs\n      screenOptions={{\n        headerShown: false,\n        tabBarStyle: { display: "none" },\n      }}\n    >\n      <Tabs.Screen name="index" options={{ title: "Home" }} />\n      <Tabs.Screen name="explore" options={{ href: null }} />\n    </Tabs>\n  );\n}',
          },
          {
            label: "app/(tabs)/index.tsx",
            language: "tsx",
            code: 'import { Link } from "expo-router";\nimport { StyleSheet, Text, View } from "react-native";\n\nimport { VoiceNavigator } from "@/components/VoiceNavigator";\n\nexport default function HomeScreen() {\n  return (\n    <View style={styles.screen}>\n      <View style={styles.card}>\n        <Text style={styles.eyebrow}>NAVAI MOBILE DEMO</Text>\n        <Text style={styles.title}>Realtime voice sandbox</Text>\n        <Text style={styles.copy}>\n          Use the Orb below to start a session and ask NAVAI to open Orders.\n        </Text>\n        <VoiceNavigator />\n        <Link href="/orders" style={styles.link}>\n          Open Orders manually\n        </Link>\n      </View>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  screen: {\n    alignItems: "center",\n    backgroundColor: "#F8FAFC",\n    flex: 1,\n    justifyContent: "center",\n    padding: 24,\n  },\n  card: {\n    backgroundColor: "#FFFFFF",\n    borderRadius: 24,\n    elevation: 4,\n    gap: 12,\n    maxWidth: 360,\n    padding: 24,\n    shadowColor: "#0F172A",\n    shadowOffset: { width: 0, height: 14 },\n    shadowOpacity: 0.08,\n    shadowRadius: 30,\n    width: "100%",\n  },\n  eyebrow: {\n    color: "#0F766E",\n    fontSize: 12,\n    fontWeight: "700",\n    letterSpacing: 1.1,\n  },\n  title: {\n    color: "#0F172A",\n    fontSize: 28,\n    fontWeight: "700",\n  },\n  copy: {\n    color: "#475569",\n    fontSize: 15,\n    lineHeight: 22,\n  },\n  link: {\n    color: "#0F766E",\n    fontSize: 15,\n    fontWeight: "600",\n    textAlign: "center",\n  },\n});',
          },
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { useEffect, useState } from "react";\nimport {\n  PermissionsAndroid,\n  Platform,\n  StyleSheet,\n  Text,\n  View,\n} from "react-native";\nimport { useRouter } from "expo-router";\nimport {\n  NavaiMobileVoiceOrbButton,\n  resolveNavaiMobileApplicationRuntimeConfig,\n  useMobileVoiceAgent,\n  type ResolveNavaiMobileApplicationRuntimeConfigResult,\n} from "@navai/voice-mobile";\n\nimport { NAVAI_ROUTE_ITEMS } from "@/ai/routes";\nimport { NAVAI_MOBILE_MODULE_LOADERS } from "@/ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: process.env.EXPO_PUBLIC_NAVAI_API_URL ?? "https://your-subdomain.ngrok.app",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const router = useRouter();\n  const [runtime, setRuntime] = useState<ResolveNavaiMobileApplicationRuntimeConfigResult | null>(null);\n  const [runtimeLoading, setRuntimeLoading] = useState(true);\n  const [runtimeError, setRuntimeError] = useState<string | null>(null);\n  const [microphoneGranted, setMicrophoneGranted] = useState(Platform.OS !== "android");\n  const [microphoneError, setMicrophoneError] = useState<string | null>(null);\n\n  useEffect(() => {\n    resolveNavaiMobileApplicationRuntimeConfig({\n      moduleLoaders: NAVAI_MOBILE_MODULE_LOADERS,\n      defaultRoutes: NAVAI_ROUTE_ITEMS,\n      env: NAVAI_ENV,\n    })\n      .then((result) => setRuntime(result))\n      .catch((error) => {\n        setRuntimeError(error instanceof Error ? error.message : "Unable to resolve NAVAI mobile runtime.");\n      })\n      .finally(() => setRuntimeLoading(false));\n  }, []);\n\n  useEffect(() => {\n    if (Platform.OS !== "android") {\n      return;\n    }\n\n    PermissionsAndroid.request(\n      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,\n      {\n        title: "Microphone access",\n        message: "NAVAI needs microphone access to start realtime voice sessions.",\n        buttonPositive: "Allow",\n        buttonNegative: "Not now",\n      },\n    )\n      .then((result) => {\n        if (result === PermissionsAndroid.RESULTS.GRANTED) {\n          setMicrophoneGranted(true);\n          setMicrophoneError(null);\n          return;\n        }\n\n        setMicrophoneGranted(false);\n        setMicrophoneError("Microphone permission is required to use NAVAI.");\n      })\n      .catch(() => {\n        setMicrophoneGranted(false);\n        setMicrophoneError("Unable to request microphone permission.");\n      });\n  }, []);\n\n  const voice = useMobileVoiceAgent({\n    runtime,\n    runtimeLoading,\n    runtimeError: runtimeError ?? microphoneError,\n    navigate: (path) => router.push(path),\n  });\n\n  return (\n    <View style={styles.voiceDock}>\n      <NavaiMobileVoiceOrbButton\n        agent={voice}\n        size={96}\n        showStatus\n      />\n      <Text style={styles.helperText}>\n        {microphoneGranted\n          ? \'Say "Open orders" to validate voice navigation."\n          : microphoneError ?? "Grant microphone access to enable NAVAI."}\n      </Text>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  voiceDock: {\n    alignItems: "center",\n    gap: 12,\n    marginTop: 20,\n  },\n  helperText: {\n    color: "#475569",\n    fontSize: 14,\n    textAlign: "center",\n  },\n});',
          },
          {
            label: "app/orders.tsx",
            language: "tsx",
            code: 'import { Link } from "expo-router";\nimport { StyleSheet, Text, View } from "react-native";\n\nexport default function OrdersScreen() {\n  return (\n    <View style={styles.screen}>\n      <Text style={styles.title}>Orders</Text>\n      <Text style={styles.copy}>\n        NAVAI reached this route. Keep one simple real screen like this to validate voice navigation.\n      </Text>\n      <Link href="/" style={styles.link}>\n        Back to home\n      </Link>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  screen: {\n    alignItems: "center",\n    backgroundColor: "#F8FAFC",\n    flex: 1,\n    justifyContent: "center",\n    padding: 24,\n  },\n  title: {\n    color: "#0F172A",\n    fontSize: 30,\n    fontWeight: "700",\n  },\n  copy: {\n    color: "#475569",\n    fontSize: 15,\n    lineHeight: 22,\n    marginTop: 12,\n    maxWidth: 320,\n    textAlign: "center",\n  },\n  link: {\n    color: "#0F766E",\n    fontSize: 15,\n    fontWeight: "600",\n    marginTop: 20,\n  },\n});',
          },
        ],
      },
      {
        id: "paso-7-compilar-y-probar-mobile",
        title: "Paso 7 Compilar y probar en dispositivo",
        description:
          "Genere loaders, reconstruya Android cuando cambien permisos y valide que NAVAI pueda abrir una ruta del arbol `app/` y ejecutar una function local.",
        bullets: [
          "Si abre Expo Go, la sesion realtime no funcionara por la dependencia nativa.",
          "Si Android Settings no muestra Microphone, la build instalada todavia no contiene el manifiesto actualizado.",
        ],
        codeBlocks: [
          {
            label: "Generar module loaders",
            language: "bash",
            code: "npm exec navai-generate-mobile-loaders",
          },
          {
            label: "Regenerar Android tras cambiar permisos",
            language: "bash",
            code: "npx expo prebuild --clean --platform android\nnpx expo run:android",
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
            code: "1. Inicie el backend en el puerto 3000 y ejecute `ngrok http 3000`.\n2. Copie la URL HTTPS publica de ngrok en `.env`.\n3. Genere loaders y reconstruya el dev client si cambian permisos.\n4. Abra la app en emulador Android o dispositivo fisico.\n5. Permita el acceso al microfono o abra Ajustes si Android lo bloqueo.\n6. Pida a NAVAI abrir Orders y ejecutar vibrate device.",
          },
        ],
      },
    ],
  },
  en: {
    value: "expo-router",
    label: "Expo Router",
    title: "Expo Router",
    description: "Expo with filesystem routing and direct path navigation.",
    sections: [
      {
        id: "paso-1-crear-app-mobile",
        title: "Step 1 App setup",
        description:
          "Create the project with Expo's `default` template so `expo-router` is available from the first commit without the extra native setup from the `tabs` template.",
        bullets: [
          "Expo Router still needs a Development Build to use `react-native-webrtc`.",
          "If you only need to validate NAVAI plus path routing, `default` keeps the native surface smaller than `tabs`.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npx create-expo-app@latest navai-mobile-demo --template default\ncd navai-mobile-demo\nmkdir -p src/ai/functions-modules src/components",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-nativas-mobile",
        title: "Step 2 Dependencies",
        description:
          "Install `@navai/voice-mobile`, `@openai/agents`, `zod`, and `react-native-webrtc`. The `default` template already includes `expo-router`.",
        bullets: [
          "Keep screens in `app/` and local tools in `src/ai/functions-modules`.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install @navai/voice-mobile @openai/agents zod@^4\nnpx expo install react-native-webrtc",
          },
        ],
      },
      {
        id: "paso-3-configurar-entorno-y-red-mobile",
        title: "Step 3 Environment",
        description:
          "Use `.env` with `EXPO_PUBLIC_NAVAI_API_URL` for the runtime, keep `NAVAI_*` for the CLI that generates `generated-module-loaders.ts`, and add `RECORD_AUDIO` in `app.json` for Android.",
        bullets: [
          "For real mobile tests, point to the public HTTPS URL returned by `ngrok http 3000`, not `localhost`.",
          "If you change permissions in `app.json`, rebuild the dev client so Android regenerates the manifest.",
        ],
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "EXPO_PUBLIC_NAVAI_API_URL=https://your-subdomain.ngrok.app\nNAVAI_API_URL=https://your-subdomain.ngrok.app\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts",
          },
          {
            label: "app.json",
            language: "json",
            code: '{\n  "expo": {\n    "android": {\n      "permissions": ["android.permission.RECORD_AUDIO"]\n    }\n  }\n}',
          },
        ],
      },
      {
        id: "paso-4-definir-rutas-de-voz-mobile",
        title: "Step 4 Define navigation routes",
        description:
          "Define `NavaiRoute[]` entries for the screens the assistant is allowed to open and add business synonyms that match how users speak.",
        bullets: [
          "With Expo Router, keep the declared path aligned with the real file that represents the screen.",
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
          "Replace the placeholder home from the default template, hide the extra tab, and connect `useMobileVoiceAgent` to a real Orb with `useRouter()` from `expo-router`. The sample also requests microphone access on screen mount and exposes retry or Android settings when the permission is blocked.",
        bullets: [
          "Do not merge microphone state into `runtimeError`; let the Orb retry `start()`.",
        ],
        codeBlocks: [
          {
            label: "app/(tabs)/_layout.tsx",
            language: "tsx",
            code: 'import { Tabs } from "expo-router";\nimport React from "react";\n\nexport default function TabLayout() {\n  return (\n    <Tabs\n      screenOptions={{\n        headerShown: false,\n        tabBarStyle: { display: "none" },\n      }}\n    >\n      <Tabs.Screen name="index" options={{ title: "Home" }} />\n      <Tabs.Screen name="explore" options={{ href: null }} />\n    </Tabs>\n  );\n}',
          },
          {
            label: "app/(tabs)/index.tsx",
            language: "tsx",
            code: 'import { Link } from "expo-router";\nimport { StyleSheet, Text, View } from "react-native";\n\nimport { VoiceNavigator } from "@/components/VoiceNavigator";\n\nexport default function HomeScreen() {\n  return (\n    <View style={styles.screen}>\n      <View style={styles.card}>\n        <Text style={styles.eyebrow}>NAVAI MOBILE DEMO</Text>\n        <Text style={styles.title}>Realtime voice sandbox</Text>\n        <Text style={styles.copy}>\n          Use the Orb below to start a session and ask NAVAI to open Orders.\n        </Text>\n        <VoiceNavigator />\n        <Link href="/orders" style={styles.link}>\n          Open Orders manually\n        </Link>\n      </View>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  screen: {\n    alignItems: "center",\n    backgroundColor: "#F8FAFC",\n    flex: 1,\n    justifyContent: "center",\n    padding: 24,\n  },\n  card: {\n    backgroundColor: "#FFFFFF",\n    borderRadius: 24,\n    elevation: 4,\n    gap: 12,\n    maxWidth: 360,\n    padding: 24,\n    shadowColor: "#0F172A",\n    shadowOffset: { width: 0, height: 14 },\n    shadowOpacity: 0.08,\n    shadowRadius: 30,\n    width: "100%",\n  },\n  eyebrow: {\n    color: "#0F766E",\n    fontSize: 12,\n    fontWeight: "700",\n    letterSpacing: 1.1,\n  },\n  title: {\n    color: "#0F172A",\n    fontSize: 28,\n    fontWeight: "700",\n  },\n  copy: {\n    color: "#475569",\n    fontSize: 15,\n    lineHeight: 22,\n  },\n  link: {\n    color: "#0F766E",\n    fontSize: 15,\n    fontWeight: "600",\n    textAlign: "center",\n  },\n});',
          },
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: 'import { useEffect, useState } from "react";\nimport {\n  PermissionsAndroid,\n  Platform,\n  StyleSheet,\n  Text,\n  View,\n} from "react-native";\nimport { useRouter } from "expo-router";\nimport {\n  NavaiMobileVoiceOrbButton,\n  resolveNavaiMobileApplicationRuntimeConfig,\n  useMobileVoiceAgent,\n  type ResolveNavaiMobileApplicationRuntimeConfigResult,\n} from "@navai/voice-mobile";\n\nimport { NAVAI_ROUTE_ITEMS } from "@/ai/routes";\nimport { NAVAI_MOBILE_MODULE_LOADERS } from "@/ai/generated-module-loaders";\n\nconst NAVAI_ENV = {\n  NAVAI_API_URL: process.env.EXPO_PUBLIC_NAVAI_API_URL ?? "http://localhost:3000",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n};\n\nexport function VoiceNavigator() {\n  const router = useRouter();\n  const [runtime, setRuntime] = useState<ResolveNavaiMobileApplicationRuntimeConfigResult | null>(null);\n  const [runtimeLoading, setRuntimeLoading] = useState(true);\n  const [runtimeError, setRuntimeError] = useState<string | null>(null);\n  const [microphoneGranted, setMicrophoneGranted] = useState(Platform.OS !== "android");\n  const [microphoneError, setMicrophoneError] = useState<string | null>(null);\n\n  useEffect(() => {\n    resolveNavaiMobileApplicationRuntimeConfig({\n      moduleLoaders: NAVAI_MOBILE_MODULE_LOADERS,\n      defaultRoutes: NAVAI_ROUTE_ITEMS,\n      env: NAVAI_ENV,\n    })\n      .then((result) => setRuntime(result))\n      .catch((error) => {\n        setRuntimeError(error instanceof Error ? error.message : "Unable to resolve NAVAI mobile runtime.");\n      })\n      .finally(() => setRuntimeLoading(false));\n  }, []);\n\n  useEffect(() => {\n    if (Platform.OS !== "android") {\n      return;\n    }\n\n    PermissionsAndroid.request(\n      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,\n      {\n        title: "Microphone access",\n        message: "NAVAI needs microphone access to start realtime voice sessions.",\n        buttonPositive: "Allow",\n        buttonNegative: "Not now",\n      },\n    )\n      .then((result) => {\n        if (result === PermissionsAndroid.RESULTS.GRANTED) {\n          setMicrophoneGranted(true);\n          setMicrophoneError(null);\n          return;\n        }\n\n        setMicrophoneGranted(false);\n        setMicrophoneError("Microphone permission is required to use NAVAI.");\n      })\n      .catch(() => {\n        setMicrophoneGranted(false);\n        setMicrophoneError("Unable to request microphone permission.");\n      });\n  }, []);\n\n  const voice = useMobileVoiceAgent({\n    runtime,\n    runtimeLoading,\n    runtimeError: runtimeError ?? microphoneError,\n    navigate: (path) => router.push(path),\n  });\n\n  return (\n    <View style={styles.voiceDock}>\n      <NavaiMobileVoiceOrbButton\n        agent={voice}\n        size={96}\n        showStatus\n      />\n      <Text style={styles.helperText}>\n        {microphoneGranted\n          ? \'Say "Open orders" to validate voice navigation.\'\n          : microphoneError ?? "Grant microphone access to enable NAVAI."}\n      </Text>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  voiceDock: {\n    alignItems: "center",\n    gap: 12,\n    marginTop: 20,\n  },\n  helperText: {\n    color: "#475569",\n    fontSize: 14,\n    textAlign: "center",\n  },\n});',
          },
          {
            label: "app/orders.tsx",
            language: "tsx",
            code: 'import { Link } from "expo-router";\nimport { StyleSheet, Text, View } from "react-native";\n\nexport default function OrdersScreen() {\n  return (\n    <View style={styles.screen}>\n      <Text style={styles.title}>Orders</Text>\n      <Text style={styles.copy}>\n        NAVAI reached this route. Keep one simple real screen like this to validate voice navigation.\n      </Text>\n      <Link href="/" style={styles.link}>\n        Back to home\n      </Link>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  screen: {\n    alignItems: "center",\n    backgroundColor: "#F8FAFC",\n    flex: 1,\n    justifyContent: "center",\n    padding: 24,\n  },\n  title: {\n    color: "#0F172A",\n    fontSize: 30,\n    fontWeight: "700",\n  },\n  copy: {\n    color: "#475569",\n    fontSize: 15,\n    lineHeight: 22,\n    marginTop: 12,\n    maxWidth: 320,\n    textAlign: "center",\n  },\n  link: {\n    color: "#0F766E",\n    fontSize: 15,\n    fontWeight: "600",\n    marginTop: 20,\n  },\n});',
          },
        ],
      },
      {
        id: "paso-7-compilar-y-probar-mobile",
        title: "Step 7 Build and test on device",
        description:
          "Generate loaders, rebuild Android when permissions change, and validate that NAVAI can open an `app/` route and run one local function.",
        bullets: [
          "If you open Expo Go, the realtime session will fail because the native dependency is missing.",
          "If Android settings does not show Microphone, the installed build still does not contain the updated manifest.",
        ],
        codeBlocks: [
          {
            label: "Generate module loaders",
            language: "bash",
            code: "npm exec navai-generate-mobile-loaders",
          },
          {
            label: "Rebuild Android after permission changes",
            language: "bash",
            code: "npx expo prebuild --clean --platform android\nnpx expo run:android",
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
            code: "1. Start the backend on port 3000 and run `ngrok http 3000`.\n2. Copy the public HTTPS ngrok URL into `.env`.\n3. Generate loaders and rebuild the dev client when permissions change.\n4. Open the app on Android emulator or physical device.\n5. Allow microphone access or open settings if Android blocked it.\n6. Ask NAVAI to open Orders and run vibrate device.",
          },
        ],
      },
    ],
  },
};

type MobileExpoRouterTranslatedSection = {
  title: string;
  description: string;
  bullets?: string[];
};

type MobileExpoRouterTranslatedValidationSection =
  MobileExpoRouterTranslatedSection & {
    checklist: string;
  };

type MobileExpoRouterNgrokGuidance = {
  step3PrimaryBullet: string;
  step7Checklist: string;
};

type MobileExpoRouterTranslatedTab = {
  description: string;
  labels: {
    terminal: string;
    generateLoaders: string;
    rebuildAndroid: string;
    developmentBuild: string;
    startMetro: string;
    validationChecklist: string;
  };
  sections: {
    step1: MobileExpoRouterTranslatedSection;
    step2: MobileExpoRouterTranslatedSection;
    step3: MobileExpoRouterTranslatedSection;
    step4: MobileExpoRouterTranslatedSection;
    step5: MobileExpoRouterTranslatedSection;
    step6: MobileExpoRouterTranslatedSection;
    step7: MobileExpoRouterTranslatedValidationSection;
  };
};

const MOBILE_EXPO_ROUTER_CREATE_APP_CODE =
  "npx create-expo-app@latest navai-mobile-demo --template default\ncd navai-mobile-demo\nmkdir -p src/ai/functions-modules src/components";

const MOBILE_EXPO_ROUTER_INSTALL_CODE =
  "npm install @navai/voice-mobile @openai/agents zod@^4\nnpx expo install react-native-webrtc";

const MOBILE_EXPO_ROUTER_ENV_CODE =
  "EXPO_PUBLIC_NAVAI_API_URL=https://your-subdomain.ngrok.app\nNAVAI_API_URL=https://your-subdomain.ngrok.app\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ROUTES_FILE=src/ai/routes.ts";

const MOBILE_EXPO_ROUTER_APP_JSON_CODE =
  '{\n  "expo": {\n    "android": {\n      "permissions": ["android.permission.RECORD_AUDIO"]\n    }\n  }\n}';

const MOBILE_EXPO_ROUTER_ROUTES_CODE =
  'import type { NavaiRoute } from "@navai/voice-mobile";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home screen",\n    synonyms: ["home", "start", "dashboard"],\n  },\n  {\n    name: "orders",\n    path: "/orders",\n    description: "Orders screen",\n    synonyms: ["orders", "purchases", "sales"],\n  },\n];';

const MOBILE_EXPO_ROUTER_VIBRATE_CODE =
  'import { Vibration } from "react-native";\n\nexport async function vibrateDevice() {\n  Vibration.vibrate(180);\n\n  return {\n    ok: true,\n    action: "vibrate_device",\n    message: "Local mobile function executed.",\n  };\n}';

const MOBILE_EXPO_ROUTER_NGROK_GUIDANCE: Partial<
  Record<LanguageCode, MobileExpoRouterNgrokGuidance>
> = {
  es: {
    step3PrimaryBullet:
      "En pruebas mobile reales use la URL HTTPS publica que entrega `ngrok http 3000`, no `localhost`.",
    step7Checklist:
      "1. Inicie el backend en el puerto 3000 y ejecute `ngrok http 3000`.\n2. Copie la URL HTTPS publica de ngrok en `.env`.\n3. Genere loaders y reconstruya el dev client si cambian permisos.\n4. Abra la app en emulador Android o dispositivo fisico.\n5. Permita el acceso al microfono o abra Ajustes si Android lo bloqueo.\n6. Pida a NAVAI abrir Orders y ejecutar vibrate device.",
  },
  en: {
    step3PrimaryBullet:
      "For real mobile tests, point to the public HTTPS URL returned by `ngrok http 3000`, not `localhost`.",
    step7Checklist:
      "1. Start the backend on port 3000 and run `ngrok http 3000`.\n2. Copy the public HTTPS ngrok URL into `.env`.\n3. Generate loaders and rebuild the dev client when permissions change.\n4. Open the app on Android emulator or physical device.\n5. Allow microphone access or open settings if Android blocked it.\n6. Ask NAVAI to open Orders and run vibrate device.",
  },
  pt: {
    step3PrimaryBullet:
      "Para testes mobile reais, use a URL HTTPS publica gerada por `ngrok http 3000`, nao `localhost`.",
    step7Checklist:
      "1. Inicie o backend na porta 3000 e execute `ngrok http 3000`.\n2. Copie a URL HTTPS publica do ngrok para o `.env`.\n3. Gere loaders e reconstrua o dev client quando as permissoes mudarem.\n4. Abra o app no emulador Android ou em um dispositivo fisico.\n5. Permita o microfone ou abra Ajustes se o Android o bloqueou.\n6. Peca ao NAVAI para abrir Orders e executar vibrate device.",
  },
  fr: {
    step3PrimaryBullet:
      "Pour des tests mobile reels, utilisez l'URL HTTPS publique fournie par `ngrok http 3000`, pas `localhost`.",
    step7Checklist:
      "1. Demarrez le backend sur le port 3000 et lancez `ngrok http 3000`.\n2. Copiez l'URL HTTPS publique de ngrok dans le `.env`.\n3. Generez les loaders et reconstruisez le dev client quand les permissions changent.\n4. Ouvrez l'application sur emulateur Android ou appareil physique.\n5. Autorisez le micro ou ouvrez les reglages si Android l'a bloque.\n6. Demandez a NAVAI d'ouvrir Orders et d'executer vibrate device.",
  },
  hi: {
    step3PrimaryBullet:
      "Real mobile test ke liye `localhost` ki jagah `ngrok http 3000` se mili public HTTPS URL use karein.",
    step7Checklist:
      "1. Backend ko port 3000 par start karke `ngrok http 3000` chalayein.\n2. ngrok ki public HTTPS URL ko `.env` me rakhein.\n3. Permissions badalne par loaders generate karke dev client rebuild karein.\n4. App ko Android emulator ya physical device par kholein.\n5. Microphone allow karein ya Android ne block kiya ho to settings kholein.\n6. NAVAI se Orders kholne aur vibrate device chalane ko kahen.",
  },
  ja: {
    step3PrimaryBullet:
      "実機の検証では `localhost` ではなく、`ngrok http 3000` が返す公開 HTTPS URL を使ってください。",
    step7Checklist:
      "1. backend をポート 3000 で起動し、`ngrok http 3000` を実行します。\n2. ngrok の公開 HTTPS URL を `.env` に設定します。\n3. 権限が変わったら loaders を生成し、dev client を再ビルドします。\n4. Android エミュレータまたは実機でアプリを開きます。\n5. マイクを許可するか、Android がブロックした場合は設定を開きます。\n6. NAVAI に Orders を開いて vibrate device を実行するよう依頼します。",
  },
  ko: {
    step3PrimaryBullet:
      "실기기 테스트에서는 `localhost` 대신 `ngrok http 3000` 이 돌려주는 공개 HTTPS URL 을 사용하세요.",
    step7Checklist:
      "1. backend 를 3000 포트에서 실행하고 `ngrok http 3000` 을 실행합니다.\n2. ngrok 의 공개 HTTPS URL 을 `.env` 에 넣습니다.\n3. 권한이 바뀌면 loaders 를 생성하고 dev client 를 다시 빌드합니다.\n4. Android 에뮬레이터나 실기기에서 앱을 엽니다.\n5. 마이크를 허용하거나 Android 가 막았다면 설정을 엽니다.\n6. NAVAI 에게 Orders 를 열고 vibrate device 를 실행하라고 요청합니다.",
  },
  ru: {
    step3PrimaryBullet:
      "Для реальных мобильных тестов используйте публичный HTTPS URL, который возвращает `ngrok http 3000`, а не `localhost`.",
    step7Checklist:
      "1. Запустите backend на порту 3000 и выполните `ngrok http 3000`.\n2. Скопируйте публичный HTTPS URL ngrok в `.env`.\n3. Сгенерируйте loaders и пересоберите dev client после изменения permissions.\n4. Откройте приложение на Android emulator или физическом устройстве.\n5. Разрешите микрофон или откройте settings, если Android его заблокировал.\n6. Попросите NAVAI открыть Orders и выполнить vibrate device.",
  },
  zh: {
    step3PrimaryBullet:
      "做真实移动端测试时，请使用 `ngrok http 3000` 返回的公网 HTTPS URL，而不是 `localhost`。",
    step7Checklist:
      "1. 在 3000 端口启动 backend，并执行 `ngrok http 3000`。\n2. 把 ngrok 的公网 HTTPS URL 写进 `.env`。\n3. 权限变更后重新生成 loaders 并重建 dev client。\n4. 在 Android 模拟器或真机上打开应用。\n5. 允许麦克风访问，或在 Android 阻止时打开设置。\n6. 让 NAVAI 打开 Orders 并执行 vibrate device。",
  },
};

function withMobileExpoRouterNgrokGuidance(
  tab: InstallationGuideTab,
  language: LanguageCode,
): InstallationGuideTab {
  const guidance = getLocalizedInstallationGuideValue(
    MOBILE_EXPO_ROUTER_NGROK_GUIDANCE,
    language,
  );

  return {
    ...tab,
    sections: tab.sections.map((section) => {
      if (section.id === "paso-3-configurar-entorno-y-red-mobile") {
        return {
          ...section,
          bullets: [
            guidance.step3PrimaryBullet,
            ...(section.bullets?.slice(1) ?? []),
          ],
        };
      }

      if (section.id !== "paso-7-compilar-y-probar-mobile") {
        return section;
      }

      return {
        ...section,
        codeBlocks: section.codeBlocks?.map((codeBlock) =>
          codeBlock.language === "text"
            ? { ...codeBlock, code: guidance.step7Checklist }
            : codeBlock,
        ),
      };
    }),
  };
}

function buildMobileExpoRouterTranslatedTab(
  copy: MobileExpoRouterTranslatedTab,
): InstallationGuideTab {
  return {
    value: "expo-router",
    label: "Expo Router",
    title: "Expo Router",
    description: copy.description,
    sections: [
      {
        id: "paso-1-crear-app-mobile",
        title: copy.sections.step1.title,
        description: copy.sections.step1.description,
        bullets: copy.sections.step1.bullets,
        codeBlocks: [
          {
            label: copy.labels.terminal,
            language: "bash",
            code: MOBILE_EXPO_ROUTER_CREATE_APP_CODE,
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-nativas-mobile",
        title: copy.sections.step2.title,
        description: copy.sections.step2.description,
        bullets: copy.sections.step2.bullets,
        codeBlocks: [
          {
            label: copy.labels.terminal,
            language: "bash",
            code: MOBILE_EXPO_ROUTER_INSTALL_CODE,
          },
        ],
      },
      {
        id: "paso-3-configurar-entorno-y-red-mobile",
        title: copy.sections.step3.title,
        description: copy.sections.step3.description,
        bullets: copy.sections.step3.bullets,
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: MOBILE_EXPO_ROUTER_ENV_CODE,
          },
          {
            label: "app.json",
            language: "json",
            code: MOBILE_EXPO_ROUTER_APP_JSON_CODE,
          },
        ],
      },
      {
        id: "paso-4-definir-rutas-de-voz-mobile",
        title: copy.sections.step4.title,
        description: copy.sections.step4.description,
        bullets: copy.sections.step4.bullets,
        codeBlocks: [
          {
            label: "src/ai/routes.ts",
            language: "typescript",
            code: MOBILE_EXPO_ROUTER_ROUTES_CODE,
          },
        ],
      },
      {
        id: "paso-5-crear-functions-locales-mobile",
        title: copy.sections.step5.title,
        description: copy.sections.step5.description,
        bullets: copy.sections.step5.bullets,
        codeBlocks: [
          {
            label: "src/ai/functions-modules/vibrateDevice.ts",
            language: "typescript",
            code: MOBILE_EXPO_ROUTER_VIBRATE_CODE,
          },
        ],
      },
      {
        id: "paso-6-integrar-runtime-mobile",
        title: copy.sections.step6.title,
        description: copy.sections.step6.description,
        bullets: copy.sections.step6.bullets,
        codeBlocks: [
          {
            label: "app/(tabs)/_layout.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "app/(tabs)/index.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "app/orders.tsx",
            language: "tsx",
            code: "",
          },
        ],
      },
      {
        id: "paso-7-compilar-y-probar-mobile",
        title: copy.sections.step7.title,
        description: copy.sections.step7.description,
        bullets: copy.sections.step7.bullets,
        codeBlocks: [
          {
            label: copy.labels.generateLoaders,
            language: "bash",
            code: "npm exec navai-generate-mobile-loaders",
          },
          {
            label: copy.labels.rebuildAndroid,
            language: "bash",
            code: "npx expo prebuild --clean --platform android\nnpx expo run:android",
          },
          {
            label: copy.labels.developmentBuild,
            language: "bash",
            code: "npx expo run:android",
          },
          {
            label: copy.labels.startMetro,
            language: "bash",
            code: "npx expo start --dev-client",
          },
          {
            label: copy.labels.validationChecklist,
            language: "text",
            code: copy.sections.step7.checklist,
          },
        ],
      },
    ],
  };
}

const MOBILE_EXPO_ROUTER_ADDITIONAL_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  pt: buildMobileExpoRouterTranslatedTab({
    description:
      "Expo com roteamento por sistema de arquivos e navegacao direta por caminho.",
    labels: {
      terminal: "Terminal",
      generateLoaders: "Gerar module loaders",
      rebuildAndroid: "Reconstruir Android apos mudar permissoes",
      developmentBuild: "Build de desenvolvimento",
      startMetro: "Iniciar Metro",
      validationChecklist: "Checklist de validacao",
    },
    sections: {
      step1: {
        title: "Passo 1 App",
        description:
          "Crie o projeto com o template `default` do Expo para manter `expo-router` desde o inicio sem carregar o setup nativo extra do template `tabs`.",
        bullets: [
          "Expo Router ainda precisa de Development Build para usar `react-native-webrtc`.",
          "Se voce so precisa validar NAVAI e roteamento por caminho, `default` reduz a superficie nativa em relacao a `tabs`.",
        ],
      },
      step2: {
        title: "Passo 2 Dependencias",
        description:
          "Instale `@navai/voice-mobile`, `@openai/agents`, `zod` e `react-native-webrtc`. O template `default` ja inclui `expo-router`.",
        bullets: [
          "Mantenha as telas em `app/` e as tools locais em `src/ai/functions-modules`.",
        ],
      },
      step3: {
        title: "Passo 3 Ambiente",
        description:
          "Use `.env` com `EXPO_PUBLIC_NAVAI_API_URL` para o runtime, mantenha `NAVAI_*` para o CLI que gera `generated-module-loaders.ts` e adicione `RECORD_AUDIO` em `app.json` no Android.",
        bullets: [
          "Para testes mobile reais, use a URL HTTPS publica gerada por `ngrok http 3000`, nao `localhost`.",
          "Se mudar permissoes em `app.json`, reconstrua o dev client para que o Android regenere o manifesto.",
        ],
      },
      step4: {
        title: "Passo 4 Rotas de navegacao",
        description:
          "Defina entradas `NavaiRoute[]` para as telas que o assistente pode abrir por voz e adicione sinonimos de negocio que combinem com a fala do usuario.",
        bullets: [
          "No Expo Router, mantenha o path declarado alinhado com o arquivo real da tela.",
        ],
      },
      step5: {
        title: "Passo 5 Definir funcoes",
        description:
          "Comece com uma funcao local simples para provar que o runtime mobile executa codigo local antes de delegar ao backend.",
        bullets: [
          "Funcoes locais podem usar APIs do React Native como `Vibration`.",
        ],
      },
      step6: {
        title: "Passo 6 Integrar runtime mobile",
        description:
          "Substitua o home placeholder do template, esconda a tab extra e conecte `useMobileVoiceAgent` a um Orb real. O exemplo tambem pede microfone ao abrir a tela e mostra retry ou Ajustes do Android quando a permissao fica bloqueada.",
        bullets: [
          "Nao misture o estado do microfone com `runtimeError`; deixe o Orb tentar `start()` novamente.",
        ],
      },
      step7: {
        title: "Passo 7 Compilar e testar no dispositivo",
        description:
          "Gere loaders, reconstrua o Android quando as permissoes mudarem e valide que NAVAI consegue abrir uma rota de `app/` e executar uma funcao local.",
        bullets: [
          "Se abrir o Expo Go, a sessao realtime vai falhar por causa da dependencia nativa.",
          "Se Android Settings nao mostrar Microphone, a build instalada ainda nao contem o manifesto atualizado.",
        ],
        checklist:
          "1. Inicie o backend na porta 3000 e execute `ngrok http 3000`.\n2. Copie a URL HTTPS publica do ngrok para o `.env`.\n3. Gere loaders e reconstrua o dev client quando as permissoes mudarem.\n4. Abra o app no emulador Android ou em um dispositivo fisico.\n5. Permita o microfone ou abra Ajustes se o Android o bloqueou.\n6. Peca ao NAVAI para abrir Orders e executar vibrate device.",
      },
    },
  }),
  fr: buildMobileExpoRouterTranslatedTab({
    description:
      "Expo avec routage par systeme de fichiers et navigation directe par chemin.",
    labels: {
      terminal: "Terminal",
      generateLoaders: "Generer les module loaders",
      rebuildAndroid: "Reconstruire Android apres changement des permissions",
      developmentBuild: "Build de developpement",
      startMetro: "Lancer Metro",
      validationChecklist: "Checklist de validation",
    },
    sections: {
      step1: {
        title: "Etape 1 Application",
        description:
          "Creez le projet avec le template Expo `default` afin d'avoir `expo-router` des le debut sans le surcout natif du template `tabs`.",
        bullets: [
          "Expo Router a quand meme besoin d'un Development Build pour utiliser `react-native-webrtc`.",
          "Si vous voulez seulement valider NAVAI et le routage par chemin, `default` reduit la surface native par rapport a `tabs`.",
        ],
      },
      step2: {
        title: "Etape 2 Dependances",
        description:
          "Installez `@navai/voice-mobile`, `@openai/agents`, `zod` et `react-native-webrtc`. Le template `default` inclut deja `expo-router`.",
        bullets: [
          "Gardez les ecrans dans `app/` et les outils locaux dans `src/ai/functions-modules`.",
        ],
      },
      step3: {
        title: "Etape 3 Environnement",
        description:
          "Utilisez `.env` avec `EXPO_PUBLIC_NAVAI_API_URL` pour le runtime, conservez `NAVAI_*` pour le CLI qui genere `generated-module-loaders.ts`, et ajoutez `RECORD_AUDIO` dans `app.json` pour Android.",
        bullets: [
          "Pour des tests mobile reels, utilisez l'URL HTTPS publique fournie par `ngrok http 3000`, pas `localhost`.",
          "Si vous modifiez les permissions dans `app.json`, reconstruisez le dev client pour que le manifeste Android soit regenere.",
        ],
      },
      step4: {
        title: "Etape 4 Routes de navigation",
        description:
          "Definissez les entrees `NavaiRoute[]` pour les ecrans que l'assistant peut ouvrir et ajoutez des synonymes metier qui collent a la facon de parler des utilisateurs.",
        bullets: [
          "Avec Expo Router, gardez le chemin declare aligne avec le fichier reel de l'ecran.",
        ],
      },
      step5: {
        title: "Etape 5 Definir les fonctions",
        description:
          "Commencez par une fonction locale simple afin de verifier que le runtime mobile execute du code local avant de deleguer au backend.",
        bullets: [
          "Les fonctions locales peuvent utiliser des APIs React Native comme `Vibration`.",
        ],
      },
      step6: {
        title: "Etape 6 Integrer le runtime mobile",
        description:
          "Remplacez le home placeholder du template, masquez l'onglet supplementaire et connectez `useMobileVoiceAgent` a un vrai Orb. L'exemple demande aussi le micro a l'ouverture de l'ecran et propose un retry ou l'ouverture des reglages Android si la permission est bloquee.",
        bullets: [
          "Ne fusionnez pas l'etat du micro dans `runtimeError`; laissez l'Orb relancer `start()`.",
        ],
      },
      step7: {
        title: "Etape 7 Compiler et tester sur appareil",
        description:
          "Generez les loaders, reconstruisez Android quand les permissions changent, puis verifiez que NAVAI peut ouvrir une route `app/` et executer une fonction locale.",
        bullets: [
          "Si vous ouvrez Expo Go, la session realtime echouera car la dependance native manque.",
          "Si Android Settings n'affiche pas Microphone, la build installee ne contient pas encore le manifeste mis a jour.",
        ],
        checklist:
          "1. Demarrez le backend sur le port 3000 et lancez `ngrok http 3000`.\n2. Copiez l'URL HTTPS publique de ngrok dans le `.env`.\n3. Generez les loaders et reconstruisez le dev client quand les permissions changent.\n4. Ouvrez l'application sur emulateur Android ou appareil physique.\n5. Autorisez le micro ou ouvrez les reglages si Android l'a bloque.\n6. Demandez a NAVAI d'ouvrir Orders et d'executer vibrate device.",
      },
    },
  }),
  hi: buildMobileExpoRouterTranslatedTab({
    description: "Expo ke saath filesystem routing aur direct path navigation.",
    labels: {
      terminal: "Terminal",
      generateLoaders: "Module loaders generate karein",
      rebuildAndroid: "Permission badalne ke baad Android rebuild karein",
      developmentBuild: "Development build",
      startMetro: "Metro start karein",
      validationChecklist: "Validation checklist",
    },
    sections: {
      step1: {
        title: "चरण 1 ऐप सेटअप",
        description:
          "Project ko Expo ke `default` template se banayein taki `expo-router` shuru se mile aur `tabs` template ka extra native setup na aaye.",
        bullets: [
          "Expo Router ko `react-native-webrtc` ke liye ab bhi Development Build chahiye.",
          "Agar aapko sirf NAVAI aur path routing validate karna hai, to `default` native surface ko `tabs` se chhota rakhta hai.",
        ],
      },
      step2: {
        title: "चरण 2 डिपेंडेंसी",
        description:
          "`@navai/voice-mobile`, `@openai/agents`, `zod` aur `react-native-webrtc` install karein. `default` template me `expo-router` pehle se hota hai.",
        bullets: [
          "Screens ko `app/` me aur local tools ko `src/ai/functions-modules` me rakhein.",
        ],
      },
      step3: {
        title: "चरण 3 एनवायरनमेंट",
        description:
          "Runtime ke liye `.env` me `EXPO_PUBLIC_NAVAI_API_URL` use karein, `generated-module-loaders.ts` banane wale CLI ke liye `NAVAI_*` rakhein, aur Android ke liye `app.json` me `RECORD_AUDIO` add karein.",
        bullets: [
          "Real mobile test ke liye `localhost` ki jagah `ngrok http 3000` se mili public HTTPS URL use karein.",
          "`app.json` me permission badalne par dev client ko rebuild karein taki Android manifest dobara generate ho.",
        ],
      },
      step4: {
        title: "चरण 4 वॉइस रूट",
        description:
          "`NavaiRoute[]` entries define karein un screens ke liye jinhen assistant voice se khol sakta hai, aur business synonyms add karein jo user ki boli se match karein.",
        bullets: [
          "Expo Router me declared path ko actual screen file ke saath aligned rakhein.",
        ],
      },
      step5: {
        title: "चरण 5 लोकल फ़ंक्शन",
        description:
          "Ek simple local function se shuru karein taki mobile runtime backend par jane se pehle local execution prove kar sake.",
        bullets: [
          "Local functions `Vibration` jaise React Native APIs use kar sakte hain.",
        ],
      },
      step6: {
        title: "चरण 6 मोबाइल रनटाइम इंटीग्रेशन",
        description:
          "Default template ka placeholder home hataayein, extra tab chhupayein, aur `useMobileVoiceAgent` ko real Orb se jodein. Sample screen mount par microphone maangta hai aur permission block hone par retry ya Android settings ka action dikhata hai.",
        bullets: [
          "Microphone state ko `runtimeError` me merge mat karein; Orb ko `start()` retry karne dein.",
        ],
      },
      step7: {
        title: "चरण 7 डिवाइस पर बिल्ड और टेस्ट",
        description:
          "Loaders generate karein, permission badalne par Android rebuild karein, aur validate karein ki NAVAI `app/` route khol sakta hai aur local function chala sakta hai.",
        bullets: [
          "Agar aap Expo Go kholenge to native dependency ke bina realtime session fail hoga.",
          "Agar Android settings me Microphone nahi dikhta, to installed build me abhi updated manifest nahi hai.",
        ],
        checklist:
          "1. Backend ko port 3000 par start karke `ngrok http 3000` chalayein.\n2. ngrok ki public HTTPS URL ko `.env` me rakhein.\n3. Permissions badalne par loaders generate karke dev client rebuild karein.\n4. App ko Android emulator ya physical device par kholein.\n5. Microphone allow karein ya Android ne block kiya ho to settings kholein.\n6. NAVAI se Orders kholne aur vibrate device chalane ko kahen.",
      },
    },
  }),
  ja: buildMobileExpoRouterTranslatedTab({
    description: "Expo によるファイルシステムルーティングとパス直接遷移。",
    labels: {
      terminal: "Terminal",
      generateLoaders: "モジュールローダーを生成",
      rebuildAndroid: "権限変更後に Android を再ビルド",
      developmentBuild: "Development build",
      startMetro: "Metro を起動",
      validationChecklist: "検証チェックリスト",
    },
    sections: {
      step1: {
        title: "手順 1 アプリ設定",
        description:
          "Expo の `default` テンプレートでプロジェクトを作成し、`tabs` テンプレートの追加ネイティブ設定を持ち込まずに `expo-router` を最初から使えるようにします。",
        bullets: [
          "`react-native-webrtc` を使うには Expo Router でも Development Build が必要です。",
          "NAVAI とパスベースの遷移だけを検証したいなら、`default` の方が `tabs` よりネイティブ面が小さくなります。",
        ],
      },
      step2: {
        title: "手順 2 依存関係",
        description:
          "`@navai/voice-mobile`、`@openai/agents`、`zod`、`react-native-webrtc` をインストールします。`default` テンプレートには `expo-router` が既に含まれています。",
        bullets: [
          "画面は `app/`、ローカルツールは `src/ai/functions-modules` に置いてください。",
        ],
      },
      step3: {
        title: "手順 3 環境",
        description:
          "ランタイム用に `.env` で `EXPO_PUBLIC_NAVAI_API_URL` を使い、`generated-module-loaders.ts` を生成する CLI 用に `NAVAI_*` を維持し、Android 用に `app.json` へ `RECORD_AUDIO` を追加します。",
        bullets: [
          "実機の検証では `localhost` ではなく、`ngrok http 3000` が返す公開 HTTPS URL を使ってください。",
          "`app.json` の権限を変更したら、Android がマニフェストを再生成できるように dev client を再ビルドしてください。",
        ],
      },
      step4: {
        title: "手順 4 ナビゲーションルート",
        description:
          "アシスタントが音声で開ける画面に対して `NavaiRoute[]` を定義し、ユーザーの言い回しに合う業務用シノニムを追加します。",
        bullets: [
          "Expo Router では、宣言した path を実際の画面ファイルと一致させてください。",
        ],
      },
      step5: {
        title: "手順 5 関数を定義",
        description:
          "まずは簡単なローカル関数から始めて、モバイルランタイムが backend に委譲する前にローカル実行できることを確認します。",
        bullets: [
          "ローカル関数では `Vibration` などの React Native API を使えます。",
        ],
      },
      step6: {
        title: "手順 6 モバイルランタイム統合",
        description:
          "テンプレートの placeholder home を置き換え、余分なタブを隠し、`useMobileVoiceAgent` を実際の Orb に接続します。このサンプルは画面表示時にマイク権限を要求し、Android で権限がブロックされた場合は再試行または設定画面への導線も出します。",
        bullets: [
          "マイク状態を `runtimeError` に混ぜないでください。Orb が `start()` を再試行できるようにします。",
        ],
      },
      step7: {
        title: "手順 7 実機でビルドと検証",
        description:
          "loaders を生成し、権限が変わったら Android を再ビルドして、NAVAI が `app/` のルートを開きローカル関数を実行できることを確認します。",
        bullets: [
          "Expo Go を開くと、ネイティブ依存がないため realtime session は失敗します。",
          "Android settings に Microphone が出ない場合、インストール済み build に更新後の manifest が入っていません。",
        ],
        checklist:
          "1. backend をポート 3000 で起動し、`ngrok http 3000` を実行します。\n2. ngrok の公開 HTTPS URL を `.env` に設定します。\n3. 権限が変わったら loaders を生成し、dev client を再ビルドします。\n4. Android エミュレータまたは実機でアプリを開きます。\n5. マイクを許可するか、Android がブロックした場合は設定を開きます。\n6. NAVAI に Orders を開いて vibrate device を実行するよう依頼します。",
      },
    },
  }),
  ko: buildMobileExpoRouterTranslatedTab({
    description: "Expo 기반 파일 시스템 라우팅과 직접 경로 이동.",
    labels: {
      terminal: "Terminal",
      generateLoaders: "모듈 로더 생성",
      rebuildAndroid: "권한 변경 후 Android 재빌드",
      developmentBuild: "Development build",
      startMetro: "Metro 시작",
      validationChecklist: "검증 체크리스트",
    },
    sections: {
      step1: {
        title: "단계 1 앱 설정",
        description:
          "Expo의 `default` 템플릿으로 프로젝트를 생성해 `tabs` 템플릿의 추가 네이티브 설정 없이 처음부터 `expo-router` 를 사용할 수 있게 합니다.",
        bullets: [
          "`react-native-webrtc` 를 사용하려면 Expo Router 에서도 Development Build 가 필요합니다.",
          "NAVAI 와 경로 기반 라우팅만 검증하려면 `default` 가 `tabs` 보다 네이티브 표면을 더 작게 유지합니다.",
        ],
      },
      step2: {
        title: "단계 2 의존성",
        description:
          "`@navai/voice-mobile`, `@openai/agents`, `zod`, `react-native-webrtc` 를 설치합니다. `default` 템플릿에는 `expo-router` 가 이미 포함되어 있습니다.",
        bullets: [
          "화면은 `app/` 에, 로컬 도구는 `src/ai/functions-modules` 에 두세요.",
        ],
      },
      step3: {
        title: "단계 3 환경",
        description:
          "런타임에는 `.env` 의 `EXPO_PUBLIC_NAVAI_API_URL` 을 사용하고, `generated-module-loaders.ts` 를 만드는 CLI 용으로 `NAVAI_*` 를 유지하며, Android 용 `app.json` 에 `RECORD_AUDIO` 를 추가합니다.",
        bullets: [
          "실기기에서는 `localhost` 대신 휴대폰이 접근할 수 있는 LAN URL 을 사용하세요.",
          "`app.json` 의 권한을 바꿨다면 Android 가 manifest 를 다시 만들 수 있도록 dev client 를 재빌드하세요.",
        ],
      },
      step4: {
        title: "단계 4 내비게이션 라우트",
        description:
          "도우미가 음성으로 열 수 있는 화면에 대해 `NavaiRoute[]` 를 정의하고 사용자의 말투와 맞는 업무용 동의어를 추가하세요.",
        bullets: [
          "Expo Router 에서는 선언한 path 를 실제 화면 파일과 맞춰 두세요.",
        ],
      },
      step5: {
        title: "단계 5 함수 정의",
        description:
          "먼저 간단한 로컬 함수를 만들어 모바일 런타임이 backend 로 넘기기 전에 로컬 실행을 증명하도록 하세요.",
        bullets: [
          "로컬 함수는 `Vibration` 같은 React Native API 를 사용할 수 있습니다.",
        ],
      },
      step6: {
        title: "단계 6 모바일 런타임 통합",
        description:
          "템플릿의 placeholder home 을 교체하고, 추가 탭을 숨기고, `useMobileVoiceAgent` 를 실제 Orb 와 연결하세요. 이 예제는 화면 진입 시 마이크 권한을 요청하고 Android 가 막았을 때 재시도 또는 설정 이동 버튼도 제공합니다.",
        bullets: [
          "마이크 상태를 `runtimeError` 에 합치지 마세요. Orb 가 `start()` 를 다시 시도할 수 있어야 합니다.",
        ],
      },
      step7: {
        title: "단계 7 디바이스 빌드와 테스트",
        description:
          "loaders 를 생성하고 권한이 바뀌면 Android 를 재빌드한 뒤, NAVAI 가 `app/` 경로를 열고 로컬 함수를 실행할 수 있는지 검증하세요.",
        bullets: [
          "Expo Go 를 열면 네이티브 의존성이 없어서 realtime session 이 실패합니다.",
          "Android settings 에 Microphone 이 보이지 않으면 설치된 build 에 업데이트된 manifest 가 아직 없습니다.",
        ],
        checklist:
          "1. LAN 에서 접근 가능한 URL 로 backend 를 시작합니다.\n2. 권한이 바뀌면 loaders 를 생성하고 dev client 를 다시 빌드합니다.\n3. Android 에뮬레이터나 실제 기기에서 앱을 엽니다.\n4. 마이크를 허용하거나 Android 가 막았다면 설정을 엽니다.\n5. NAVAI 에게 Orders 를 열고 vibrate device 를 실행하라고 요청합니다.",
      },
    },
  }),
  ru: buildMobileExpoRouterTranslatedTab({
    description: "Expo с файловой маршрутизацией и прямой навигацией по пути.",
    labels: {
      terminal: "Terminal",
      generateLoaders: "Сгенерировать module loaders",
      rebuildAndroid: "Пересобрать Android после изменения разрешений",
      developmentBuild: "Development build",
      startMetro: "Запустить Metro",
      validationChecklist: "Чеклист проверки",
    },
    sections: {
      step1: {
        title: "Шаг 1 Настройка приложения",
        description:
          "Создайте проект на шаблоне Expo `default`, чтобы получить `expo-router` с самого начала и не тянуть дополнительную нативную настройку из шаблона `tabs`.",
        bullets: [
          "Для `react-native-webrtc` в Expo Router все равно нужен Development Build.",
          "Если вам нужно проверить только NAVAI и маршрутизацию по path, `default` дает меньшую нативную поверхность, чем `tabs`.",
        ],
      },
      step2: {
        title: "Шаг 2 Зависимости",
        description:
          "Установите `@navai/voice-mobile`, `@openai/agents`, `zod` и `react-native-webrtc`. Шаблон `default` уже включает `expo-router`.",
        bullets: [
          "Держите экраны в `app/`, а локальные инструменты в `src/ai/functions-modules`.",
        ],
      },
      step3: {
        title: "Шаг 3 Окружение",
        description:
          "Используйте `.env` с `EXPO_PUBLIC_NAVAI_API_URL` для runtime, сохраните `NAVAI_*` для CLI, который генерирует `generated-module-loaders.ts`, и добавьте `RECORD_AUDIO` в `app.json` для Android.",
        bullets: [
          "Для реальных мобильных тестов используйте публичный HTTPS URL, который возвращает `ngrok http 3000`, а не `localhost`.",
          "Если вы меняете permissions в `app.json`, пересоберите dev client, чтобы Android заново сгенерировал manifest.",
        ],
      },
      step4: {
        title: "Шаг 4 Маршруты навигации",
        description:
          "Опишите `NavaiRoute[]` для экранов, которые ассистент может открывать голосом, и добавьте бизнес-синонимы, совпадающие с речью пользователя.",
        bullets: [
          "В Expo Router следите, чтобы объявленный path совпадал с реальным файлом экрана.",
        ],
      },
      step5: {
        title: "Шаг 5 Определить функции",
        description:
          "Начните с простой локальной функции, чтобы mobile runtime сначала подтвердил локальное выполнение, а потом уже делегировал в backend.",
        bullets: [
          "Локальные функции могут использовать API React Native, например `Vibration`.",
        ],
      },
      step6: {
        title: "Шаг 6 Интеграция mobile runtime",
        description:
          "Замените placeholder home из шаблона, скройте лишнюю вкладку и подключите `useMobileVoiceAgent` к реальному Orb. Пример также запрашивает микрофон при открытии экрана и показывает retry или переход в Android settings, если permission заблокирован.",
        bullets: [
          "Не смешивайте состояние микрофона с `runtimeError`; Orb должен иметь возможность повторить `start()`.",
        ],
      },
      step7: {
        title: "Шаг 7 Сборка и проверка на устройстве",
        description:
          "Сгенерируйте loaders, пересоберите Android после изменения permissions и проверьте, что NAVAI может открыть маршрут из `app/` и выполнить локальную функцию.",
        bullets: [
          "Если открыть Expo Go, realtime session не заработает из-за отсутствующей нативной зависимости.",
          "Если в Android settings нет Microphone, установленная build все еще не содержит обновленный manifest.",
        ],
        checklist:
          "1. Запустите backend на порту 3000 и выполните `ngrok http 3000`.\n2. Скопируйте публичный HTTPS URL ngrok в `.env`.\n3. Сгенерируйте loaders и пересоберите dev client после изменения permissions.\n4. Откройте приложение на Android emulator или физическом устройстве.\n5. Разрешите микрофон или откройте settings, если Android его заблокировал.\n6. Попросите NAVAI открыть Orders и выполнить vibrate device.",
      },
    },
  }),
  zh: buildMobileExpoRouterTranslatedTab({
    description: "Expo 文件系统路由与直接路径导航。",
    labels: {
      terminal: "Terminal",
      generateLoaders: "生成模块加载器",
      rebuildAndroid: "权限变更后重新构建 Android",
      developmentBuild: "Development build",
      startMetro: "启动 Metro",
      validationChecklist: "验证清单",
    },
    sections: {
      step1: {
        title: "步骤 1 应用设置",
        description:
          "使用 Expo 的 `default` 模板创建项目，这样可以从一开始就拥有 `expo-router`，同时避免 `tabs` 模板带来的额外原生配置。",
        bullets: [
          "要使用 `react-native-webrtc`，Expo Router 仍然需要 Development Build。",
          "如果你只需要验证 NAVAI 和基于路径的路由，`default` 比 `tabs` 的原生复杂度更低。",
        ],
      },
      step2: {
        title: "步骤 2 依赖",
        description:
          "安装 `@navai/voice-mobile`、`@openai/agents`、`zod` 和 `react-native-webrtc`。`default` 模板已经包含 `expo-router`。",
        bullets: [
          "将页面放在 `app/`，将本地工具放在 `src/ai/functions-modules`。",
        ],
      },
      step3: {
        title: "步骤 3 环境",
        description:
          "运行时使用 `.env` 中的 `EXPO_PUBLIC_NAVAI_API_URL`，为生成 `generated-module-loaders.ts` 的 CLI 保留 `NAVAI_*`，并在 Android 的 `app.json` 中加入 `RECORD_AUDIO`。",
        bullets: [
          "在真机上请使用手机可访问的 LAN URL，而不是 `localhost`。",
          "如果你修改了 `app.json` 中的权限，请重新构建 dev client，让 Android 重新生成 manifest。",
        ],
      },
      step4: {
        title: "步骤 4 导航路由",
        description:
          "为语音助手允许打开的页面定义 `NavaiRoute[]`，并补充符合用户表达方式的业务同义词。",
        bullets: [
          "在 Expo Router 中，声明的 path 必须和真实页面文件保持一致。",
        ],
      },
      step5: {
        title: "步骤 5 定义函数",
        description:
          "先从一个简单的本地函数开始，证明 mobile runtime 在委托给 backend 之前可以执行本地代码。",
        bullets: [
          "本地函数可以使用 `Vibration` 这类 React Native API。",
        ],
      },
      step6: {
        title: "步骤 6 集成移动端 runtime",
        description:
          "替换默认模板里的 placeholder home，隐藏多余 tab，并把 `useMobileVoiceAgent` 接到真正的 Orb 上。示例还会在页面打开时申请麦克风权限，并在 Android 阻止权限时提供重试或打开设置的入口。",
        bullets: [
          "不要把麦克风状态并入 `runtimeError`；应让 Orb 可以重新尝试 `start()`。",
        ],
      },
      step7: {
        title: "步骤 7 在设备上构建并测试",
        description:
          "生成 loaders，在权限变更后重新构建 Android，并验证 NAVAI 能打开 `app/` 路由并执行本地函数。",
        bullets: [
          "如果打开 Expo Go，由于缺少原生依赖，realtime session 会失败。",
          "如果 Android settings 中看不到 Microphone，说明已安装的 build 仍然没有更新后的 manifest。",
        ],
        checklist:
          "1. 在 LAN 可访问的 URL 上启动 backend。\n2. 权限变更后生成 loaders 并重新构建 dev client。\n3. 在 Android 模拟器或真机上打开应用。\n4. 允许麦克风访问，或者在 Android 阻止时打开设置。\n5. 让 NAVAI 打开 Orders 并执行 vibrate device。",
      },
    },
  }),
};

export function getMobileExpoRouterGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return withMobileExpoRouterSharedCode(
    withMobileExpoRouterNgrokGuidance(
      getLocalizedInstallationGuideTab(
        {
          ...MOBILE_EXPO_ROUTER_GUIDE_TABS,
          ...MOBILE_EXPO_ROUTER_ADDITIONAL_GUIDE_TABS,
        },
        language,
      ),
      language,
    ),
  );
}
