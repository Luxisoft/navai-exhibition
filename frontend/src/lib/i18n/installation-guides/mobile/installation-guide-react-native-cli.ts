import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";

const MOBILE_REACT_NATIVE_CLI_VOICE_NAVIGATOR_CODE = [
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
  'import { useLinkTo } from "@react-navigation/native";',
  "import {",
  "  NavaiMobileVoiceOrbButton,",
  "  resolveNavaiMobileApplicationRuntimeConfig,",
  "  useMobileVoiceAgent,",
  "  type ResolveNavaiMobileApplicationRuntimeConfigResult,",
  "  type UseMobileVoiceAgentTransportOptions,",
  '} from "@navai/voice-mobile";',
  "",
  'import { NAVAI_ROUTE_ITEMS } from "../ai/routes";',
  'import { NAVAI_MOBILE_MODULE_LOADERS } from "../ai/generated-module-loaders";',
  'import { NAVAI_ENV } from "../ai/env";',
  "",
  'const MICROPHONE_PERMISSION = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;',
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
  "  const linkTo = useLinkTo();",
  "  const [runtime, setRuntime] = useState<ResolveNavaiMobileApplicationRuntimeConfigResult | null>(null);",
  "  const [runtimeLoading, setRuntimeLoading] = useState(true);",
  '  const [runtimeError, setRuntimeError] = useState<string | null>(null);',
  "  const androidBareTransportOptions: UseMobileVoiceAgentTransportOptions | undefined =",
  '    Platform.OS === "android"',
  "      ? {",
  "          rtcConfiguration: {",
  '            iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],',
  "          },",
  "          audioConstraints: {",
  "            audio: {",
  "              echoCancellation: true,",
  "              noiseSuppression: true,",
  "              autoGainControl: true,",
  "            },",
  "            video: false,",
  "          },",
  "          remoteAudioTrackVolume: 10,",
  "        }",
  "      : undefined;",
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
  "    navigate: (path) => linkTo(path),",
  "    transportOptions: androidBareTransportOptions,",
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
  '    if (!nextError || Platform.OS !== "android") {',
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

function withMobileReactNativeCliSharedCode(
  tab: InstallationGuideTab,
): InstallationGuideTab {
  return {
    ...tab,
    sections: tab.sections.map((section) => ({
      ...section,
      codeBlocks: section.codeBlocks?.map((codeBlock) => {
        const sharedCode =
          MOBILE_REACT_NATIVE_CLI_SHARED_CODE_BY_LABEL[codeBlock.label];

        return sharedCode ? { ...codeBlock, code: sharedCode } : codeBlock;
      }),
    })),
  };
}

type MobileReactNativeCliTranslatedSection = {
  title: string;
  description: string;
  bullets?: string[];
};

type MobileReactNativeCliTranslatedValidationSection =
  MobileReactNativeCliTranslatedSection & {
    checklist: string;
  };

type MobileReactNativeCliTranslatedTab = {
  description: string;
  labels: {
    terminal: string;
    generateLoaders: string;
    developmentBuild: string;
    validationChecklist: string;
  };
  sections: {
    step1: MobileReactNativeCliTranslatedSection;
    step2: MobileReactNativeCliTranslatedSection;
    step3: MobileReactNativeCliTranslatedSection;
    step4: MobileReactNativeCliTranslatedSection;
    step5: MobileReactNativeCliTranslatedSection;
    step6: MobileReactNativeCliTranslatedSection;
    step7: MobileReactNativeCliTranslatedValidationSection;
  };
};

const MOBILE_REACT_NATIVE_CLI_CREATE_APP_CODE =
  "npx @react-native-community/cli@latest init NavaiMobileDemo --version 0.81.5\ncd NavaiMobileDemo\nmkdir -p src/ai/functions-modules src/components src/screens";

const MOBILE_REACT_NATIVE_CLI_INSTALL_CODE =
  "npm install @navai/voice-mobile @openai/agents zod@^4 react-native-webrtc @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context";

const MOBILE_REACT_NATIVE_CLI_ENV_CODE =
  'export const NAVAI_ENV = {\n  NAVAI_API_URL: "https://your-subdomain.ngrok.app",\n  NAVAI_FUNCTIONS_FOLDERS: "src/ai/functions-modules",\n  NAVAI_ROUTES_FILE: "src/ai/routes.ts",\n} as const;';

const MOBILE_REACT_NATIVE_CLI_ANDROID_GRADLE_PROPERTIES_CODE =
  "newArchEnabled=false";

const MOBILE_REACT_NATIVE_CLI_ROUTES_CODE =
  'import type { NavaiRoute } from "@navai/voice-mobile";\n\nexport const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [\n  {\n    name: "home",\n    path: "/",\n    description: "Home screen",\n    synonyms: ["home", "start", "dashboard"],\n  },\n  {\n    name: "orders",\n    path: "/orders",\n    description: "Orders screen",\n    synonyms: ["orders", "purchases", "sales"],\n  },\n];';

const MOBILE_REACT_NATIVE_CLI_VIBRATE_CODE =
  'import { Vibration } from "react-native";\n\nexport async function vibrateDevice() {\n  Vibration.vibrate(180);\n\n  return {\n    ok: true,\n    action: "vibrate_device",\n    message: "Local mobile function executed.",\n  };\n}';

const MOBILE_REACT_NATIVE_CLI_ANDROID_MANIFEST_CODE = [
  "<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\">",
  '  <uses-permission android:name="android.permission.RECORD_AUDIO" />',
  "",
  "  <application",
  '    android:name=".MainApplication"',
  '    android:label="@string/app_name"',
  "  >",
  "    ...",
  "  </application>",
  "</manifest>",
].join("\n");

const MOBILE_REACT_NATIVE_CLI_BUILD_CODE =
  "cd android\n./gradlew clean\ncd ..\nnpx react-native run-android";

const MOBILE_REACT_NATIVE_CLI_APP_CODE = [
  'import { NavigationContainer } from "@react-navigation/native";',
  'import { createNativeStackNavigator } from "@react-navigation/native-stack";',
  'import { StatusBar } from "react-native";',
  'import { SafeAreaProvider } from "react-native-safe-area-context";',
  "",
  'import HomeScreen from "./src/screens/HomeScreen";',
  'import OrdersScreen from "./src/screens/OrdersScreen";',
  "",
  "const Stack = createNativeStackNavigator();",
  "",
  "const linking = {",
  "  config: {",
  "    screens: {",
  '      Home: "",',
  '      Orders: "orders",',
  "    },",
  "  },",
  "};",
  "",
  "export default function App() {",
  "  return (",
  "    <SafeAreaProvider>",
  '      <StatusBar barStyle="dark-content" />',
  "      <NavigationContainer linking={linking}>",
  '        <Stack.Navigator screenOptions={{ headerShown: false }}>',
  '          <Stack.Screen name="Home" component={HomeScreen} />',
  '          <Stack.Screen name="Orders" component={OrdersScreen} />',
  "        </Stack.Navigator>",
  "      </NavigationContainer>",
  "    </SafeAreaProvider>",
  "  );",
  "}",
].join("\n");

const MOBILE_REACT_NATIVE_CLI_HOME_SCREEN_CODE = [
  'import { Pressable, StyleSheet, Text, View } from "react-native";',
  'import { useLinkTo } from "@react-navigation/native";',
  "",
  'import { VoiceNavigator } from "../components/VoiceNavigator";',
  "",
  "export default function HomeScreen() {",
  "  const linkTo = useLinkTo();",
  "",
  "  return (",
  '    <View style={styles.screen}>',
  '      <View style={styles.card}>',
  '        <Text style={styles.eyebrow}>NAVAI MOBILE DEMO</Text>',
  '        <Text style={styles.title}>Realtime voice sandbox</Text>',
  '        <Text style={styles.copy}>',
  '          Use the Orb below to start a session and ask NAVAI to open Orders.',
  "        </Text>",
  "        <VoiceNavigator />",
  '        <Pressable onPress={() => linkTo("/orders")} style={styles.linkButton}>',
  '          <Text style={styles.linkButtonText}>Open Orders manually</Text>',
  "        </Pressable>",
  "      </View>",
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
  '    width: "100%",',
  "  },",
  "  eyebrow: {",
  '    color: "#0F766E",',
  '    fontSize: 12,',
  '    fontWeight: "700",',
  "    letterSpacing: 1.1,",
  "  },",
  "  title: {",
  '    color: "#0F172A",',
  "    fontSize: 28,",
  '    fontWeight: "700",',
  "  },",
  "  copy: {",
  '    color: "#475569",',
  "    fontSize: 15,",
  "    lineHeight: 22,",
  "  },",
  "  linkButton: {",
  '    alignSelf: "center",',
  "  },",
  "  linkButtonText: {",
  '    color: "#0F766E",',
  "    fontSize: 15,",
  '    fontWeight: "600",',
  "  },",
  "});",
].join("\n");

const MOBILE_REACT_NATIVE_CLI_ORDERS_SCREEN_CODE = [
  'import { Pressable, StyleSheet, Text, View } from "react-native";',
  'import { useLinkTo } from "@react-navigation/native";',
  "",
  "export default function OrdersScreen() {",
  "  const linkTo = useLinkTo();",
  "",
  "  return (",
  '    <View style={styles.screen}>',
  '      <Text style={styles.title}>Orders</Text>',
  '      <Text style={styles.copy}>',
  '        NAVAI reached this route. Keep one simple real screen like this to validate voice navigation.',
  "      </Text>",
  '      <Pressable onPress={() => linkTo("/")} style={styles.linkButton}>',
  '        <Text style={styles.linkButtonText}>Back to home</Text>',
  "      </Pressable>",
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
  "    fontSize: 30,",
  '    fontWeight: "700",',
  "  },",
  "  copy: {",
  '    color: "#475569",',
  "    fontSize: 15,",
  "    lineHeight: 22,",
  "    marginTop: 12,",
  "    maxWidth: 320,",
  '    textAlign: "center",',
  "  },",
  "  linkButton: {",
  "    marginTop: 20,",
  "  },",
  "  linkButtonText: {",
  '    color: "#0F766E",',
  "    fontSize: 15,",
  '    fontWeight: "600",',
  "  },",
  "});",
].join("\n");

const MOBILE_REACT_NATIVE_CLI_SHARED_CODE_BY_LABEL: Readonly<
  Record<string, string>
> = {
  "App.tsx": MOBILE_REACT_NATIVE_CLI_APP_CODE,
  "android/gradle.properties":
    MOBILE_REACT_NATIVE_CLI_ANDROID_GRADLE_PROPERTIES_CODE,
  "android/app/src/main/AndroidManifest.xml":
    MOBILE_REACT_NATIVE_CLI_ANDROID_MANIFEST_CODE,
  "src/screens/HomeScreen.tsx": MOBILE_REACT_NATIVE_CLI_HOME_SCREEN_CODE,
  "src/screens/OrdersScreen.tsx": MOBILE_REACT_NATIVE_CLI_ORDERS_SCREEN_CODE,
  "src/components/VoiceNavigator.tsx":
    MOBILE_REACT_NATIVE_CLI_VOICE_NAVIGATOR_CODE,
};

function buildMobileReactNativeCliTranslatedTab(
  copy: MobileReactNativeCliTranslatedTab,
): InstallationGuideTab {
  return {
    value: "react-native-cli",
    label: "React Native CLI",
    title: "React Native CLI",
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
            code: MOBILE_REACT_NATIVE_CLI_CREATE_APP_CODE,
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
            code: MOBILE_REACT_NATIVE_CLI_INSTALL_CODE,
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
            label: "src/ai/env.ts",
            language: "typescript",
            code: MOBILE_REACT_NATIVE_CLI_ENV_CODE,
          },
          {
            label: "android/gradle.properties",
            language: "properties",
            code: "",
          },
          {
            label: "android/app/src/main/AndroidManifest.xml",
            language: "xml",
            code: "",
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
            code: MOBILE_REACT_NATIVE_CLI_ROUTES_CODE,
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
            code: MOBILE_REACT_NATIVE_CLI_VIBRATE_CODE,
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
            label: "App.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "src/screens/HomeScreen.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "src/screens/OrdersScreen.tsx",
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
            label: copy.labels.developmentBuild,
            language: "bash",
            code: MOBILE_REACT_NATIVE_CLI_BUILD_CODE,
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

const MOBILE_REACT_NATIVE_CLI_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  es: {
    value: "react-native-cli",
    label: "React Native CLI",
    title: "React Native CLI",
    description:
      "Integracion bare con control total del setup nativo. En Android, use esta guia solo con React Native `0.81.5` y `newArchEnabled=false`.",
    sections: [
      {
        id: "paso-1-crear-app-mobile",
        title: "Paso 1 Crear app",
        description:
          "Inicialice la app bare con React Native CLI y prepare la carpeta `src/ai/functions-modules` donde NAVAI resolvera tools locales.",
        bullets: [
          "Esta ruta es util si ya tiene una app con codigo nativo propio o un monorepo mobile.",
          "En esta guia use `--version 0.81.5`: React Native 0.82+ ya no permite volver a Legacy Architecture y este flujo con `react-native-webrtc` puede cerrar la app al conectar el Orb en Android. Si su app ya esta en 0.82+, recree el demo en 0.81.5 antes de probar NAVAI.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: MOBILE_REACT_NATIVE_CLI_CREATE_APP_CODE,
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-nativas-mobile",
        title: "Paso 2 Dependencias",
        description:
          "Instale `@navai/voice-mobile`, `@openai/agents`, `zod`, `react-native-webrtc` y los paquetes de navegacion que resolveran paths a screens.",
        bullets: [
          "Sin Expo debe encargarse usted mismo del sync nativo normal de Gradle o iOS cuando aplique.",
          "Si su proyecto React Native CLI ya existe, actualice a `@navai/voice-mobile` 0.1.4+ para usar `transportOptions` en Android bare.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install @navai/voice-mobile @openai/agents zod@^4 react-native-webrtc @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context",
          },
        ],
      },
      {
        id: "paso-3-configurar-entorno-y-red-mobile",
        title: "Paso 3 Entorno",
        description:
          "Como React Native CLI no expone `.env` por defecto, cree un objeto `NAVAI_ENV` propio y centralice ahi `NAVAI_API_URL`, `NAVAI_FUNCTIONS_FOLDERS` y `NAVAI_ROUTES_FILE`.",
        bullets: [
          "En pruebas mobile reales use la URL HTTPS publica que entrega `ngrok http 3000`, no `localhost`.",
          "Reserve `10.0.2.2` solo para Android emulator cuando quiera probar sin ngrok.",
          "En Android deje `newArchEnabled=false` en `android/gradle.properties` y haga un rebuild limpio para evitar que el Orb cierre la app al conectar en este demo.",
        ],
        codeBlocks: [
          {
            label: "src/ai/env.ts",
            language: "typescript",
            code: MOBILE_REACT_NATIVE_CLI_ENV_CODE,
          },
          {
            label: "android/gradle.properties",
            language: "properties",
            code: MOBILE_REACT_NATIVE_CLI_ANDROID_GRADLE_PROPERTIES_CODE,
          },
          {
            label: "android/app/src/main/AndroidManifest.xml",
            language: "xml",
            code: "",
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
          "Resuelva `runtime` con `resolveNavaiMobileApplicationRuntimeConfig`, conecte `useMobileVoiceAgent` y navegue por path con `useLinkTo()` o su adapter equivalente.",
        bullets: [
          "Mantenga `NAVAI_ENV` en un modulo unico para evitar URLs distintas entre Metro, emulador y dispositivo.",
          "Con `@navai/voice-mobile` 0.1.4+, pase `transportOptions` solo en Android bare cuando necesite `rtcConfiguration`, `audioConstraints` o `remoteAudioTrackVolume` explicitos.",
        ],
        codeBlocks: [
          {
            label: "App.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "src/screens/HomeScreen.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "src/screens/OrdersScreen.tsx",
            language: "tsx",
            code: "",
          },
        ],
      },
      {
        id: "paso-7-compilar-y-probar-mobile",
        title: "Paso 7 Compilar y probar en dispositivo",
        description:
          "Genere loaders y despliegue con React Native CLI para validar microfono, navegacion por path y ejecucion local + backend.",
        bullets: [
          "Mantenga `ngrok http 3000` activo mientras prueba en dispositivo fisico.",
          "Si solo prueba en Android emulator, `10.0.2.2` sigue siendo valido.",
          "Si cambia `android/gradle.properties` o permisos nativos, haga un rebuild limpio antes de volver a probar.",
          "Si la API ya devuelve `client-secret` pero la app se cierra al tocar el Orb, confirme que el proyecto fue creado con `--version 0.81.5`, sigue con `newArchEnabled=false` y fue recompilado en limpio.",
          "Si en Metro aparece `rn-webrtc:pc:DEBUG ... setLocalDescription` y enseguida `Fatal signal 6 (SIGABRT)` con `libjingle_peerconnection_so.so`, tratelo como un crash nativo de `react-native-webrtc`, no como un error del backend de NAVAI.",
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
            code: MOBILE_REACT_NATIVE_CLI_BUILD_CODE,
          },
          {
            label: "Checklist de validacion",
            language: "text",
            code: "1. Inicie el backend en el puerto 3000 y ejecute `ngrok http 3000`.\n2. Copie la URL HTTPS publica de ngrok en `src/ai/env.ts`.\n3. Confirme que el proyecto fue creado con `--version 0.81.5` y que `android/gradle.properties` sigue con `newArchEnabled=false`.\n4. Genere loaders.\n5. Ejecute un rebuild limpio y luego `npx react-native run-android`.\n6. Instale la app en Android emulator o dispositivo fisico.\n7. Permita el acceso al microfono.\n8. Pida a NAVAI abrir Orders y ejecutar vibrate device.",
          },
        ],
      },
    ],
  },
  en: {
    value: "react-native-cli",
    label: "React Native CLI",
    title: "React Native CLI",
    description:
      "Bare integration with full control over native setup. On Android, use this guide only with React Native `0.81.5` and `newArchEnabled=false`.",
    sections: [
      {
        id: "paso-1-crear-app-mobile",
        title: "Step 1 App setup",
        description:
          "Initialize the bare app with React Native CLI and prepare `src/ai/functions-modules` where NAVAI will resolve local tools.",
        bullets: [
          "This path fits teams that already own custom native code or a mobile monorepo.",
          "In this guide, use `--version 0.81.5`: React Native 0.82+ no longer allows Android apps to fall back to Legacy Architecture, and this `react-native-webrtc` flow can close the app when the Orb connects. If your app already runs on 0.82+, recreate the demo on 0.81.5 before testing NAVAI.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: MOBILE_REACT_NATIVE_CLI_CREATE_APP_CODE,
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias-nativas-mobile",
        title: "Step 2 Dependencies",
        description:
          "Install `@navai/voice-mobile`, `@openai/agents`, `zod`, `react-native-webrtc`, and the navigation packages that will resolve paths into screens.",
        bullets: [
          "Without Expo, you own the usual Gradle or iOS native sync steps when they apply.",
          "If your React Native CLI project already exists, update to `@navai/voice-mobile` 0.1.4+ so you can use `transportOptions` on Android bare.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install @navai/voice-mobile @openai/agents zod@^4 react-native-webrtc @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context",
          },
        ],
      },
      {
        id: "paso-3-configurar-entorno-y-red-mobile",
        title: "Step 3 Environment",
        description:
          "Because React Native CLI does not expose `.env` values by default, create your own `NAVAI_ENV` object and keep `NAVAI_API_URL`, `NAVAI_FUNCTIONS_FOLDERS`, and `NAVAI_ROUTES_FILE` there.",
        bullets: [
          "For real mobile tests, use the public HTTPS URL returned by `ngrok http 3000`, not `localhost`.",
          "Keep `10.0.2.2` only for Android emulator runs when you intentionally skip ngrok.",
          "On Android, keep `newArchEnabled=false` in `android/gradle.properties` and run a clean rebuild so the Orb does not close the app on connect in this demo.",
        ],
        codeBlocks: [
          {
            label: "src/ai/env.ts",
            language: "typescript",
            code: MOBILE_REACT_NATIVE_CLI_ENV_CODE,
          },
          {
            label: "android/gradle.properties",
            language: "properties",
            code: MOBILE_REACT_NATIVE_CLI_ANDROID_GRADLE_PROPERTIES_CODE,
          },
          {
            label: "android/app/src/main/AndroidManifest.xml",
            language: "xml",
            code: "",
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
          "Resolve `runtime` with `resolveNavaiMobileApplicationRuntimeConfig`, connect `useMobileVoiceAgent`, and navigate by path with `useLinkTo()` or your equivalent adapter.",
        bullets: [
          "Keep `NAVAI_ENV` in a single module so Metro, emulator, and device do not drift to different backend URLs.",
          "With `@navai/voice-mobile` 0.1.4+, pass `transportOptions` only on Android bare when you need explicit `rtcConfiguration`, `audioConstraints`, or `remoteAudioTrackVolume`.",
        ],
        codeBlocks: [
          {
            label: "App.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "src/screens/HomeScreen.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "src/components/VoiceNavigator.tsx",
            language: "tsx",
            code: "",
          },
          {
            label: "src/screens/OrdersScreen.tsx",
            language: "tsx",
            code: "",
          },
        ],
      },
      {
        id: "paso-7-compilar-y-probar-mobile",
        title: "Step 7 Build and test on device",
        description:
          "Generate loaders and deploy with React Native CLI to validate microphone access, path navigation, and local plus backend execution.",
        bullets: [
          "Keep `ngrok http 3000` running while you test on a physical device.",
          "If you only test on the Android emulator, `10.0.2.2` is still valid.",
          "Run a clean rebuild after changing `android/gradle.properties` or native permissions.",
          "If the API already returns `client-secret` but the app closes when you tap the Orb, confirm the project was created with `--version 0.81.5`, still uses `newArchEnabled=false`, and was rebuilt cleanly.",
          "If Metro shows `rn-webrtc:pc:DEBUG ... setLocalDescription` and then `Fatal signal 6 (SIGABRT)` with `libjingle_peerconnection_so.so`, treat it as a native `react-native-webrtc` crash, not a NAVAI backend error.",
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
            code: "npx react-native run-android",
          },
          {
            label: "Validation checklist",
            language: "text",
            code: "1. Start the backend on port 3000 and run `ngrok http 3000`.\n2. Copy the public HTTPS ngrok URL into `src/ai/env.ts`.\n3. Confirm the project was created with `--version 0.81.5` and that `android/gradle.properties` still uses `newArchEnabled=false`.\n4. Generate loaders.\n5. Run a clean rebuild and then `npx react-native run-android`.\n6. Install the app on Android emulator or physical device.\n7. Allow microphone access.\n8. Ask NAVAI to open Orders and run vibrate device.",
          },
        ],
      },
    ],
  },
};

const MOBILE_REACT_NATIVE_CLI_ADDITIONAL_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  pt: buildMobileReactNativeCliTranslatedTab({
    description:
      "Integracao bare com controle total do setup nativo. No Android, use este guia apenas com React Native `0.81.5` e `newArchEnabled=false`.",
    labels: {
      terminal: "Terminal",
      generateLoaders: "Gerar module loaders",
      developmentBuild: "Build de desenvolvimento",
      validationChecklist: "Checklist de validacao",
    },
    sections: {
      step1: {
        title: "Passo 1 App",
        description:
          "Inicialize a app bare com React Native CLI e prepare `src/ai/functions-modules` para as tools locais do NAVAI.",
        bullets: [
          "Esse caminho faz sentido quando voce ja controla o codigo nativo do app.",
          "Neste guia, use `--version 0.81.5`: React Native 0.82+ ja nao permite voltar para Legacy Architecture e esse fluxo com `react-native-webrtc` pode fechar o app quando o Orb conecta no Android. Se o seu app ja esta em 0.82+, recrie o demo em 0.81.5 antes de testar NAVAI.",
        ],
      },
      step2: {
        title: "Passo 2 Dependencias",
        description:
          "Instale `@navai/voice-mobile`, `@openai/agents`, `zod`, `react-native-webrtc` e os pacotes de navegacao.",
        bullets: [
          "Sem Expo, o sync nativo de Android e iOS fica sob sua responsabilidade.",
          "Se o seu projeto React Native CLI ja existe, atualize para `@navai/voice-mobile` 0.1.4+ para usar `transportOptions` no Android bare.",
        ],
      },
      step3: {
        title: "Passo 3 Ambiente",
        description:
          "Como React Native CLI nao expoe `.env` por padrao, centralize `NAVAI_API_URL`, `NAVAI_FUNCTIONS_FOLDERS` e `NAVAI_ROUTES_FILE` em `src/ai/env.ts`.",
        bullets: [
          "Para testes mobile reais, use a URL HTTPS publica gerada por `ngrok http 3000`, nao `localhost`.",
          "Reserve `10.0.2.2` apenas para Android emulator quando quiser testar sem ngrok.",
          "No Android, deixe `newArchEnabled=false` em `android/gradle.properties` e faca um rebuild limpo para evitar que o Orb feche o app ao conectar neste demo.",
        ],
      },
      step4: {
        title: "Passo 4 Rotas de navegacao",
        description:
          "Defina `NavaiRoute[]` para as telas que o assistente pode abrir e adicione sinonimos de negocio que combinem com a fala do usuario.",
        bullets: [
          "Com React Navigation, mantenha o linking por path apontando para a screen correta.",
        ],
      },
      step5: {
        title: "Passo 5 Definir funcoes",
        description:
          "Comece com uma funcao local simples para provar a execucao no dispositivo antes de delegar ao backend.",
        bullets: [
          "Funcoes locais podem usar APIs do React Native como `Vibration`.",
        ],
      },
      step6: {
        title: "Passo 6 Integrar runtime mobile",
        description:
          "Resolva `runtime`, conecte `useMobileVoiceAgent` ao Orb da libraria e navegue por path com `useLinkTo()` ou o adapter equivalente.",
        bullets: [
          "Mantenha `NAVAI_ENV` em um unico modulo para nao divergir entre Metro, emulador e dispositivo.",
          "Com `@navai/voice-mobile` 0.1.4+, passe `transportOptions` apenas no Android bare quando precisar de `rtcConfiguration`, `audioConstraints` ou `remoteAudioTrackVolume` explicitos.",
        ],
      },
      step7: {
        title: "Passo 7 Compilar e testar",
        description:
          "Gere loaders e implante com React Native CLI para validar microfone, navegacao e execucao local mais backend.",
        bullets: [
          "Mantenha `ngrok http 3000` ativo enquanto testa em dispositivo fisico.",
          "Se for testar apenas no Android emulator, `10.0.2.2` continua valido.",
          "Depois de mudar `android/gradle.properties` ou permissoes nativas, faca um rebuild limpo antes de testar de novo.",
          "Se a API ja devolver `client-secret` mas o app fechar ao tocar o Orb, confirme que o projeto foi criado com `--version 0.81.5`, ainda usa `newArchEnabled=false` e foi recompilado de forma limpa.",
          "Se no Metro aparecer `rn-webrtc:pc:DEBUG ... setLocalDescription` e logo depois `Fatal signal 6 (SIGABRT)` com `libjingle_peerconnection_so.so`, trate isso como um crash nativo de `react-native-webrtc`, nao como erro do backend NAVAI.",
        ],
        checklist:
          "1. Inicie o backend na porta 3000 e execute `ngrok http 3000`.\n2. Copie a URL HTTPS publica do ngrok para `src/ai/env.ts`.\n3. Confirme que o projeto foi criado com `--version 0.81.5` e que `android/gradle.properties` ainda usa `newArchEnabled=false`.\n4. Gere loaders.\n5. Faca um rebuild limpo e depois execute `npx react-native run-android`.\n6. Instale o app no Android emulator ou em um dispositivo fisico.\n7. Permita o acesso ao microfone.\n8. Peca ao NAVAI para abrir Orders e executar vibrate device.",
      },
    },
  }),
  fr: buildMobileReactNativeCliTranslatedTab({
    description:
      "Integration bare avec controle complet du setup natif. Sur Android, utilisez ce guide uniquement avec React Native `0.81.5` et `newArchEnabled=false`.",
    labels: {
      terminal: "Terminal",
      generateLoaders: "Generer les module loaders",
      developmentBuild: "Build de developpement",
      validationChecklist: "Checklist de validation",
    },
    sections: {
      step1: {
        title: "Etape 1 Application",
        description:
          "Initialisez l'application bare avec React Native CLI et preparez `src/ai/functions-modules` pour les outils locaux NAVAI.",
        bullets: [
          "Cette voie convient si vous maitrisez deja le code natif de l'application.",
          "Dans ce guide, utilisez `--version 0.81.5` : React Native 0.82+ ne permet plus de revenir a la Legacy Architecture et ce flux avec `react-native-webrtc` peut fermer l'app quand l'Orb se connecte sur Android. Si votre app tourne deja en 0.82+, recreez la demo en 0.81.5 avant de tester NAVAI.",
        ],
      },
      step2: {
        title: "Etape 2 Dependances",
        description:
          "Installez `@navai/voice-mobile`, `@openai/agents`, `zod`, `react-native-webrtc` et les paquets de navigation.",
        bullets: [
          "Sans Expo, vous gardez la charge du sync natif Android et iOS.",
          "Si votre projet React Native CLI existe deja, mettez a jour vers `@navai/voice-mobile` 0.1.4+ pour utiliser `transportOptions` sur Android bare.",
        ],
      },
      step3: {
        title: "Etape 3 Environnement",
        description:
          "Comme React Native CLI n'expose pas `.env` par defaut, centralisez `NAVAI_API_URL`, `NAVAI_FUNCTIONS_FOLDERS` et `NAVAI_ROUTES_FILE` dans `src/ai/env.ts`.",
        bullets: [
          "Pour des tests mobile reels, utilisez l'URL HTTPS publique fournie par `ngrok http 3000`, pas `localhost`.",
          "Gardez `10.0.2.2` seulement pour Android emulator si vous testez sans ngrok.",
          "Sur Android, laissez `newArchEnabled=false` dans `android/gradle.properties` et lancez un rebuild propre pour eviter que l'Orb ferme l'app a la connexion dans cette demo.",
        ],
      },
      step4: {
        title: "Etape 4 Routes de navigation",
        description:
          "Definissez `NavaiRoute[]` pour les ecrans que l'assistant peut ouvrir et ajoutez des synonymes metier adaptes a la facon de parler des utilisateurs.",
        bullets: [
          "Avec React Navigation, gardez le linking par path aligne sur la bonne screen.",
        ],
      },
      step5: {
        title: "Etape 5 Definir les fonctions",
        description:
          "Commencez par une fonction locale simple afin de prouver l'execution sur l'appareil avant de deleguer au backend.",
        bullets: [
          "Les fonctions locales peuvent utiliser des APIs React Native comme `Vibration`.",
        ],
      },
      step6: {
        title: "Etape 6 Integrer le runtime mobile",
        description:
          "Resolvez `runtime`, connectez `useMobileVoiceAgent` a l'Orb de la librairie et naviguez par path avec `useLinkTo()` ou un adaptateur equivalent.",
        bullets: [
          "Gardez `NAVAI_ENV` dans un seul module pour eviter les divergences entre Metro, emulateur et appareil.",
          "Avec `@navai/voice-mobile` 0.1.4+, passez `transportOptions` uniquement sur Android bare quand vous avez besoin de `rtcConfiguration`, `audioConstraints` ou `remoteAudioTrackVolume` explicites.",
        ],
      },
      step7: {
        title: "Etape 7 Compiler et tester",
        description:
          "Generez les loaders et deployeez avec React Native CLI pour valider micro, navigation et execution locale plus backend.",
        bullets: [
          "Gardez `ngrok http 3000` actif pendant les tests sur appareil physique.",
          "Si vous testez seulement sur Android emulator, `10.0.2.2` reste valide.",
          "Apres une modification de `android/gradle.properties` ou des permissions natives, relancez un rebuild propre avant de retester.",
          "Si l'API renvoie deja `client-secret` mais que l'app se ferme quand vous touchez l'Orb, verifiez que le projet a ete cree avec `--version 0.81.5`, garde `newArchEnabled=false` et a ete reconstruit proprement.",
          "Si Metro affiche `rn-webrtc:pc:DEBUG ... setLocalDescription` puis `Fatal signal 6 (SIGABRT)` avec `libjingle_peerconnection_so.so`, traitez cela comme un crash natif de `react-native-webrtc`, pas comme une erreur du backend NAVAI.",
        ],
        checklist:
          "1. Demarrez le backend sur le port 3000 et lancez `ngrok http 3000`.\n2. Copiez l'URL HTTPS publique de ngrok dans `src/ai/env.ts`.\n3. Confirmez que le projet a ete cree avec `--version 0.81.5` et que `android/gradle.properties` garde `newArchEnabled=false`.\n4. Generez les loaders.\n5. Lancez un rebuild propre puis `npx react-native run-android`.\n6. Installez l'application sur Android emulator ou appareil physique.\n7. Autorisez l'acces au micro.\n8. Demandez a NAVAI d'ouvrir Orders et d'executer vibrate device.",
      },
    },
  }),
  hi: buildMobileReactNativeCliTranslatedTab({
    description:
      "Bare integration with full native setup control. Android par is guide ko sirf React Native `0.81.5` aur `newArchEnabled=false` ke saath use karein.",
    labels: {
      terminal: "Terminal",
      generateLoaders: "Module loaders generate karein",
      developmentBuild: "Development build",
      validationChecklist: "Validation checklist",
    },
    sections: {
      step1: {
        title: "Charan 1 App setup",
        description:
          "React Native CLI ke saath bare app initialize karein aur NAVAI local tools ke liye `src/ai/functions-modules` tayyar karein.",
        bullets: [
          "Yeh path tab useful hai jab aap native code ko khud control karte hain.",
          "Is guide me `--version 0.81.5` hi use karein: React Native 0.82+ Android par Legacy Architecture par wapas jane nahi deta aur `react-native-webrtc` ke saath Orb connect hote hi app band ho sakti hai. Agar aapka app pehle se 0.82+ par hai to NAVAI test karne se pehle demo ko 0.81.5 par dobara banayein.",
        ],
      },
      step2: {
        title: "Charan 2 Dependencies",
        description:
          "`@navai/voice-mobile`, `@openai/agents`, `zod`, `react-native-webrtc` aur navigation packages install karein.",
        bullets: [
          "Expo ke bina Android aur iOS native sync aapko khud maintain karna hota hai.",
          "Agar aapka React Native CLI project pehle se bana hua hai to `@navai/voice-mobile` 0.1.4+ par update karein taki Android bare par `transportOptions` use kar sakein.",
        ],
      },
      step3: {
        title: "Charan 3 Environment",
        description:
          "React Native CLI `.env` ko by default expose nahi karta, isliye `NAVAI_API_URL`, `NAVAI_FUNCTIONS_FOLDERS` aur `NAVAI_ROUTES_FILE` ko `src/ai/env.ts` me rakhein.",
        bullets: [
          "Real mobile test ke liye `ngrok http 3000` se mili public HTTPS URL use karein, `localhost` nahi.",
          "`10.0.2.2` ko sirf Android emulator ke liye rakhein jab aap ngrok skip kar rahe hon.",
          "Android par `android/gradle.properties` me `newArchEnabled=false` rakhein aur clean rebuild karein taki is demo me Orb connect hote hi app band na ho.",
        ],
      },
      step4: {
        title: "Charan 4 Navigation routes",
        description:
          "`NavaiRoute[]` define karein un screens ke liye jinhe assistant khol sakta hai aur business synonyms add karein.",
        bullets: [
          "React Navigation ke saath path-based linking ko sahi screen par map karke rakhein.",
        ],
      },
      step5: {
        title: "Charan 5 Functions define karein",
        description:
          "Ek simple local function se shuru karein taki backend par jane se pehle device-side execution prove ho sake.",
        bullets: [
          "Local functions `Vibration` jaise React Native APIs use kar sakte hain.",
        ],
      },
      step6: {
        title: "Charan 6 Mobile runtime integrate karein",
        description:
          "`runtime` resolve karein, library Orb ko `useMobileVoiceAgent` se connect karein aur `useLinkTo()` ya equivalent adapter se path navigation chalayein.",
        bullets: [
          "`NAVAI_ENV` ko ek hi module me rakhein taki Metro, emulator aur device alag URLs na use karein.",
          "`@navai/voice-mobile` 0.1.4+ ke saath, `transportOptions` ko sirf Android bare par pass karein jab aapko explicit `rtcConfiguration`, `audioConstraints`, ya `remoteAudioTrackVolume` chahiye.",
        ],
      },
      step7: {
        title: "Charan 7 Build aur test",
        description:
          "Loaders generate karein aur React Native CLI se deploy karke microphone, navigation aur local plus backend execution validate karein.",
        bullets: [
          "Physical device par test karte waqt `ngrok http 3000` ko chalu rakhein.",
          "Agar aap sirf Android emulator par test kar rahe hain to `10.0.2.2` ab bhi valid hai.",
          "`android/gradle.properties` ya native permissions badalne ke baad clean rebuild karke phir test karein.",
          "Agar API `client-secret` de rahi hai lekin Orb tap karte hi app band ho jati hai to confirm karein ki project `--version 0.81.5` se bana tha, `newArchEnabled=false` ab bhi laga hua hai, aur app ko clean rebuild kiya gaya hai.",
          "Agar Metro me `rn-webrtc:pc:DEBUG ... setLocalDescription` dikhne ke turant baad `Fatal signal 6 (SIGABRT)` aur `libjingle_peerconnection_so.so` dikhe, to use `react-native-webrtc` ka native crash samjhein, NAVAI backend error nahi.",
        ],
        checklist:
          "1. Backend ko port 3000 par start karke `ngrok http 3000` chalayein.\n2. Public HTTPS ngrok URL ko `src/ai/env.ts` me rakhein.\n3. Confirm karein ki project `--version 0.81.5` se bana tha aur `android/gradle.properties` me ab bhi `newArchEnabled=false` hai.\n4. Loaders generate karein.\n5. Clean rebuild karke phir `npx react-native run-android` chalayein.\n6. App ko Android emulator ya physical device par install karein.\n7. Microphone access allow karein.\n8. NAVAI se Orders kholne aur vibrate device chalane ko kahen.",
      },
    },
  }),
  ja: buildMobileReactNativeCliTranslatedTab({
    description:
      "ネイティブ設定を完全に管理する bare integration。Android では React Native `0.81.5` と `newArchEnabled=false` の場合にのみこのガイドを使ってください。",
    labels: {
      terminal: "Terminal",
      generateLoaders: "module loaders を生成",
      developmentBuild: "Development build",
      validationChecklist: "検証チェックリスト",
    },
    sections: {
      step1: {
        title: "手順 1 アプリ設定",
        description:
          "React Native CLI で bare app を初期化し、NAVAI のローカル tools 用に `src/ai/functions-modules` を準備します。",
        bullets: [
          "既に native code を自分たちで管理しているチーム向けです。",
          "このガイドでは `--version 0.81.5` を使ってください。React Native 0.82+ では Legacy Architecture に戻れず、`react-native-webrtc` で Orb 接続時に Android アプリが終了することがあります。すでに 0.82+ の app がある場合は、NAVAI を試す前に demo を 0.81.5 で作り直してください。",
        ],
      },
      step2: {
        title: "手順 2 依存関係",
        description:
          "`@navai/voice-mobile`、`@openai/agents`、`zod`、`react-native-webrtc`、navigation packages をインストールします。",
        bullets: [
          "Expo を使わないため、Android と iOS の native sync は自分で管理します。",
          "React Native CLI の project が既にある場合は、Android bare で `transportOptions` を使えるように `@navai/voice-mobile` 0.1.4+ に更新してください。",
        ],
      },
      step3: {
        title: "手順 3 環境",
        description:
          "React Native CLI は `.env` をそのまま公開しないので、`NAVAI_API_URL`、`NAVAI_FUNCTIONS_FOLDERS`、`NAVAI_ROUTES_FILE` を `src/ai/env.ts` にまとめます。",
        bullets: [
          "実機テストでは `localhost` ではなく、`ngrok http 3000` が返す公開 HTTPS URL を使ってください。",
          "`10.0.2.2` は ngrok を使わずに Android emulator を試す時だけ残します。",
          "Android では `android/gradle.properties` に `newArchEnabled=false` を入れ、clean rebuild を行って、このデモで Orb 接続時にアプリが終了しないようにします。",
        ],
      },
      step4: {
        title: "手順 4 ナビゲーションルート",
        description:
          "アシスタントが開ける画面に対して `NavaiRoute[]` を定義し、話し方に合う business synonyms を追加します。",
        bullets: [
          "React Navigation では path-based linking を正しい screen に向けてください。",
        ],
      },
      step5: {
        title: "手順 5 関数を定義",
        description:
          "backend に委譲する前に端末側実行を確認するため、まずは単純なローカル関数から始めます。",
        bullets: [
          "ローカル関数では `Vibration` などの React Native API を使えます。",
        ],
      },
      step6: {
        title: "手順 6 mobile runtime 統合",
        description:
          "`runtime` を解決し、library Orb を `useMobileVoiceAgent` に接続し、`useLinkTo()` または同等の adapter で path navigation を行います。",
        bullets: [
          "Metro、emulator、device で URL がずれないように `NAVAI_ENV` を 1 つの module にまとめてください。",
          "`@navai/voice-mobile` 0.1.4+ では、明示的な `rtcConfiguration`、`audioConstraints`、`remoteAudioTrackVolume` が必要な時だけ Android bare で `transportOptions` を渡してください。",
        ],
      },
      step7: {
        title: "手順 7 ビルドと検証",
        description:
          "loaders を生成し、React Native CLI で配布して microphone、navigation、local と backend の実行を検証します。",
        bullets: [
          "実機テスト中は `ngrok http 3000` を起動したままにしてください。",
          "Android emulator だけを試すなら `10.0.2.2` も引き続き使えます。",
          "`android/gradle.properties` や native permissions を変えた後は、再テスト前に clean rebuild を実行してください。",
          "API が既に `client-secret` を返しているのに Orb を押すとアプリが終了する場合は、プロジェクトが `--version 0.81.5` で作成され、`newArchEnabled=false` のままで、clean rebuild 済みか確認してください。",
          "Metro に `rn-webrtc:pc:DEBUG ... setLocalDescription` が出た直後に `Fatal signal 6 (SIGABRT)` と `libjingle_peerconnection_so.so` が見える場合は、NAVAI backend ではなく `react-native-webrtc` の native crash として扱ってください。",
        ],
        checklist:
          "1. backend をポート 3000 で起動し、`ngrok http 3000` を実行します。\n2. 公開 HTTPS URL を `src/ai/env.ts` に設定します。\n3. プロジェクトが `--version 0.81.5` で作成され、`android/gradle.properties` が `newArchEnabled=false` のままか確認します。\n4. loaders を生成します。\n5. clean rebuild を実行してから `npx react-native run-android` を実行します。\n6. Android emulator または実機にアプリをインストールします。\n7. マイクアクセスを許可します。\n8. NAVAI に Orders を開いて vibrate device を実行するよう依頼します。",
      },
    },
  }),
  ko: buildMobileReactNativeCliTranslatedTab({
    description:
      "네이티브 설정을 직접 제어하는 bare integration. Android 에서는 React Native `0.81.5` 와 `newArchEnabled=false` 일 때만 이 가이드를 사용하세요.",
    labels: {
      terminal: "Terminal",
      generateLoaders: "module loaders 생성",
      developmentBuild: "Development build",
      validationChecklist: "검증 체크리스트",
    },
    sections: {
      step1: {
        title: "단계 1 앱 설정",
        description:
          "React Native CLI 로 bare app 을 초기화하고 NAVAI 로컬 tools 용 `src/ai/functions-modules` 를 준비합니다.",
        bullets: [
          "이미 native code 를 직접 관리하는 팀에 맞는 경로입니다.",
          "이 가이드에서는 `--version 0.81.5` 를 사용하세요. React Native 0.82+ 에서는 Legacy Architecture 로 돌아갈 수 없고 `react-native-webrtc` 와 함께 Orb 가 연결될 때 Android 앱이 종료될 수 있습니다. 이미 0.82+ 앱이 있다면 NAVAI 를 테스트하기 전에 demo 를 0.81.5 로 다시 만드세요.",
        ],
      },
      step2: {
        title: "단계 2 의존성",
        description:
          "`@navai/voice-mobile`, `@openai/agents`, `zod`, `react-native-webrtc`, navigation packages 를 설치합니다.",
        bullets: [
          "Expo 가 없으므로 Android 와 iOS native sync 는 직접 관리해야 합니다.",
          "React Native CLI 프로젝트가 이미 있다면 Android bare 에서 `transportOptions` 를 사용할 수 있도록 `@navai/voice-mobile` 0.1.4+ 로 업데이트하세요.",
        ],
      },
      step3: {
        title: "단계 3 환경",
        description:
          "React Native CLI 는 `.env` 를 그대로 노출하지 않으므로 `NAVAI_API_URL`, `NAVAI_FUNCTIONS_FOLDERS`, `NAVAI_ROUTES_FILE` 를 `src/ai/env.ts` 에 모읍니다.",
        bullets: [
          "실기기 테스트에서는 `localhost` 대신 `ngrok http 3000` 이 돌려주는 공개 HTTPS URL 을 사용하세요.",
          "`10.0.2.2` 는 ngrok 없이 Android emulator 를 테스트할 때만 남겨 두세요.",
          "Android 에서는 `android/gradle.properties` 에 `newArchEnabled=false` 를 유지하고 clean rebuild 를 실행해 이 데모에서 Orb 연결 시 앱이 종료되지 않도록 하세요.",
        ],
      },
      step4: {
        title: "단계 4 내비게이션 라우트",
        description:
          "assistant 가 열 수 있는 화면에 대해 `NavaiRoute[]` 를 정의하고 말투에 맞는 business synonyms 를 추가합니다.",
        bullets: [
          "React Navigation 에서는 path-based linking 이 올바른 screen 으로 가도록 유지하세요.",
        ],
      },
      step5: {
        title: "단계 5 함수 정의",
        description:
          "backend 로 넘기기 전에 기기에서 실행된다는 것을 확인할 수 있도록 간단한 로컬 함수부터 시작하세요.",
        bullets: [
          "로컬 함수는 `Vibration` 같은 React Native API 를 사용할 수 있습니다.",
        ],
      },
      step6: {
        title: "단계 6 mobile runtime 통합",
        description:
          "`runtime` 을 해석하고 library Orb 를 `useMobileVoiceAgent` 에 연결한 뒤 `useLinkTo()` 또는 동등한 adapter 로 path navigation 을 처리합니다.",
        bullets: [
          "Metro, emulator, device 에서 서로 다른 URL 이 되지 않도록 `NAVAI_ENV` 를 하나의 module 에 유지하세요.",
          "`@navai/voice-mobile` 0.1.4+ 에서는 명시적인 `rtcConfiguration`, `audioConstraints`, `remoteAudioTrackVolume` 이 필요할 때만 Android bare 에서 `transportOptions` 를 넘기세요.",
        ],
      },
      step7: {
        title: "단계 7 빌드와 테스트",
        description:
          "loaders 를 생성하고 React Native CLI 로 배포하여 microphone, navigation, local 과 backend 실행을 검증합니다.",
        bullets: [
          "실기기 테스트 중에는 `ngrok http 3000` 을 계속 켜 두세요.",
          "Android emulator 만 테스트한다면 `10.0.2.2` 도 계속 유효합니다.",
          "`android/gradle.properties` 나 native permissions 를 바꾼 뒤에는 다시 테스트하기 전에 clean rebuild 를 실행하세요.",
          "API 가 이미 `client-secret` 을 반환하는데 Orb 를 누르면 앱이 종료된다면 프로젝트가 `--version 0.81.5` 로 생성되었고 `newArchEnabled=false` 가 유지되며 clean rebuild 도 수행됐는지 확인하세요.",
          "Metro 에서 `rn-webrtc:pc:DEBUG ... setLocalDescription` 다음에 바로 `Fatal signal 6 (SIGABRT)` 와 `libjingle_peerconnection_so.so` 가 보이면, NAVAI backend 오류가 아니라 `react-native-webrtc` 의 native crash 로 보세요.",
        ],
        checklist:
          "1. backend 를 3000 포트에서 실행하고 `ngrok http 3000` 을 실행합니다.\n2. 공개 HTTPS URL 을 `src/ai/env.ts` 에 넣습니다.\n3. 프로젝트가 `--version 0.81.5` 로 생성되었고 `android/gradle.properties` 가 계속 `newArchEnabled=false` 인지 확인합니다.\n4. loaders 를 생성합니다.\n5. clean rebuild 를 실행한 뒤 `npx react-native run-android` 를 실행합니다.\n6. Android emulator 또는 실기기에 앱을 설치합니다.\n7. microphone 접근을 허용합니다.\n8. NAVAI 에게 Orders 를 열고 vibrate device 를 실행하라고 요청합니다.",
      },
    },
  }),
  ru: buildMobileReactNativeCliTranslatedTab({
    description:
      "Bare integration с полным контролем native setup. На Android используйте это руководство только с React Native `0.81.5` и `newArchEnabled=false`.",
    labels: {
      terminal: "Terminal",
      generateLoaders: "Сгенерировать module loaders",
      developmentBuild: "Development build",
      validationChecklist: "Чеклист проверки",
    },
    sections: {
      step1: {
        title: "Шаг 1 Настройка приложения",
        description:
          "Инициализируйте bare app через React Native CLI и подготовьте `src/ai/functions-modules` для локальных tools NAVAI.",
        bullets: [
          "Этот путь подходит, если вы уже сами управляете native code приложения.",
          "В этом руководстве используйте `--version 0.81.5`: в React Native 0.82+ уже нельзя вернуться к Legacy Architecture, и этот поток с `react-native-webrtc` может закрывать приложение при подключении Orb на Android. Если ваше app уже на 0.82+, пересоздайте demo на 0.81.5 перед тестом NAVAI.",
        ],
      },
      step2: {
        title: "Шаг 2 Зависимости",
        description:
          "Установите `@navai/voice-mobile`, `@openai/agents`, `zod`, `react-native-webrtc` и navigation packages.",
        bullets: [
          "Без Expo синхронизацию Android и iOS native слоев нужно вести вручную.",
          "Если проект React Native CLI у вас уже есть, обновитесь до `@navai/voice-mobile` 0.1.4+, чтобы использовать `transportOptions` на Android bare.",
        ],
      },
      step3: {
        title: "Шаг 3 Окружение",
        description:
          "Так как React Native CLI не отдает `.env` по умолчанию, держите `NAVAI_API_URL`, `NAVAI_FUNCTIONS_FOLDERS` и `NAVAI_ROUTES_FILE` в `src/ai/env.ts`.",
        bullets: [
          "Для реальных мобильных тестов используйте публичный HTTPS URL, который возвращает `ngrok http 3000`, а не `localhost`.",
          "`10.0.2.2` оставляйте только для Android emulator, если вы сознательно тестируете без ngrok.",
          "На Android держите `newArchEnabled=false` в `android/gradle.properties` и выполняйте clean rebuild, чтобы Orb не закрывал приложение при подключении в этом демо.",
        ],
      },
      step4: {
        title: "Шаг 4 Маршруты навигации",
        description:
          "Опишите `NavaiRoute[]` для экранов, которые ассистент может открывать, и добавьте business synonyms под речь пользователя.",
        bullets: [
          "В React Navigation держите path-based linking привязанным к правильной screen.",
        ],
      },
      step5: {
        title: "Шаг 5 Определить функции",
        description:
          "Начните с простой локальной функции, чтобы подтвердить выполнение на устройстве до делегирования в backend.",
        bullets: [
          "Локальные функции могут использовать React Native API, например `Vibration`.",
        ],
      },
      step6: {
        title: "Шаг 6 Интеграция mobile runtime",
        description:
          "Разрешите `runtime`, подключите library Orb к `useMobileVoiceAgent` и выполняйте path navigation через `useLinkTo()` или эквивалентный adapter.",
        bullets: [
          "Храните `NAVAI_ENV` в одном module, чтобы Metro, emulator и device не расходились по URL.",
          "С `@navai/voice-mobile` 0.1.4+ передавайте `transportOptions` только на Android bare, когда нужны явные `rtcConfiguration`, `audioConstraints` или `remoteAudioTrackVolume`.",
        ],
      },
      step7: {
        title: "Шаг 7 Сборка и проверка",
        description:
          "Сгенерируйте loaders и разверните через React Native CLI, чтобы проверить microphone, navigation и локальное плюс backend выполнение.",
        bullets: [
          "Во время тестов на физическом устройстве держите `ngrok http 3000` запущенным.",
          "Если вы тестируете только на Android emulator, `10.0.2.2` остается рабочим.",
          "После изменений в `android/gradle.properties` или native permissions выполните clean rebuild перед повторным тестом.",
          "Если API уже возвращает `client-secret`, но приложение закрывается при нажатии на Orb, проверьте, что проект создан с `--version 0.81.5`, все еще использует `newArchEnabled=false` и был пересобран начисто.",
          "Если в Metro видно `rn-webrtc:pc:DEBUG ... setLocalDescription`, а сразу после этого появляются `Fatal signal 6 (SIGABRT)` и `libjingle_peerconnection_so.so`, считайте это native crash из `react-native-webrtc`, а не ошибкой backend NAVAI.",
        ],
        checklist:
          "1. Запустите backend на порту 3000 и выполните `ngrok http 3000`.\n2. Скопируйте публичный HTTPS URL в `src/ai/env.ts`.\n3. Подтвердите, что проект создан с `--version 0.81.5` и что в `android/gradle.properties` по-прежнему стоит `newArchEnabled=false`.\n4. Сгенерируйте loaders.\n5. Выполните clean rebuild, а затем `npx react-native run-android`.\n6. Установите приложение на Android emulator или физическое устройство.\n7. Разрешите доступ к microphone.\n8. Попросите NAVAI открыть Orders и выполнить vibrate device.",
      },
    },
  }),
  zh: buildMobileReactNativeCliTranslatedTab({
    description:
      "可完全控制原生配置的 bare integration。Android 上仅在 React Native `0.81.5` 且 `newArchEnabled=false` 时使用这份指南。",
    labels: {
      terminal: "Terminal",
      generateLoaders: "生成 module loaders",
      developmentBuild: "Development build",
      validationChecklist: "验证清单",
    },
    sections: {
      step1: {
        title: "步骤 1 应用设置",
        description:
          "使用 React Native CLI 初始化 bare app，并准备 `src/ai/functions-modules` 作为 NAVAI 本地 tools 目录。",
        bullets: [
          "如果你的团队已经自己维护 native code，这条路径更合适。",
          "这份指南里请使用 `--version 0.81.5`。React Native 0.82+ 已无法回退到 Legacy Architecture，而这个 `react-native-webrtc` 流程在 Android 上可能会在 Orb 连接时直接关闭应用。如果你的 app 已经在 0.82+，请先用 0.81.5 重建 demo 再测试 NAVAI。",
        ],
      },
      step2: {
        title: "步骤 2 依赖",
        description:
          "安装 `@navai/voice-mobile`、`@openai/agents`、`zod`、`react-native-webrtc` 和 navigation packages。",
        bullets: [
          "不使用 Expo 时，Android 和 iOS 的 native sync 需要你自己维护。",
          "如果你的 React Native CLI 项目已经存在，请更新到 `@navai/voice-mobile` 0.1.4+，这样就能在 Android bare 上使用 `transportOptions`。",
        ],
      },
      step3: {
        title: "步骤 3 环境",
        description:
          "由于 React Native CLI 默认不会暴露 `.env`，请把 `NAVAI_API_URL`、`NAVAI_FUNCTIONS_FOLDERS` 和 `NAVAI_ROUTES_FILE` 集中放在 `src/ai/env.ts`。",
        bullets: [
          "做真实移动端测试时，请使用 `ngrok http 3000` 返回的公网 HTTPS URL，而不是 `localhost`。",
          "只有在明确不使用 ngrok 且只跑 Android emulator 时才保留 `10.0.2.2`。",
          "在 Android 上请在 `android/gradle.properties` 中保持 `newArchEnabled=false`，并执行 clean rebuild，避免这个 demo 在 Orb 连接时直接关闭应用。",
        ],
      },
      step4: {
        title: "步骤 4 导航路由",
        description:
          "为 assistant 可打开的页面定义 `NavaiRoute[]`，并补充符合用户说法的 business synonyms。",
        bullets: [
          "在 React Navigation 中，请让 path-based linking 指向正确的 screen。",
        ],
      },
      step5: {
        title: "步骤 5 定义函数",
        description:
          "先从一个简单的本地函数开始，先证明设备端可执行，再交给 backend。",
        bullets: [
          "本地函数可以使用 `Vibration` 这类 React Native API。",
        ],
      },
      step6: {
        title: "步骤 6 集成 mobile runtime",
        description:
          "解析 `runtime`，把 library Orb 连接到 `useMobileVoiceAgent`，并通过 `useLinkTo()` 或等价 adapter 处理 path navigation。",
        bullets: [
          "把 `NAVAI_ENV` 固定在一个 module 中，避免 Metro、emulator 和 device 使用不同 URL。",
          "使用 `@navai/voice-mobile` 0.1.4+ 时，只在 Android bare 需要显式 `rtcConfiguration`、`audioConstraints` 或 `remoteAudioTrackVolume` 时传入 `transportOptions`。",
        ],
      },
      step7: {
        title: "步骤 7 构建与测试",
        description:
          "生成 loaders，并通过 React Native CLI 部署，以验证 microphone、navigation 以及本地和 backend 执行。",
        bullets: [
          "在真机测试期间，请保持 `ngrok http 3000` 一直运行。",
          "如果你只测试 Android emulator，`10.0.2.2` 仍然可用。",
          "修改 `android/gradle.properties` 或 native permissions 后，请先做一次 clean rebuild 再重新测试。",
          "如果 API 已经返回 `client-secret`，但点击 Orb 后应用直接关闭，请确认项目是用 `--version 0.81.5` 创建的，仍然使用 `newArchEnabled=false`，并且已经做过 clean rebuild。",
          "如果 Metro 里先出现 `rn-webrtc:pc:DEBUG ... setLocalDescription`，紧接着又出现 `Fatal signal 6 (SIGABRT)` 和 `libjingle_peerconnection_so.so`，请把它判断为 `react-native-webrtc` 的原生崩溃，而不是 NAVAI backend 错误。",
        ],
        checklist:
          "1. 在 3000 端口启动 backend，并执行 `ngrok http 3000`。\n2. 把公网 HTTPS URL 写入 `src/ai/env.ts`。\n3. 确认项目是用 `--version 0.81.5` 创建的，并且 `android/gradle.properties` 仍然是 `newArchEnabled=false`。\n4. 生成 loaders。\n5. 先做 clean rebuild，再执行 `npx react-native run-android`。\n6. 在 Android emulator 或真机上安装应用。\n7. 允许 microphone 访问。\n8. 让 NAVAI 打开 Orders 并执行 vibrate device。",
      },
    },
  }),
};

export function getMobileReactNativeCliGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return withMobileReactNativeCliSharedCode(
    getLocalizedInstallationGuideTab(
      {
        ...MOBILE_REACT_NATIVE_CLI_GUIDE_TABS,
        ...MOBILE_REACT_NATIVE_CLI_ADDITIONAL_GUIDE_TABS,
      },
      language,
    ),
  );
}





