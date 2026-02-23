# Instalacion API (@navai/voice-backend)

Guia de instalacion basada en `README.es.md` del repositorio principal de NAVAI para la parte backend.

## Requisitos

- Node.js 20+
- npm 10+
- API key de OpenAI en entorno backend

## 1) Instalar dependencias

```bash
npm install @navai/voice-backend express dotenv cors
```

## 2) Variables de entorno minimas

```env
OPENAI_API_KEY=sk-...
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_INSTRUCTIONS=Eres una asistente util para navegacion.
OPENAI_REALTIME_LANGUAGE=Spanish
OPENAI_REALTIME_VOICE_ACCENT=neutral Latin American Spanish
OPENAI_REALTIME_VOICE_TONE=friendly and professional
OPENAI_REALTIME_CLIENT_SECRET_TTL=600
NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules
NAVAI_ALLOW_FRONTEND_API_KEY=false
```

## 3) Registrar rutas de NAVAI en Express

```ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  createNavaiBackendRouter,
  registerNavaiRealtimeRoutes,
} from "@navai/voice-backend";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

registerNavaiRealtimeRoutes(app, {
  openAiApiKey: process.env.OPENAI_API_KEY,
  routes: {
    clientSecretPath: "/navai/realtime/client-secret",
    listFunctionsPath: "/navai/functions",
    executeFunctionPath: "/navai/functions/execute",
  },
  functions: { folders: process.env.NAVAI_FUNCTIONS_FOLDERS },
});

app.listen(3000);
```

## 4) Endpoints que debe exponer la API

- `POST /navai/realtime/client-secret`
- `GET /navai/functions`
- `POST /navai/functions/execute`

## 5) Prueba rapida

```bash
curl -X POST http://localhost:3000/navai/realtime/client-secret -H "Content-Type: application/json" -d "{}"
```

Si backend ya tiene `OPENAI_API_KEY`, esa key tiene prioridad sobre cualquier `apiKey` enviada desde frontend.
