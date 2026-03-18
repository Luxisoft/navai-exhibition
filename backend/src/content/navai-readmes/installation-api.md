# Instalacion API (@navai/voice-backend)

Guia corta para levantar una API NAVAI desde cero y validar que responde bien al primer intento.

## Paso 1 Crear el proyecto

```bash
mkdir navai-api-demo
cd navai-api-demo
npm init -y
npm pkg set type=module
npm pkg set scripts.dev="node --watch src/server.js"
npm pkg set scripts.start="node src/server.js"
mkdir src
mkdir src/ai
mkdir src/ai/functions-modules
```

## Paso 2 Instalar dependencias

```bash
npm install express cors dotenv @navai/voice-backend
```

## Paso 3 Configurar variables

```env
PORT=3000
CORS_ORIGIN=http://localhost:4321
OPENAI_API_KEY=sk-...
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_INSTRUCTIONS=Eres una asistente util para navegacion por interfaces y ejecucion de funciones.
OPENAI_REALTIME_LANGUAGE=Spanish
OPENAI_REALTIME_CLIENT_SECRET_TTL=600
NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules
NAVAI_ALLOW_FRONTEND_API_KEY=false
```

## Paso 4 Crear una funcion backend

```javascript
export async function getCompanySummary(payload = {}) {
  const company = String(payload.company || "NAVAI Demo").trim();

  return {
    ok: true,
    company,
    summary: `${company} ya responde desde una tool backend de NAVAI.`,
    nextStep: "Conectar tu frontend o app movil al backend.",
  };
}
```

## Paso 5 Crear el servidor NAVAI

```javascript
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { registerNavaiExpressRoutes } from "@navai/voice-backend";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(express.json());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "navai-api-demo",
    endpoints: [
      "/navai/realtime/client-secret",
      "/navai/functions",
      "/navai/functions/execute",
    ],
  });
});

registerNavaiExpressRoutes(app, {
  backendOptions: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",
    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",
    defaultInstructions:
      process.env.OPENAI_REALTIME_INSTRUCTIONS ||
      "Eres una asistente util para navegacion por interfaces y ejecucion de funciones.",
    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Spanish",
    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),
    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",
  },
  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",
});

app.listen(port, () => {
  console.log(`NAVAI API lista en http://localhost:${port}`);
});
```

## Paso 6 Probar la API

```bash
npm run start
```

```bash
curl http://localhost:3000/health
```

```bash
curl -X POST http://localhost:3000/navai/realtime/client-secret \
  -H "Content-Type: application/json" \
  -d "{}"
```

```bash
curl http://localhost:3000/navai/functions
```

```bash
curl -X POST http://localhost:3000/navai/functions/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"function_name\": \"get_company_summary\",
    \"payload\": { \"company\": \"NAVAI Demo\" }
  }"
```

## Paso 7 Conectar Web o Mobile

- usar `/navai/realtime/client-secret` para `client_secret`
- usar `/navai/functions` para discovery
- usar `/navai/functions/execute` para tools remotos
- habilitar `CORS_ORIGIN` para el origen frontend

## Variantes rapidas por stack

### Node.js + Express

Ruta recomendada para la primera integracion.

### Express + TypeScript

```bash
npm install express cors dotenv @navai/voice-backend
npm install -D typescript tsx @types/express @types/node
```

### NestJS con adapter Express

Monte un sub-app Express en `/navai` y use rutas relativas:

```typescript
registerNavaiExpressRoutes(navai, {
  clientSecretPath: "/realtime/client-secret",
  functionsListPath: "/functions",
  functionsExecutePath: "/functions/execute",
});
```
