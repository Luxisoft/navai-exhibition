import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";
import { withApiNgrokMobileTesting } from "./ngrok-mobile-testing";

const API_NODEJS_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  en: {
    value: "node",
    label: "Node.js",
    title: "Node.js + Express",
    description:
      "Fastest path for a clean NAVAI API from zero using plain JavaScript and no build step.",
    bullets: [
      "Recommended for the first successful integration attempt.",
      "Good when NAVAI will run as a dedicated backend service.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Step 1 Create the project",
        description:
          "Create a minimal Express service, enable ESM, and prepare the folder that NAVAI will scan for backend functions.",
        bullets: [
          "Use Node.js 20 or newer.",
          "This structure already works for local demos, VPS, or containers.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="node --watch src/server.js"\nnpm pkg set scripts.start="node src/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Step 2 Install dependencies",
        description:
          "Install the four packages required to expose the NAVAI HTTP contract on the first attempt.",
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Step 3 Configure environment variables",
        description:
          "Create a `.env` file with the minimum values for OpenAI Realtime and the folder where NAVAI will load backend functions.",
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PORT=3000\nCORS_ORIGIN=http://localhost:4321\nOPENAI_API_KEY=sk-...\nOPENAI_REALTIME_MODEL=gpt-realtime\nOPENAI_REALTIME_VOICE=marin\nOPENAI_REALTIME_INSTRUCTIONS=You are a helpful assistant for UI navigation and function execution.\nOPENAI_REALTIME_LANGUAGE=English\nOPENAI_REALTIME_CLIENT_SECRET_TTL=600\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ALLOW_FRONTEND_API_KEY=false",
          },
        ],
      },
      {
        id: "paso-4-crear-funciones-backend",
        title: "Step 4 Create a backend function",
        description:
          "Add one callable export first so `GET /navai/functions` and `POST /navai/functions/execute` prove the backend is really ready.",
        bullets: [
          "NAVAI converts `getCompanySummary` into `get_company_summary` automatically.",
          "The function can return plain JSON and does not need extra wrappers.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.js",
            language: "javascript",
            code: 'export async function getCompanySummary(payload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "Step 5 Create the NAVAI server",
        description:
          "Mount your health route first and then register NAVAI routes in the same Express app with the environment values you configured above.",
        bullets: [
          "This exposes the full NAVAI contract on the same API.",
          "You can keep your own business routes in the same Express app.",
        ],
        codeBlocks: [
          {
            label: "src/server.js",
            language: "javascript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Step 6 Test the API",
        description:
          "Run these checks in order. If all of them pass, the backend is ready for Web, Mobile, Astro, Vue, Laravel, or any client that consumes the HTTP contract.",
        bullets: [
          "Start the server once before using `curl`.",
          "If `client-secret` fails, review `OPENAI_API_KEY` first.",
        ],
        codeBlocks: [
          {
            label: "Start the server",
            language: "bash",
            code: "npm run dev",
          },
          {
            label: "Health check",
            language: "bash",
            code: "curl http://localhost:3000/health",
          },
          {
            label: "Realtime client secret",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/realtime/client-secret \\\n  -H "Content-Type: application/json" \\\n  -d "{}"',
          },
          {
            label: "List backend functions",
            language: "bash",
            code: "curl http://localhost:3000/navai/functions",
          },
          {
            label: "Execute one backend function",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/functions/execute \\\n  -H "Content-Type: application/json" \\\n  -d "{\n    \\"function_name\\": \\"get_company_summary\\",\n    \\"payload\\": { \\"company\\": \\"NAVAI Demo\\" }\n  }"',
          },
        ],
      },
      {
        id: "paso-7-conectar-web-o-mobile",
        title: "Step 7 Connect Web or Mobile",
        description:
          "Once the API is alive, the client only needs the backend base URL and the three NAVAI endpoints already exposed by Express.",
        bullets: [
          "Web and Mobile request `client_secret` from `/navai/realtime/client-secret`.",
          "They discover tools through `/navai/functions` and execute remote tools through `/navai/functions/execute`.",
          "If your frontend runs on another origin, add it to `CORS_ORIGIN` before testing the voice session.",
        ],
      },
    ],
  },
  fr: {
    value: "node",
    label: "Node.js",
    title: "Node.js + Express",
    description:
      "Chemin le plus rapide pour une API NAVAI propre depuis zéro en JavaScript pur, sans étape de build.",
    bullets: [
      "Recommandé pour la première intégration réussie.",
      "Convient si NAVAI doit fonctionner comme service backend dédié.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Étape 1 Créer le projet",
        description:
          "Créez un service Express minimal, activez ESM et préparez le dossier que NAVAI analysera pour charger les fonctions backend.",
        bullets: [
          "Utilisez Node.js 20 ou plus récent.",
          "Cette structure fonctionne déjà pour les démos locales, les VPS et les conteneurs.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="node --watch src/server.js"\nnpm pkg set scripts.start="node src/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Étape 2 Installer les dépendances",
        description:
          "Installez les quatre paquets nécessaires pour exposer le contrat HTTP NAVAI dès le premier essai.",
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Étape 3 Configurer les variables d'environnement",
        description:
          "Créez un fichier `.env` avec les valeurs minimales pour OpenAI Realtime et le dossier où NAVAI chargera les fonctions backend.",
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PORT=3000\nCORS_ORIGIN=http://localhost:4321\nOPENAI_API_KEY=sk-...\nOPENAI_REALTIME_MODEL=gpt-realtime\nOPENAI_REALTIME_VOICE=marin\nOPENAI_REALTIME_INSTRUCTIONS=You are a helpful assistant for UI navigation and function execution.\nOPENAI_REALTIME_LANGUAGE=English\nOPENAI_REALTIME_CLIENT_SECRET_TTL=600\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ALLOW_FRONTEND_API_KEY=false",
          },
        ],
      },
      {
        id: "paso-4-crear-funciones-backend",
        title: "Étape 4 Créer une fonction backend",
        description:
          "Ajoutez d'abord un export appelable afin que `GET /navai/functions` et `POST /navai/functions/execute` prouvent que le backend est réellement prêt.",
        bullets: [
          "NAVAI convertit automatiquement `getCompanySummary` en `get_company_summary`.",
          "La fonction peut retourner du JSON simple sans wrappers supplémentaires.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.js",
            language: "javascript",
            code: 'export async function getCompanySummary(payload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "Étape 5 Créer le serveur NAVAI",
        description:
          "Montez d'abord la route de santé puis enregistrez les routes NAVAI dans la même app Express avec les variables configurées ci-dessus.",
        bullets: [
          "Cela expose tout le contrat NAVAI sur la même API.",
          "Vous pouvez garder vos propres routes métier dans la même app Express.",
        ],
        codeBlocks: [
          {
            label: "src/server.js",
            language: "javascript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Étape 6 Tester l'API",
        description:
          "Exécutez ces vérifications dans l'ordre. Si toutes passent, le backend est prêt pour Web, Mobile, Astro, Vue, Laravel ou tout client consommant le contrat HTTP.",
        bullets: [
          "Démarrez le serveur une fois avant d'utiliser `curl`.",
          "Si `client-secret` échoue, vérifiez d'abord `OPENAI_API_KEY`.",
        ],
        codeBlocks: [
          {
            label: "Démarrer le serveur",
            language: "bash",
            code: "npm run dev",
          },
          {
            label: "Vérifier la santé",
            language: "bash",
            code: "curl http://localhost:3000/health",
          },
          {
            label: "Secret client Realtime",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/realtime/client-secret \\\n  -H "Content-Type: application/json" \\\n  -d "{}"',
          },
          {
            label: "Lister les fonctions backend",
            language: "bash",
            code: "curl http://localhost:3000/navai/functions",
          },
          {
            label: "Exécuter une fonction backend",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/functions/execute \\\n  -H "Content-Type: application/json" \\\n  -d "{\n    \\"function_name\\": \\"get_company_summary\\",\n    \\"payload\\": { \\"company\\": \\"NAVAI Demo\\" }\n  }"',
          },
        ],
      },
      {
        id: "paso-7-conectar-web-o-mobile",
        title: "Étape 7 Connecter Web ou Mobile",
        description:
          "Une fois l'API active, le client a seulement besoin de l'URL de base du backend et des trois endpoints NAVAI déjà exposés par Express.",
        bullets: [
          "Web et Mobile demandent `client_secret` à `/navai/realtime/client-secret`.",
          "Ils découvrent les outils via `/navai/functions` et exécutent les outils distants via `/navai/functions/execute`.",
          "Si votre frontend s'exécute sur une autre origine, ajoutez-la à `CORS_ORIGIN` avant de tester la session vocale.",
        ],
      },
    ],
  },
  es: {
    value: "node",
    label: "Node.js",
    title: "",
    description: "",
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Paso 1 Crear el proyecto",
        description:
          "Cree un servicio Express mínimo, active ESM y deje lista la carpeta que NAVAI va a escanear para cargar funciones backend.",
        bullets: [
          "Use Node.js 20 o superior.",
          "Esta estructura ya sirve para demo local, VPS o contenedores.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="node --watch src/server.js"\nnpm pkg set scripts.start="node src/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Paso 2 Instalar dependencias",
        description:
          "Instale los cuatro paquetes necesarios para exponer el contrato HTTP de NAVAI desde el primer intento.",
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Paso 3 Configurar variables",
        description:
          "Cree un archivo `.env` con los valores mínimos de OpenAI Realtime y la carpeta desde donde NAVAI cargará las funciones backend.",
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PORT=3000\nCORS_ORIGIN=http://localhost:4321\nOPENAI_API_KEY=sk-...\nOPENAI_REALTIME_MODEL=gpt-realtime\nOPENAI_REALTIME_VOICE=marin\nOPENAI_REALTIME_INSTRUCTIONS=Eres una asistente util para navegacion por interfaces y ejecucion de funciones.\nOPENAI_REALTIME_LANGUAGE=Spanish\nOPENAI_REALTIME_CLIENT_SECRET_TTL=600\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ALLOW_FRONTEND_API_KEY=false",
          },
        ],
      },
      {
        id: "paso-4-crear-funciones-backend",
        title: "Paso 4 Crear una función backend",
        description:
          "Agregue primero un export ejecutable para que `GET /navai/functions` y `POST /navai/functions/execute` demuestren que el backend ya está listo.",
        bullets: [
          "NAVAI convierte `getCompanySummary` en `get_company_summary` automaticamente.",
          "La función puede devolver JSON plano y no necesita wrappers extra.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.js",
            language: "javascript",
            code: 'export async function getCompanySummary(payload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} ya responde desde una tool backend de NAVAI.`,\n    nextStep: "Conectar tu frontend o app movil al backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "Paso 5 Crear el servidor NAVAI",
        description:
          "Monte primero una ruta de salud y luego registre las rutas NAVAI dentro de la misma app Express usando las variables configuradas arriba.",
        bullets: [
          "Así expone el contrato NAVAI completo en un solo backend.",
          "Sus rutas de negocio pueden vivir dentro de la misma app Express.",
        ],
        codeBlocks: [
          {
            label: "src/server.js",
            language: "javascript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "Eres una asistente util para navegacion por interfaces y ejecucion de funciones.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Spanish",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API lista en http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Paso 6 Probar la API",
        description:
          "Haga estas validaciones en orden. Si todas responden bien, el backend ya está listo para Web, Mobile, Astro, Vue, Laravel o cualquier cliente que consuma el contrato HTTP.",
        bullets: [
          "Levante el servidor una vez antes de usar `curl`.",
          "Si falla `client-secret`, revise primero `OPENAI_API_KEY`.",
        ],
        codeBlocks: [
          {
            label: "Levantar el servidor",
            language: "bash",
            code: "npm run dev",
          },
          {
            label: "Verificar salud",
            language: "bash",
            code: "curl http://localhost:3000/health",
          },
          {
            label: "Probar client secret realtime",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/realtime/client-secret \\\n  -H "Content-Type: application/json" \\\n  -d "{}"',
          },
          {
            label: "Listar funciones backend",
            language: "bash",
            code: "curl http://localhost:3000/navai/functions",
          },
          {
            label: "Ejecutar una función backend",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/functions/execute \\\n  -H "Content-Type: application/json" \\\n  -d "{\n    \\"function_name\\": \\"get_company_summary\\",\n    \\"payload\\": { \\"company\\": \\"NAVAI Demo\\" }\n  }"',
          },
        ],
      },
      {
        id: "paso-7-conectar-web-o-mobile",
        title: "Paso 7 Conectar Web o Mobile",
        description:
          "Con la API viva, el cliente solo necesita la URL base del backend y los tres endpoints NAVAI que Express ya deja expuestos.",
        bullets: [
          "Web y Mobile piden `client_secret` a `/navai/realtime/client-secret`.",
          "Descubren tools en `/navai/functions` y ejecutan tools remotos en `/navai/functions/execute`.",
          "Si su frontend corre en otro origen, agréguelo a `CORS_ORIGIN` antes de probar la sesión de voz.",
        ],
      },
    ],
  },
  pt: {
    value: "node",
    label: "Node.js",
    title: "Node.js + Express",
    description:
      "Caminho mais rápido para criar uma API NAVAI limpa do zero usando JavaScript puro e sem etapa de build.",
    bullets: [
      "Recomendado para a primeira integração bem-sucedida.",
      "Funciona bem quando o NAVAI vai rodar como um serviço backend dedicado.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Etapa 1 Criar o projeto",
        description:
          "Crie um serviço Express mínimo, ative ESM e prepare a pasta que o NAVAI vai escanear para carregar funções backend.",
        bullets: [
          "Use Node.js 20 ou mais recente.",
          "Essa estrutura já funciona para demos locais, VPS e contêineres.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="node --watch src/server.js"\nnpm pkg set scripts.start="node src/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Etapa 2 Instalar dependências",
        description:
          "Instale os quatro pacotes necessários para expor o contrato HTTP do NAVAI logo na primeira tentativa.",
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Etapa 3 Configurar variáveis de ambiente",
        description:
          "Crie um arquivo `.env` com os valores mínimos para OpenAI Realtime e a pasta em que o NAVAI vai carregar as funções backend.",
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PORT=3000\nCORS_ORIGIN=http://localhost:4321\nOPENAI_API_KEY=sk-...\nOPENAI_REALTIME_MODEL=gpt-realtime\nOPENAI_REALTIME_VOICE=marin\nOPENAI_REALTIME_INSTRUCTIONS=You are a helpful assistant for UI navigation and function execution.\nOPENAI_REALTIME_LANGUAGE=English\nOPENAI_REALTIME_CLIENT_SECRET_TTL=600\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ALLOW_FRONTEND_API_KEY=false",
          },
        ],
      },
      {
        id: "paso-4-crear-funciones-backend",
        title: "Etapa 4 Criar uma função backend",
        description:
          "Adicione primeiro um export chamável para que `GET /navai/functions` e `POST /navai/functions/execute` comprovem que o backend está realmente pronto.",
        bullets: [
          "O NAVAI converte `getCompanySummary` para `get_company_summary` automaticamente.",
          "A função pode retornar JSON simples e não precisa de wrappers extras.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.js",
            language: "javascript",
            code: 'export async function getCompanySummary(payload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "Etapa 5 Criar o servidor NAVAI",
        description:
          "Monte primeiro a rota de saúde e depois registre as rotas NAVAI na mesma app Express usando as variáveis configuradas acima.",
        bullets: [
          "Isso expõe todo o contrato NAVAI na mesma API.",
          "Você pode manter suas próprias rotas de negócio na mesma app Express.",
        ],
        codeBlocks: [
          {
            label: "src/server.js",
            language: "javascript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Etapa 6 Testar a API",
        description:
          "Execute estas verificações em ordem. Se todas responderem bem, o backend está pronto para Web, Mobile, Astro, Vue, Laravel ou qualquer cliente que consuma o contrato HTTP.",
        bullets: [
          "Inicie o servidor uma vez antes de usar `curl`.",
          "Se `client-secret` falhar, revise primeiro `OPENAI_API_KEY`.",
        ],
        codeBlocks: [
          {
            label: "Iniciar o servidor",
            language: "bash",
            code: "npm run dev",
          },
          {
            label: "Verificar saúde",
            language: "bash",
            code: "curl http://localhost:3000/health",
          },
          {
            label: "Client secret Realtime",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/realtime/client-secret \\\n  -H "Content-Type: application/json" \\\n  -d "{}"',
          },
          {
            label: "Listar funções backend",
            language: "bash",
            code: "curl http://localhost:3000/navai/functions",
          },
          {
            label: "Executar uma função backend",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/functions/execute \\\n  -H "Content-Type: application/json" \\\n  -d "{\n    \\"function_name\\": \\"get_company_summary\\",\n    \\"payload\\": { \\"company\\": \\"NAVAI Demo\\" }\n  }"',
          },
        ],
      },
      {
        id: "paso-7-conectar-web-o-mobile",
        title: "Etapa 7 Conectar Web ou Mobile",
        description:
          "Com a API ativa, o cliente só precisa da URL base do backend e dos três endpoints NAVAI já expostos pelo Express.",
        bullets: [
          "Web e Mobile solicitam `client_secret` em `/navai/realtime/client-secret`.",
          "Eles descobrem ferramentas em `/navai/functions` e executam ferramentas remotas em `/navai/functions/execute`.",
          "Se seu frontend roda em outra origem, adicione-a em `CORS_ORIGIN` antes de testar a sessão de voz.",
        ],
      },
    ],
  },
  zh: {
    value: "node",
    label: "Node.js",
    title: "Node.js + Express",
    description:
      "使用原生 JavaScript、无需构建步骤，从零开始搭建干净 NAVAI API 的最快路线。",
    bullets: [
      "适合第一次快速集成成功。",
      "当 NAVAI 作为独立后端服务运行时非常合适。",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "步骤 1 创建项目",
        description:
          "创建一个最小化的 Express 服务，启用 ESM，并准备好 NAVAI 用来扫描后端函数的目录。",
        bullets: [
          "使用 Node.js 20 或更高版本。",
          "这个结构已经适用于本地演示、VPS 和容器。",
        ],
        codeBlocks: [
          {
            label: "终端",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="node --watch src/server.js"\nnpm pkg set scripts.start="node src/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "步骤 2 安装依赖",
        description: "安装首次暴露 NAVAI HTTP 契约所需的四个包。",
        codeBlocks: [
          {
            label: "终端",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "步骤 3 配置环境变量",
        description:
          "创建一个 `.env` 文件，填入 OpenAI Realtime 的最小配置，以及 NAVAI 加载后端函数的目录。",
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PORT=3000\nCORS_ORIGIN=http://localhost:4321\nOPENAI_API_KEY=sk-...\nOPENAI_REALTIME_MODEL=gpt-realtime\nOPENAI_REALTIME_VOICE=marin\nOPENAI_REALTIME_INSTRUCTIONS=You are a helpful assistant for UI navigation and function execution.\nOPENAI_REALTIME_LANGUAGE=English\nOPENAI_REALTIME_CLIENT_SECRET_TTL=600\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ALLOW_FRONTEND_API_KEY=false",
          },
        ],
      },
      {
        id: "paso-4-crear-funciones-backend",
        title: "步骤 4 创建后端函数",
        description:
          "先添加一个可调用的导出，这样 `GET /navai/functions` 和 `POST /navai/functions/execute` 就能证明后端已经真正可用。",
        bullets: [
          "NAVAI 会自动把 `getCompanySummary` 转换为 `get_company_summary`。",
          "函数可以直接返回普通 JSON，不需要额外包装。",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.js",
            language: "javascript",
            code: 'export async function getCompanySummary(payload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "步骤 5 创建 NAVAI 服务器",
        description:
          "先挂载健康检查路由，然后使用上面配置的环境变量，在同一个 Express 应用中注册 NAVAI 路由。",
        bullets: [
          "这样可以在同一个 API 中暴露完整的 NAVAI 契约。",
          "您也可以在同一个 Express 应用中继续保留自己的业务路由。",
        ],
        codeBlocks: [
          {
            label: "src/server.js",
            language: "javascript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "步骤 6 测试 API",
        description:
          "按顺序执行这些检查。如果全部通过，后端就已经可以服务于 Web、Mobile、Astro、Vue、Laravel 或任何消费该 HTTP 契约的客户端。",
        bullets: [
          "使用 `curl` 之前先启动一次服务器。",
          "如果 `client-secret` 失败，请先检查 `OPENAI_API_KEY`。",
        ],
        codeBlocks: [
          {
            label: "启动服务器",
            language: "bash",
            code: "npm run dev",
          },
          {
            label: "健康检查",
            language: "bash",
            code: "curl http://localhost:3000/health",
          },
          {
            label: "Realtime 客户端密钥",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/realtime/client-secret \\\n  -H "Content-Type: application/json" \\\n  -d "{}"',
          },
          {
            label: "列出后端函数",
            language: "bash",
            code: "curl http://localhost:3000/navai/functions",
          },
          {
            label: "执行一个后端函数",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/functions/execute \\\n  -H "Content-Type: application/json" \\\n  -d "{\n    \\"function_name\\": \\"get_company_summary\\",\n    \\"payload\\": { \\"company\\": \\"NAVAI Demo\\" }\n  }"',
          },
        ],
      },
      {
        id: "paso-7-conectar-web-o-mobile",
        title: "步骤 7 连接 Web 或移动端",
        description:
          "当 API 启动后，客户端只需要后端基础 URL，以及 Express 已经暴露出来的三个 NAVAI 端点。",
        bullets: [
          "Web 和 Mobile 通过 `/navai/realtime/client-secret` 请求 `client_secret`。",
          "客户端通过 `/navai/functions` 发现工具，并通过 `/navai/functions/execute` 执行远程工具。",
          "如果您的前端运行在其他来源，请在测试语音会话前把该来源加入 `CORS_ORIGIN`。",
        ],
      },
    ],
  },
  ja: {
    value: "node",
    label: "Node.js",
    title: "Node.js + Express",
    description:
      "ビルド手順なしのプレーンな JavaScript で、クリーンな NAVAI API をゼロから立ち上げる最短ルートです。",
    bullets: [
      "最初の統合を素早く成功させたい場合におすすめです。",
      "NAVAI を専用のバックエンドサービスとして動かす場合に適しています。",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "ステップ 1 プロジェクトを作成する",
        description:
          "最小構成の Express サービスを作成し、ESM を有効にして、NAVAI がバックエンド関数を読み込むためのフォルダを準備します。",
        bullets: [
          "Node.js 20 以上を使用してください。",
          "この構成はローカルデモ、VPS、コンテナでもそのまま使えます。",
        ],
        codeBlocks: [
          {
            label: "ターミナル",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="node --watch src/server.js"\nnpm pkg set scripts.start="node src/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "ステップ 2 依存関係をインストールする",
        description:
          "最初の試行で NAVAI の HTTP 契約を公開するために必要な 4 つのパッケージをインストールします。",
        codeBlocks: [
          {
            label: "ターミナル",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "ステップ 3 環境変数を設定する",
        description:
          "OpenAI Realtime の最小設定と、NAVAI がバックエンド関数を読み込むフォルダを含む `.env` ファイルを作成します。",
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PORT=3000\nCORS_ORIGIN=http://localhost:4321\nOPENAI_API_KEY=sk-...\nOPENAI_REALTIME_MODEL=gpt-realtime\nOPENAI_REALTIME_VOICE=marin\nOPENAI_REALTIME_INSTRUCTIONS=You are a helpful assistant for UI navigation and function execution.\nOPENAI_REALTIME_LANGUAGE=English\nOPENAI_REALTIME_CLIENT_SECRET_TTL=600\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ALLOW_FRONTEND_API_KEY=false",
          },
        ],
      },
      {
        id: "paso-4-crear-funciones-backend",
        title: "ステップ 4 バックエンド関数を作成する",
        description:
          "まず呼び出し可能な export を 1 つ追加し、`GET /navai/functions` と `POST /navai/functions/execute` でバックエンドの準備完了を確認します。",
        bullets: [
          "NAVAI は `getCompanySummary` を自動で `get_company_summary` に変換します。",
          "関数は追加ラッパーなしでプレーンな JSON を返せます。",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.js",
            language: "javascript",
            code: 'export async function getCompanySummary(payload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "ステップ 5 NAVAI サーバーを作成する",
        description:
          "まずヘルスルートを用意し、その後で上記の環境変数を使って同じ Express アプリ内に NAVAI ルートを登録します。",
        bullets: [
          "これで同じ API 上に完全な NAVAI 契約を公開できます。",
          "独自の業務ルートも同じ Express アプリに維持できます。",
        ],
        codeBlocks: [
          {
            label: "src/server.js",
            language: "javascript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "ステップ 6 API をテストする",
        description:
          "これらの確認を順番に実行してください。すべて成功すれば、バックエンドは Web、Mobile、Astro、Vue、Laravel、または HTTP 契約を利用する任意のクライアントで利用できます。",
        bullets: [
          "`curl` を使う前に一度サーバーを起動してください。",
          "`client-secret` が失敗する場合は、まず `OPENAI_API_KEY` を確認してください。",
        ],
        codeBlocks: [
          {
            label: "サーバーを起動",
            language: "bash",
            code: "npm run dev",
          },
          {
            label: "ヘルスチェック",
            language: "bash",
            code: "curl http://localhost:3000/health",
          },
          {
            label: "Realtime クライアントシークレット",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/realtime/client-secret \\\n  -H "Content-Type: application/json" \\\n  -d "{}"',
          },
          {
            label: "バックエンド関数を一覧表示",
            language: "bash",
            code: "curl http://localhost:3000/navai/functions",
          },
          {
            label: "バックエンド関数を実行",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/functions/execute \\\n  -H "Content-Type: application/json" \\\n  -d "{\n    \\"function_name\\": \\"get_company_summary\\",\n    \\"payload\\": { \\"company\\": \\"NAVAI Demo\\" }\n  }"',
          },
        ],
      },
      {
        id: "paso-7-conectar-web-o-mobile",
        title: "ステップ 7 Web または Mobile を接続する",
        description:
          "API が動き始めたら、クライアントに必要なのはバックエンドのベース URL と、Express が公開している 3 つの NAVAI エンドポイントだけです。",
        bullets: [
          "Web と Mobile は `/navai/realtime/client-secret` から `client_secret` を取得します。",
          "ツールは `/navai/functions` で検出し、`/navai/functions/execute` でリモート実行します。",
          "フロントエンドが別オリジンで動く場合は、音声セッションをテストする前にそのオリジンを `CORS_ORIGIN` に追加してください。",
        ],
      },
    ],
  },
  ru: {
    value: "node",
    label: "Node.js",
    title: "Node.js + Express",
    description:
      "Самый быстрый путь к чистому NAVAI API с нуля на обычном JavaScript без шага сборки.",
    bullets: [
      "Рекомендуется для первой успешной интеграции.",
      "Подходит, если NAVAI будет работать как отдельный backend-сервис.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Шаг 1 Создать проект",
        description:
          "Создайте минимальный Express-сервис, включите ESM и подготовьте папку, которую NAVAI будет сканировать для загрузки backend-функций.",
        bullets: [
          "Используйте Node.js 20 или новее.",
          "Эта структура уже подходит для локальных демо, VPS и контейнеров.",
        ],
        codeBlocks: [
          {
            label: "Терминал",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="node --watch src/server.js"\nnpm pkg set scripts.start="node src/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Шаг 2 Установить зависимости",
        description:
          "Установите четыре пакета, необходимые для публикации HTTP-контракта NAVAI с первой попытки.",
        codeBlocks: [
          {
            label: "Терминал",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Шаг 3 Настроить переменные окружения",
        description:
          "Создайте файл `.env` с минимальными значениями для OpenAI Realtime и папкой, из которой NAVAI будет загружать backend-функции.",
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PORT=3000\nCORS_ORIGIN=http://localhost:4321\nOPENAI_API_KEY=sk-...\nOPENAI_REALTIME_MODEL=gpt-realtime\nOPENAI_REALTIME_VOICE=marin\nOPENAI_REALTIME_INSTRUCTIONS=You are a helpful assistant for UI navigation and function execution.\nOPENAI_REALTIME_LANGUAGE=English\nOPENAI_REALTIME_CLIENT_SECRET_TTL=600\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ALLOW_FRONTEND_API_KEY=false",
          },
        ],
      },
      {
        id: "paso-4-crear-funciones-backend",
        title: "Шаг 4 Создать backend-функцию",
        description:
          "Сначала добавьте один вызываемый export, чтобы `GET /navai/functions` и `POST /navai/functions/execute` доказали, что backend действительно готов.",
        bullets: [
          "NAVAI автоматически преобразует `getCompanySummary` в `get_company_summary`.",
          "Функция может возвращать обычный JSON без дополнительных оберток.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.js",
            language: "javascript",
            code: 'export async function getCompanySummary(payload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "Шаг 5 Создать сервер NAVAI",
        description:
          "Сначала подключите маршрут здоровья, а затем зарегистрируйте маршруты NAVAI в том же приложении Express, используя переменные окружения выше.",
        bullets: [
          "Так вы публикуете полный контракт NAVAI в одном API.",
          "Ваши собственные бизнес-маршруты могут оставаться в том же приложении Express.",
        ],
        codeBlocks: [
          {
            label: "src/server.js",
            language: "javascript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Шаг 6 Проверить API",
        description:
          "Выполните эти проверки по порядку. Если все проходят, backend готов для Web, Mobile, Astro, Vue, Laravel или любого клиента, использующего HTTP-контракт.",
        bullets: [
          "Один раз запустите сервер перед использованием `curl`.",
          "Если `client-secret` не работает, сначала проверьте `OPENAI_API_KEY`.",
        ],
        codeBlocks: [
          {
            label: "Запустить сервер",
            language: "bash",
            code: "npm run dev",
          },
          {
            label: "Проверка здоровья",
            language: "bash",
            code: "curl http://localhost:3000/health",
          },
          {
            label: "Realtime client secret",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/realtime/client-secret \\\n  -H "Content-Type: application/json" \\\n  -d "{}"',
          },
          {
            label: "Список backend-функций",
            language: "bash",
            code: "curl http://localhost:3000/navai/functions",
          },
          {
            label: "Выполнить backend-функцию",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/functions/execute \\\n  -H "Content-Type: application/json" \\\n  -d "{\n    \\"function_name\\": \\"get_company_summary\\",\n    \\"payload\\": { \\"company\\": \\"NAVAI Demo\\" }\n  }"',
          },
        ],
      },
      {
        id: "paso-7-conectar-web-o-mobile",
        title: "Шаг 7 Подключить Web или Mobile",
        description:
          "Когда API уже запущен, клиенту нужна только базовая URL backend и три NAVAI-эндпоинта, которые уже публикует Express.",
        bullets: [
          "Web и Mobile запрашивают `client_secret` через `/navai/realtime/client-secret`.",
          "Они обнаруживают инструменты через `/navai/functions` и выполняют удаленные инструменты через `/navai/functions/execute`.",
          "Если ваш frontend работает на другом origin, добавьте его в `CORS_ORIGIN` до проверки голосовой сессии.",
        ],
      },
    ],
  },
  ko: {
    value: "node",
    label: "Node.js",
    title: "Node.js + Express",
    description:
      "순수 JavaScript와 빌드 단계 없이 처음부터 깔끔한 NAVAI API를 만드는 가장 빠른 경로입니다.",
    bullets: [
      "첫 통합을 성공시키기 위한 가장 권장되는 경로입니다.",
      "NAVAI가 전용 백엔드 서비스로 동작할 때 적합합니다.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "단계 1 프로젝트 만들기",
        description:
          "최소한의 Express 서비스를 만들고 ESM을 활성화한 뒤, NAVAI가 백엔드 함수를 불러오기 위해 스캔할 폴더를 준비하세요.",
        bullets: [
          "Node.js 20 이상을 사용하세요.",
          "이 구조는 로컬 데모, VPS, 컨테이너에서도 바로 사용할 수 있습니다.",
        ],
        codeBlocks: [
          {
            label: "터미널",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="node --watch src/server.js"\nnpm pkg set scripts.start="node src/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "단계 2 의존성 설치",
        description:
          "첫 시도에서 NAVAI HTTP 계약을 노출하기 위해 필요한 네 개의 패키지를 설치하세요.",
        codeBlocks: [
          {
            label: "터미널",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "단계 3 환경 변수 설정",
        description:
          "OpenAI Realtime 최소값과 NAVAI가 백엔드 함수를 읽어 올 폴더가 포함된 `.env` 파일을 만드세요.",
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PORT=3000\nCORS_ORIGIN=http://localhost:4321\nOPENAI_API_KEY=sk-...\nOPENAI_REALTIME_MODEL=gpt-realtime\nOPENAI_REALTIME_VOICE=marin\nOPENAI_REALTIME_INSTRUCTIONS=당신은 UI 탐색과 함수 실행을 돕는 유용한 도우미입니다.\nOPENAI_REALTIME_LANGUAGE=Korean\nOPENAI_REALTIME_CLIENT_SECRET_TTL=600\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ALLOW_FRONTEND_API_KEY=false",
          },
        ],
      },
      {
        id: "paso-4-crear-funciones-backend",
        title: "단계 4 백엔드 함수 만들기",
        description:
          "먼저 호출 가능한 export 하나를 추가해 `GET /navai/functions` 와 `POST /navai/functions/execute` 로 백엔드가 실제로 준비되었는지 확인하세요.",
        bullets: [
          "NAVAI는 `getCompanySummary` 를 자동으로 `get_company_summary` 로 변환합니다.",
          "이 함수는 일반 JSON을 반환해도 되며 추가 래퍼가 필요하지 않습니다.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.js",
            language: "javascript",
            code: 'export async function getCompanySummary(payload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company}는 이미 NAVAI 백엔드 도구에서 응답하고 있습니다.`,\n    nextStep: "프런트엔드나 모바일 앱을 백엔드에 연결하세요.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "단계 5 NAVAI 서버 만들기",
        description:
          "먼저 health 경로를 만들고, 위에서 설정한 환경값으로 같은 Express 앱에 NAVAI 경로를 등록하세요.",
        bullets: [
          "이렇게 하면 같은 API에서 전체 NAVAI 계약을 노출할 수 있습니다.",
          "같은 Express 앱 안에 자체 비즈니스 경로를 계속 유지할 수 있습니다.",
        ],
        codeBlocks: [
          {
            label: "src/server.js",
            language: "javascript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "당신은 UI 탐색과 함수 실행을 돕는 유용한 도우미입니다.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Korean",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API 준비 완료: http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "단계 6 API 테스트",
        description:
          "다음 확인을 순서대로 실행하세요. 모두 통과하면 백엔드는 Web, Mobile, Astro, Vue, Laravel 또는 HTTP 계약을 소비하는 어떤 클라이언트에도 준비된 것입니다.",
        bullets: [
          "`curl` 을 사용하기 전에 서버를 한 번 먼저 실행하세요.",
          "`client-secret` 이 실패하면 먼저 `OPENAI_API_KEY` 를 확인하세요.",
        ],
        codeBlocks: [
          {
            label: "서버 시작",
            language: "bash",
            code: "npm run dev",
          },
          {
            label: "상태 확인",
            language: "bash",
            code: "curl http://localhost:3000/health",
          },
          {
            label: "실시간 클라이언트 시크릿",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/realtime/client-secret \\\n  -H "Content-Type: application/json" \\\n  -d "{}"',
          },
          {
            label: "백엔드 함수 목록",
            language: "bash",
            code: "curl http://localhost:3000/navai/functions",
          },
          {
            label: "백엔드 함수 실행",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/functions/execute \\\n  -H "Content-Type: application/json" \\\n  -d "{\n    \\"function_name\\": \\"get_company_summary\\",\n    \\"payload\\": { \\"company\\": \\"NAVAI Demo\\" }\n  }"',
          },
        ],
      },
      {
        id: "paso-7-conectar-web-o-mobile",
        title: "단계 7 Web 또는 Mobile 연결",
        description:
          "API가 살아 있으면 클라이언트에는 백엔드 기본 URL과 Express가 이미 노출한 세 개의 NAVAI 엔드포인트만 있으면 됩니다.",
        bullets: [
          "Web과 Mobile은 `/navai/realtime/client-secret` 에서 `client_secret` 을 요청합니다.",
          "이들은 `/navai/functions` 로 도구를 찾고 `/navai/functions/execute` 로 원격 도구를 실행합니다.",
          "프런트엔드가 다른 origin에서 실행된다면 음성 세션을 테스트하기 전에 그 origin을 `CORS_ORIGIN` 에 추가하세요.",
        ],
      },
    ],
  },
  hi: {
    value: "node",
    label: "Node.js",
    title: "Node.js + Express",
    description:
      "सादा JavaScript और बिना build step के, शून्य से साफ़ NAVAI API शुरू करने का सबसे तेज़ रास्ता।",
    bullets: [
      "पहले सफल integration प्रयास के लिए अनुशंसित।",
      "जब NAVAI एक समर्पित backend service के रूप में चले, तब उपयुक्त।",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "चरण 1 प्रोजेक्ट बनाएं",
        description:
          "एक न्यूनतम Express service बनाएं, ESM सक्षम करें, और वह folder तैयार करें जिसे NAVAI backend functions लोड करने के लिए scan करेगा।",
        bullets: [
          "Node.js 20 या नया संस्करण उपयोग करें।",
          "यह संरचना local demo, VPS या container के लिए पहले से काम करती है।",
        ],
        codeBlocks: [
          {
            label: "टर्मिनल",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="node --watch src/server.js"\nnpm pkg set scripts.start="node src/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "चरण 2 डिपेंडेंसी इंस्टॉल करें",
        description:
          "पहले प्रयास में NAVAI HTTP contract को expose करने के लिए ज़रूरी चार packages इंस्टॉल करें।",
        codeBlocks: [
          {
            label: "टर्मिनल",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "चरण 3 एन्वायरनमेंट वेरिएबल सेट करें",
        description:
          "एक `.env` फ़ाइल बनाएं जिसमें OpenAI Realtime के न्यूनतम मान और वह folder हो जहाँ से NAVAI backend functions लोड करेगा।",
        codeBlocks: [
          {
            label: ".env",
            language: "ini",
            code: "PORT=3000\nCORS_ORIGIN=http://localhost:4321\nOPENAI_API_KEY=sk-...\nOPENAI_REALTIME_MODEL=gpt-realtime\nOPENAI_REALTIME_VOICE=marin\nOPENAI_REALTIME_INSTRUCTIONS=आप UI नेविगेशन और फ़ंक्शन execution में मदद करने वाले उपयोगी सहायक हैं।\nOPENAI_REALTIME_LANGUAGE=Hindi\nOPENAI_REALTIME_CLIENT_SECRET_TTL=600\nNAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules\nNAVAI_ALLOW_FRONTEND_API_KEY=false",
          },
        ],
      },
      {
        id: "paso-4-crear-funciones-backend",
        title: "चरण 4 बैकएंड फ़ंक्शन बनाएं",
        description:
          "पहले एक callable export जोड़ें ताकि `GET /navai/functions` और `POST /navai/functions/execute` साबित कर सकें कि backend सच में तैयार है।",
        bullets: [
          "NAVAI `getCompanySummary` को अपने आप `get_company_summary` में बदल देता है।",
          "फ़ंक्शन साधारण JSON return कर सकता है और उसे अतिरिक्त wrapper की ज़रूरत नहीं है।",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.js",
            language: "javascript",
            code: 'export async function getCompanySummary(payload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} के लिए NAVAI backend tool पहले से response दे रहा है।`,\n    nextStep: "अपने frontend या mobile app को backend से कनेक्ट करें।",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "चरण 5 NAVAI सर्वर बनाएं",
        description:
          "पहले अपनी health route माउंट करें और फिर ऊपर सेट किए गए environment values के साथ उसी Express app में NAVAI routes register करें।",
        bullets: [
          "इससे वही API पूरी NAVAI contract को expose करती है।",
          "आप अपने business routes उसी Express app में रख सकते हैं।",
        ],
        codeBlocks: [
          {
            label: "src/server.js",
            language: "javascript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "आप UI नेविगेशन और फ़ंक्शन execution में मदद करने वाले उपयोगी सहायक हैं।",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Hindi",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API यहाँ तैयार है: http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "चरण 6 API जाँचें",
        description:
          "इन checks को इसी क्रम में चलाएं। अगर सभी पास हो जाएँ, तो backend Web, Mobile, Astro, Vue, Laravel या किसी भी ऐसे client के लिए तैयार है जो HTTP contract को consume करता है।",
        bullets: [
          "`curl` इस्तेमाल करने से पहले server को एक बार चालू करें।",
          "अगर `client-secret` fail हो, तो पहले `OPENAI_API_KEY` जाँचें।",
        ],
        codeBlocks: [
          {
            label: "सर्वर चलाएँ",
            language: "bash",
            code: "npm run dev",
          },
          {
            label: "हेल्थ जाँच",
            language: "bash",
            code: "curl http://localhost:3000/health",
          },
          {
            label: "रियलटाइम क्लाइंट सीक्रेट",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/realtime/client-secret \\\n  -H "Content-Type: application/json" \\\n  -d "{}"',
          },
          {
            label: "बैकएंड फ़ंक्शन्स सूची",
            language: "bash",
            code: "curl http://localhost:3000/navai/functions",
          },
          {
            label: "बैकएंड फ़ंक्शन चलाएँ",
            language: "bash",
            code: 'curl -X POST http://localhost:3000/navai/functions/execute \\\n  -H "Content-Type: application/json" \\\n  -d "{\n    \\"function_name\\": \\"get_company_summary\\",\n    \\"payload\\": { \\"company\\": \\"NAVAI Demo\\" }\n  }"',
          },
        ],
      },
      {
        id: "paso-7-conectar-web-o-mobile",
        title: "चरण 7 Web या Mobile कनेक्ट करें",
        description:
          "API चालू होने के बाद, client को सिर्फ backend base URL और Express द्वारा पहले से expose किए गए तीन NAVAI endpoints की ज़रूरत होती है।",
        bullets: [
          "Web और Mobile `/navai/realtime/client-secret` से `client_secret` मांगते हैं।",
          "वे `/navai/functions` से tools खोजते हैं और `/navai/functions/execute` के ज़रिए remote tools चलाते हैं।",
          "अगर आपका frontend किसी दूसरे origin पर चलता है, तो voice session test करने से पहले उसे `CORS_ORIGIN` में जोड़ें।",
        ],
      },
    ],
  },
};

export function getApiNodejsGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return withApiNgrokMobileTesting(
    getLocalizedInstallationGuideTab(API_NODEJS_GUIDE_TABS, language),
    language,
  );
}
