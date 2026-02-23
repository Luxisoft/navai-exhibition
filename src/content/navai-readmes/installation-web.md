# Instalacion Web (@navai/voice-frontend)

Guia de instalacion basada en `README.es.md` del repositorio principal de NAVAI para integracion frontend web.

> Requisito obligatorio: antes de usar Web, debes implementar y tener operativo el backend API de NAVAI (`/navai/realtime/client-secret`, `/navai/functions`, `/navai/functions/execute`).

## Requisitos

- Node.js 20+
- App React (o framework compatible con React)
- Backend con contrato NAVAI activo

## 1) Instalar dependencias

```bash
npm install @navai/voice-frontend react react-dom react-router-dom @openai/agents zod
```

## 2) Variables de entorno recomendadas

```env
NAVAI_API_URL=http://localhost:3000
NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules
NAVAI_ROUTES_FILE=src/ai/routes.ts
```

## 3) Definir rutas navegables del agente

Archivo sugerido: `src/ai/routes.ts`

```ts
import type { NavaiRouteDefinition } from "@navai/voice-frontend";

export const routes: NavaiRouteDefinition[] = [
  { name: "inicio", path: "/", description: "Pantalla principal" },
  { name: "cuenta", path: "/account", description: "Area de usuario" },
];
```

## 4) Definir funciones frontend (tools locales)

Carpeta sugerida: `src/ai/functions-modules`

```ts
export default {
  definition: {
    name: "mostrar_notificacion",
    description: "Muestra un mensaje en pantalla",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
      },
      required: ["text"],
    },
  },
  execute: async ({ text }: { text: string }) => {
    return { ok: true, message: text };
  },
};
```

## 5) Integrar el runtime web

Usa `@navai/voice-frontend` para:

- pedir `client_secret` al backend (`/navai/realtime/client-secret`)
- cargar functions backend (`/navai/functions`)
- ejecutar `execute_app_function` local o remoto (`/navai/functions/execute`)

El runtime genera `src/ai/generated-module-loaders.ts` a partir de `NAVAI_FUNCTIONS_FOLDERS`.
