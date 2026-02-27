# 📱 Instalacion Mobile (@navai/voice-mobile)

🧩 Guia de instalacion basada en `README.es.md` del repositorio principal de NAVAI para integracion React Native/Expo.

> ⚠️ Requisito obligatorio: antes de usar Mobile, debes implementar y tener operativo el backend API de NAVAI (`/navai/realtime/client-secret`, `/navai/functions`, `/navai/functions/execute`).

## ✅ Requisitos

- Node.js 20+
- React Native / Expo
- `react-native-webrtc` para realtime en dispositivo
- Backend NAVAI disponible en red

## 📦 1) Instalar dependencias

```bash
npm install @navai/voice-mobile react react-native react-native-webrtc @openai/agents zod
```

## ⚙️ 2) Variables de entorno recomendadas

```env
NAVAI_API_URL=http://<TU_IP_LAN>:3000
NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules
NAVAI_ROUTES_FILE=src/ai/routes.ts
```

## 🧭 3) Definir rutas para navegacion por voz

Archivo sugerido: `src/ai/routes.ts`

```ts
import type { NavaiRouteDefinition } from "@navai/voice-mobile";

export const routes: NavaiRouteDefinition[] = [
  {
    name: "inicio",
    path: "/",
    description: "Pantalla principal",
    modulePath: "src/screens/HomeScreen.tsx",
    moduleExport: "HomeScreen",
  },
];
```

## 🧰 4) Definir tools locales mobile

Carpeta sugerida: `src/ai/functions-modules`

```ts
export default {
  definition: {
    name: "vibrar_dispositivo",
    description: "Activa vibracion en el dispositivo",
    parameters: { type: "object", properties: {}, required: [] },
  },
  execute: async () => ({ ok: true }),
};
```

## 🛠️ 5) Generacion de module loaders

El runtime mobile genera `src/ai/generated-module-loaders.ts` desde `NAVAI_FUNCTIONS_FOLDERS`.

Referencia de comando:

```bash
navai-generate-mobile-loaders
```

## 🔄 6) Flujo esperado en runtime

1. Mobile pide `client_secret` a `/navai/realtime/client-secret`.
2. Carga functions backend desde `/navai/functions`.
3. Ejecuta tool local o remoto por `/navai/functions/execute`.
