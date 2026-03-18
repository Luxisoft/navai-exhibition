# Instalacion API (@navai/voice-backend)

Guia corta para levantar una API NAVAI desde cero y validar que responde bien al primer intento.

## Paso 1 Crear el proyecto

Use Node.js 20+ y cree una base minima:

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

Cree un archivo `.env`:

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

Archivo sugerido: `src/ai/functions-modules/getCompanySummary.js`

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

NAVAI convierte `getCompanySummary` en `get_company_summary`.

## Paso 5 Crear el servidor NAVAI

Archivo sugerido: `src/server.js`

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

Primero levante el servidor:

```bash
npm run start
```

Valide salud:

```bash
curl http://localhost:3000/health
```

Valide `client_secret`:

```bash
curl -X POST http://localhost:3000/navai/realtime/client-secret \
  -H "Content-Type: application/json" \
  -d "{}"
```

Liste funciones:

```bash
curl http://localhost:3000/navai/functions
```

Ejecute una funcion:

```bash
curl -X POST http://localhost:3000/navai/functions/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"function_name\": \"get_company_summary\",
    \"payload\": { \"company\": \"NAVAI Demo\" }
  }"
```

## Paso 7 Conectar Web o Mobile

Cuando la API ya responde:

- Web y Mobile piden `client_secret` a `/navai/realtime/client-secret`
- cargan tools con `/navai/functions`
- ejecutan tools remotos con `/navai/functions/execute`
- si frontend vive en otro origen, agreguelo a `CORS_ORIGIN`

Referencias:

- `/documentation/installation-web`
- `/documentation/installation-mobile`

## Variantes rapidas por stack

### Node.js + Express

Es la ruta recomendada para un primer despliegue porque funciona con JavaScript puro y sin build.

### Express + TypeScript

Instale tipado solo si el proyecto ya lo necesita:

```bash
npm install express cors dotenv @navai/voice-backend
npm install -D typescript tsx @types/express @types/node
```

Servidor sugerido:

```typescript
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { registerNavaiExpressRoutes } from "@navai/voice-backend";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

registerNavaiExpressRoutes(app, {
  backendOptions: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",
    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",
    defaultInstructions: process.env.OPENAI_REALTIME_INSTRUCTIONS,
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

### NestJS con adapter Express

Use esta variante si Nest ya corre sobre Express:

```typescript
import * as dotenv from "dotenv";
import express from "express";
import { NestFactory } from "@nestjs/core";
import { registerNavaiExpressRoutes } from "@navai/voice-backend";

import { AppModule } from "./app.module";

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const navai = express();

  navai.use(express.json());

  registerNavaiExpressRoutes(navai, {
    backendOptions: {
      openaiApiKey: process.env.OPENAI_API_KEY,
      defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",
      defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",
      defaultInstructions: process.env.OPENAI_REALTIME_INSTRUCTIONS,
      defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Spanish",
      clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),
    },
    clientSecretPath: "/realtime/client-secret",
    functionsListPath: "/functions",
    functionsExecutePath: "/functions/execute",
    functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",
  });

  app.use("/navai", navai);
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
```
