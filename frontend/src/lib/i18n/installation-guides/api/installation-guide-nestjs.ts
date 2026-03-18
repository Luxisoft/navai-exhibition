import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";
import { withApiNgrokMobileTesting } from "./ngrok-mobile-testing";

const API_NESTJS_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  en: {
    value: "nestjs",
    label: "NestJS",
    title: "NestJS + Mounted NAVAI Router",
    description:
      "Best when you already have a Nest backend and want NAVAI under `/navai` without creating another API contract.",
    bullets: [
      "Use this route only if NestJS is already your real backend base.",
      "NAVAI stays isolated inside its own mounted Express router.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Step 1 Create the NestJS project",
        description:
          "Generate a fresh Nest app and create the folder where NAVAI will load backend functions. This keeps the example aligned with a real Nest backend from the start.",
        bullets: [
          "The command avoids the interactive wizard and leaves the project ready faster.",
          "If you already have a Nest app, only create `src/ai/functions-modules`.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npx @nestjs/cli@latest new navai-api-demo --package-manager npm --skip-git\ncd navai-api-demo\nmkdir src/ai\nmkdir src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Step 2 Install NAVAI dependencies",
        description:
          "Install the NAVAI backend package, dotenv, and an explicit `express` dependency so the mounted router is declared in your project.",
        bullets: [
          "This keeps the integration explicit even if Nest already uses Express internally.",
          "You do not need a second HTTP server for this quick example.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express dotenv @navai/voice-backend\nnpm install -D @types/express",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Step 3 Configure environment variables",
        description:
          "Create a `.env` file with the minimum realtime values and the folder that contains your NAVAI backend tools.",
        bullets: [
          "The same variables work for NestJS because the NAVAI contract is still the same.",
          "Keep `NAVAI_ALLOW_FRONTEND_API_KEY=false` unless you have a very specific internal need.",
        ],
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
        title: "Step 4 Create the backend function module",
        description:
          "Add one typed tool inside `src/ai/functions-modules` so the mounted NAVAI router can discover and execute it from NestJS.",
        bullets: [
          "The exported function name is still converted into `snake_case` for the HTTP contract.",
          "Start with one simple tool before adding database or service injections around it.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.ts",
            language: "typescript",
            code: 'type CompanySummaryPayload = {\n  company?: string;\n};\n\nexport async function getCompanySummary(payload: CompanySummaryPayload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a typed NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "Step 5 Mount NAVAI inside NestJS",
        description:
          "Update `main.ts` to enable CORS, expose `/health`, and mount the NAVAI router under `/navai` inside the same Nest application.",
        bullets: [
          "Your existing Nest controllers can continue working as usual.",
          "This keeps one backend URL for both your business API and NAVAI.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "typescript",
            code: 'import * as dotenv from "dotenv";\nimport express from "express";\nimport { NestFactory } from "@nestjs/core";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\nimport { AppModule } from "./app.module";\n\ndotenv.config();\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  const port = Number(process.env.PORT || 3000);\n  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n    .split(",")\n    .map((value) => value.trim())\n    .filter(Boolean);\n\n  app.enableCors({\n    origin: allowedOrigins,\n    credentials: true,\n  });\n\n  const expressApp = app.getHttpAdapter().getInstance();\n  const navai = express();\n\n  navai.use(express.json());\n\n  registerNavaiExpressRoutes(navai, {\n    backendOptions: {\n      openaiApiKey: process.env.OPENAI_API_KEY,\n      defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n      defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n      defaultInstructions:\n        process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n        "You are a helpful assistant for UI navigation and function execution.",\n      defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n      clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n      allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n    },\n    clientSecretPath: "/realtime/client-secret",\n    functionsListPath: "/functions",\n    functionsExecutePath: "/functions/execute",\n    functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n  });\n\n  expressApp.get("/health", (_req, res) => {\n    res.json({\n      ok: true,\n      service: "navai-api-demo",\n      endpoints: [\n        "/navai/realtime/client-secret",\n        "/navai/functions",\n        "/navai/functions/execute",\n      ],\n    });\n  });\n\n  expressApp.use("/navai", navai);\n\n  await app.listen(port);\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n}\n\nbootstrap();',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Step 6 Run and verify the mounted routes",
        description:
          "Start the Nest server and validate the same four checks. If they respond well, the mounted router is ready for clients.",
        bullets: [
          "The checks are identical because NAVAI exposes the same endpoints under `/navai`.",
          "If `GET /navai/functions` is empty, review `NAVAI_FUNCTIONS_FOLDERS` and the file export name first.",
        ],
        codeBlocks: [
          {
            label: "Start the server",
            language: "bash",
            code: "npm run start:dev",
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
          "With NestJS already exposing `/navai`, the frontend only needs the base URL of the same backend and the standard NAVAI endpoints.",
        bullets: [
          "Point the app to the Nest backend base URL.",
          "The NAVAI endpoints remain `/navai/realtime/client-secret`, `/navai/functions`, and `/navai/functions/execute`.",
          "If the frontend runs on another origin, keep that origin in `CORS_ORIGIN` before testing the session.",
        ],
      },
    ],
  },
  fr: {
    value: "nestjs",
    label: "NestJS",
    title: "NestJS + Router NAVAI monté",
    description:
      "Meilleur choix si vous avez déjà un backend Nest et que vous voulez exposer NAVAI sous `/navai` sans créer un autre contrat API.",
    bullets: [
      "Utilisez cette route uniquement si NestJS est déjà la base réelle de votre backend.",
      "NAVAI reste isolé dans son propre router Express monté.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Étape 1 Créer le projet NestJS",
        description:
          "Générez une nouvelle app Nest et créez le dossier où NAVAI chargera les fonctions backend. L'exemple reste ainsi aligné avec un vrai backend Nest dès le départ.",
        bullets: [
          "La commande évite l'assistant interactif et laisse le projet prêt plus rapidement.",
          "Si vous avez déjà une app Nest, créez seulement `src/ai/functions-modules`.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npx @nestjs/cli@latest new navai-api-demo --package-manager npm --skip-git\ncd navai-api-demo\nmkdir src/ai\nmkdir src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Étape 2 Installer les dépendances NAVAI",
        description:
          "Installez le package backend NAVAI, dotenv et une dépendance `express` explicite afin que le router monté soit déclaré dans votre projet.",
        bullets: [
          "Cela garde l'intégration explicite même si Nest utilise déjà Express en interne.",
          "Vous n'avez pas besoin d'un second serveur HTTP pour cet exemple rapide.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express dotenv @navai/voice-backend\nnpm install -D @types/express",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Étape 3 Configurer les variables d'environnement",
        description:
          "Créez un fichier `.env` avec les valeurs minimales Realtime et le dossier qui contient vos outils backend NAVAI.",
        bullets: [
          "Les mêmes variables fonctionnent avec NestJS car le contrat NAVAI reste le même.",
          "Laissez `NAVAI_ALLOW_FRONTEND_API_KEY=false` sauf besoin interne très spécifique.",
        ],
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
        title: "Étape 4 Créer le module de fonction backend",
        description:
          "Ajoutez un outil typé dans `src/ai/functions-modules` afin que le router NAVAI monté puisse le découvrir et l'exécuter depuis NestJS.",
        bullets: [
          "Le nom de fonction exporté est toujours converti en `snake_case` pour le contrat HTTP.",
          "Commencez par un outil simple avant d'ajouter base de données ou injections de service autour.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.ts",
            language: "typescript",
            code: 'type CompanySummaryPayload = {\n  company?: string;\n};\n\nexport async function getCompanySummary(payload: CompanySummaryPayload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a typed NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "Étape 5 Monter NAVAI dans NestJS",
        description:
          "Mettez à jour `main.ts` pour activer CORS, exposer `/health` et monter le router NAVAI sous `/navai` dans la même application Nest.",
        bullets: [
          "Vos contrôleurs Nest existants peuvent continuer à fonctionner normalement.",
          "Cela garde une seule URL backend pour votre API métier et pour NAVAI.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "typescript",
            code: 'import * as dotenv from "dotenv";\nimport express from "express";\nimport { NestFactory } from "@nestjs/core";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\nimport { AppModule } from "./app.module";\n\ndotenv.config();\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  const port = Number(process.env.PORT || 3000);\n  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n    .split(",")\n    .map((value) => value.trim())\n    .filter(Boolean);\n\n  app.enableCors({\n    origin: allowedOrigins,\n    credentials: true,\n  });\n\n  const expressApp = app.getHttpAdapter().getInstance();\n  const navai = express();\n\n  navai.use(express.json());\n\n  registerNavaiExpressRoutes(navai, {\n    backendOptions: {\n      openaiApiKey: process.env.OPENAI_API_KEY,\n      defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n      defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n      defaultInstructions:\n        process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n        "You are a helpful assistant for UI navigation and function execution.",\n      defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n      clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n      allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n    },\n    clientSecretPath: "/realtime/client-secret",\n    functionsListPath: "/functions",\n    functionsExecutePath: "/functions/execute",\n    functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n  });\n\n  expressApp.get("/health", (_req, res) => {\n    res.json({\n      ok: true,\n      service: "navai-api-demo",\n      endpoints: [\n        "/navai/realtime/client-secret",\n        "/navai/functions",\n        "/navai/functions/execute",\n      ],\n    });\n  });\n\n  expressApp.use("/navai", navai);\n\n  await app.listen(port);\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n}\n\nbootstrap();',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Étape 6 Démarrer et vérifier les routes montées",
        description:
          "Démarrez le serveur Nest puis validez les mêmes quatre vérifications. Si elles répondent correctement, le router monté est prêt pour les clients.",
        bullets: [
          "Les vérifications sont identiques car NAVAI expose les mêmes endpoints sous `/navai`.",
          "Si `GET /navai/functions` est vide, vérifiez d'abord `NAVAI_FUNCTIONS_FOLDERS` et le nom d'export du fichier.",
        ],
        codeBlocks: [
          {
            label: "Démarrer le serveur",
            language: "bash",
            code: "npm run start:dev",
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
          "Avec NestJS exposant déjà `/navai`, le frontend a seulement besoin de l'URL de base du même backend et des endpoints NAVAI standards.",
        bullets: [
          "Pointez l'application vers l'URL de base du backend Nest.",
          "Les endpoints NAVAI restent `/navai/realtime/client-secret`, `/navai/functions` et `/navai/functions/execute`.",
          "Si le frontend s'exécute sur une autre origine, gardez cette origine dans `CORS_ORIGIN` avant de tester la session.",
        ],
      },
    ],
  },
  es: {
    value: "nestjs",
    label: "NestJS",
    title: "NestJS + Router NAVAI Montado",
    description:
      "La mejor opción cuando ya tiene un backend Nest y quiere exponer NAVAI bajo `/navai` sin crear otro contrato API.",
    bullets: [
      "Use esta opción solo si NestJS ya es la base real de su backend.",
      "NAVAI queda aislado dentro de su propio router Express montado.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Paso 1 Crear el proyecto NestJS",
        description:
          "Genere una app Nest nueva y cree la carpeta donde NAVAI cargará las funciones backend. Así el ejemplo queda alineado desde el inicio con un backend Nest real.",
        bullets: [
          "El comando evita el asístente interactivo y deja el proyecto listo mas rapido.",
          "Si ya tiene una app Nest, solo cree `src/ai/functions-modules`.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npx @nestjs/cli@latest new navai-api-demo --package-manager npm --skip-git\ncd navai-api-demo\nmkdir src/ai\nmkdir src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Paso 2 Instalar dependencias NAVAI",
        description:
          "Instale el paquete backend de NAVAI, dotenv y una dependencia explícita de `express` para declarar formalmente el router montado dentro del proyecto.",
        bullets: [
          "Así la integración queda explícita aunque Nest ya use Express internamente.",
          "No necesita un segundo servidor HTTP para este ejemplo rapido.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express dotenv @navai/voice-backend\nnpm install -D @types/express",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Paso 3 Configurar variables",
        description:
          "Cree un archivo `.env` con los valores mínimos de realtime y la carpeta que contiene los tools backend de NAVAI.",
        bullets: [
          "Las mismas variables sirven en NestJS porque el contrato NAVAI sigue siendo el mismo.",
          "Mantenga `NAVAI_ALLOW_FRONTEND_API_KEY=false` salvo que tenga una necesidad interna muy puntual.",
        ],
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
        title: "Paso 4 Crear el módulo de función backend",
        description:
          "Agregue un tool tipado dentro de `src/ai/functions-modules` para que el router NAVAI montado pueda descubrirlo y ejecutarlo desde NestJS.",
        bullets: [
          "El nombre exportado seguirá convirtiendose a `snake_case` para el contrato HTTP.",
          "Empiece con un tool simple antes de agregar base de datos o servicios alrededor.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.ts",
            language: "typescript",
            code: 'type CompanySummaryPayload = {\n  company?: string;\n};\n\nexport async function getCompanySummary(payload: CompanySummaryPayload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} ya responde desde una tool backend tipada de NAVAI.`,\n    nextStep: "Conectar tu frontend o app movil al backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "Paso 5 Montar NAVAI dentro de NestJS",
        description:
          "Actualice `main.ts` para activar CORS, exponer `/health` y montar el router NAVAI bajo `/navai` dentro de la misma aplicacion Nest.",
        bullets: [
          "Sus controladores Nest existentes pueden seguir funcionando igual.",
          "Así conserva una sola URL backend para su API de negocio y para NAVAI.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "typescript",
            code: 'import * as dotenv from "dotenv";\nimport express from "express";\nimport { NestFactory } from "@nestjs/core";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\nimport { AppModule } from "./app.module";\n\ndotenv.config();\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  const port = Number(process.env.PORT || 3000);\n  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n    .split(",")\n    .map((value) => value.trim())\n    .filter(Boolean);\n\n  app.enableCors({\n    origin: allowedOrigins,\n    credentials: true,\n  });\n\n  const expressApp = app.getHttpAdapter().getInstance();\n  const navai = express();\n\n  navai.use(express.json());\n\n  registerNavaiExpressRoutes(navai, {\n    backendOptions: {\n      openaiApiKey: process.env.OPENAI_API_KEY,\n      defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n      defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n      defaultInstructions:\n        process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n        "Eres una asistente util para navegacion por interfaces y ejecucion de funciones.",\n      defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Spanish",\n      clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n      allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n    },\n    clientSecretPath: "/realtime/client-secret",\n    functionsListPath: "/functions",\n    functionsExecutePath: "/functions/execute",\n    functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n  });\n\n  expressApp.get("/health", (_req, res) => {\n    res.json({\n      ok: true,\n      service: "navai-api-demo",\n      endpoints: [\n        "/navai/realtime/client-secret",\n        "/navai/functions",\n        "/navai/functions/execute",\n      ],\n    });\n  });\n\n  expressApp.use("/navai", navai);\n\n  await app.listen(port);\n  console.log(`NAVAI API lista en http://localhost:${port}`);\n}\n\nbootstrap();',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Paso 6 Levantar y validar las rutas montadas",
        description:
          "Inicie Nest y valide los mismos cuatro checks. Si responden bien, el router montado ya está listo para clientes.",
        bullets: [
          "Los checks son identicos porque NAVAI expone los mismos endpoints bajo `/navai`.",
          "Si `GET /navai/functions` sale vacio, revise primero `NAVAI_FUNCTIONS_FOLDERS` y el nombre del export del archivo.",
        ],
        codeBlocks: [
          {
            label: "Levantar el servidor",
            language: "bash",
            code: "npm run start:dev",
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
          "Con NestJS exponiendo `/navai`, el frontend solo necesita la URL base del mismo backend y los endpoints estandar de NAVAI.",
        bullets: [
          "Apunte la app a la URL base del backend Nest.",
          "Los endpoints siguen siendo `/navai/realtime/client-secret`, `/navai/functions` y `/navai/functions/execute`.",
          "Si el frontend corre en otro origen, mantenga ese origen en `CORS_ORIGIN` antes de probar la sesión.",
        ],
      },
    ],
  },
  pt: {
    value: "nestjs",
    label: "NestJS",
    title: "NestJS + Router NAVAI montado",
    description:
      "Melhor opção quando você já tem um backend Nest e quer expor o NAVAI em `/navai` sem criar outro contrato de API.",
    bullets: [
      "Use esta rota apenas se o NestJS já for a base real do seu backend.",
      "O NAVAI permanece isolado dentro do próprio router Express montado.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Etapa 1 Criar o projeto NestJS",
        description:
          "Gere uma nova app Nest e crie a pasta em que o NAVAI vai carregar as funções backend. Assim o exemplo já fica alinhado com um backend Nest real desde o início.",
        bullets: [
          "O comando evita o assistente interativo e deixa o projeto pronto mais rápido.",
          "Se você já tem uma app Nest, crie apenas `src/ai/functions-modules`.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npx @nestjs/cli@latest new navai-api-demo --package-manager npm --skip-git\ncd navai-api-demo\nmkdir src/ai\nmkdir src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Etapa 2 Instalar dependências NAVAI",
        description:
          "Instale o pacote backend do NAVAI, dotenv e uma dependência explícita de `express` para declarar formalmente o router montado no projeto.",
        bullets: [
          "Isso mantém a integração explícita mesmo que o Nest já use Express internamente.",
          "Você não precisa de um segundo servidor HTTP para este exemplo rápido.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express dotenv @navai/voice-backend\nnpm install -D @types/express",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Etapa 3 Configurar variáveis de ambiente",
        description:
          "Crie um arquivo `.env` com os valores mínimos de Realtime e a pasta que contém suas ferramentas backend do NAVAI.",
        bullets: [
          "As mesmas variáveis funcionam no NestJS porque o contrato NAVAI continua igual.",
          "Mantenha `NAVAI_ALLOW_FRONTEND_API_KEY=false` a menos que exista uma necessidade interna muito específica.",
        ],
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
        title: "Etapa 4 Criar o módulo de função backend",
        description:
          "Adicione uma ferramenta tipada em `src/ai/functions-modules` para que o router NAVAI montado consiga descobri-la e executá-la a partir do NestJS.",
        bullets: [
          "O nome da função exportada continua sendo convertido para `snake_case` no contrato HTTP.",
          "Comece com uma ferramenta simples antes de adicionar banco de dados ou injeções de serviço ao redor.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.ts",
            language: "typescript",
            code: 'type CompanySummaryPayload = {\n  company?: string;\n};\n\nexport async function getCompanySummary(payload: CompanySummaryPayload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a typed NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "Etapa 5 Montar o NAVAI dentro do NestJS",
        description:
          "Atualize `main.ts` para ativar CORS, expor `/health` e montar o router NAVAI em `/navai` dentro da mesma aplicação Nest.",
        bullets: [
          "Seus controllers Nest existentes podem continuar funcionando normalmente.",
          "Isso mantém uma única URL backend para sua API de negócio e para o NAVAI.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "typescript",
            code: 'import * as dotenv from "dotenv";\nimport express from "express";\nimport { NestFactory } from "@nestjs/core";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\nimport { AppModule } from "./app.module";\n\ndotenv.config();\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  const port = Number(process.env.PORT || 3000);\n  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n    .split(",")\n    .map((value) => value.trim())\n    .filter(Boolean);\n\n  app.enableCors({\n    origin: allowedOrigins,\n    credentials: true,\n  });\n\n  const expressApp = app.getHttpAdapter().getInstance();\n  const navai = express();\n\n  navai.use(express.json());\n\n  registerNavaiExpressRoutes(navai, {\n    backendOptions: {\n      openaiApiKey: process.env.OPENAI_API_KEY,\n      defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n      defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n      defaultInstructions:\n        process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n        "You are a helpful assistant for UI navigation and function execution.",\n      defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n      clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n      allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n    },\n    clientSecretPath: "/realtime/client-secret",\n    functionsListPath: "/functions",\n    functionsExecutePath: "/functions/execute",\n    functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n  });\n\n  expressApp.get("/health", (_req, res) => {\n    res.json({\n      ok: true,\n      service: "navai-api-demo",\n      endpoints: [\n        "/navai/realtime/client-secret",\n        "/navai/functions",\n        "/navai/functions/execute",\n      ],\n    });\n  });\n\n  expressApp.use("/navai", navai);\n\n  await app.listen(port);\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n}\n\nbootstrap();',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Etapa 6 Iniciar e validar as rotas montadas",
        description:
          "Inicie o servidor Nest e valide as mesmas quatro verificações. Se responderem bem, o router montado está pronto para os clientes.",
        bullets: [
          "As verificações são idênticas porque o NAVAI expõe os mesmos endpoints em `/navai`.",
          "Se `GET /navai/functions` vier vazio, revise primeiro `NAVAI_FUNCTIONS_FOLDERS` e o nome do export do arquivo.",
        ],
        codeBlocks: [
          {
            label: "Iniciar o servidor",
            language: "bash",
            code: "npm run start:dev",
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
          "Com o NestJS já expondo `/navai`, o frontend só precisa da URL base do mesmo backend e dos endpoints padrão do NAVAI.",
        bullets: [
          "Aponte a aplicação para a URL base do backend Nest.",
          "Os endpoints NAVAI continuam sendo `/navai/realtime/client-secret`, `/navai/functions` e `/navai/functions/execute`.",
          "Se o frontend roda em outra origem, mantenha essa origem em `CORS_ORIGIN` antes de testar a sessão.",
        ],
      },
    ],
  },
  zh: {
    value: "nestjs",
    label: "NestJS",
    title: "NestJS + 挂载的 NAVAI Router",
    description:
      "如果您已经有一个 Nest 后端，并希望在 `/navai` 下暴露 NAVAI 而不再创建另一套 API 契约，这是最合适的路线。",
    bullets: [
      "只有当 NestJS 已经是您的真实后端基础时，才使用这条路线。",
      "NAVAI 会保持隔离，并挂载在自己的 Express Router 中。",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "步骤 1 创建 NestJS 项目",
        description:
          "生成一个新的 Nest 应用，并创建 NAVAI 用来加载后端函数的目录。这样示例从一开始就与真实的 Nest 后端保持一致。",
        bullets: [
          "该命令会跳过交互式向导，让项目更快可用。",
          "如果您已经有 Nest 应用，只需创建 `src/ai/functions-modules`。",
        ],
        codeBlocks: [
          {
            label: "终端",
            language: "bash",
            code: "npx @nestjs/cli@latest new navai-api-demo --package-manager npm --skip-git\ncd navai-api-demo\nmkdir src/ai\nmkdir src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "步骤 2 安装 NAVAI 依赖",
        description:
          "安装 NAVAI 后端包、dotenv，以及显式的 `express` 依赖，这样挂载的 Router 会在项目中明确声明。",
        bullets: [
          "即使 Nest 内部已经使用 Express，这样也能让集成方式更清晰。",
          "这个快速示例不需要第二个 HTTP 服务器。",
        ],
        codeBlocks: [
          {
            label: "终端",
            language: "bash",
            code: "npm install express dotenv @navai/voice-backend\nnpm install -D @types/express",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "步骤 3 配置环境变量",
        description:
          "创建一个 `.env` 文件，填入最小的 Realtime 配置，以及包含 NAVAI 后端工具的目录。",
        bullets: [
          "同样的变量也适用于 NestJS，因为 NAVAI 契约并没有变化。",
          "除非有非常明确的内部需求，否则保持 `NAVAI_ALLOW_FRONTEND_API_KEY=false`。",
        ],
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
        title: "步骤 4 创建后端函数模块",
        description:
          "在 `src/ai/functions-modules` 中添加一个类型化工具，这样挂载的 NAVAI Router 就能在 NestJS 中发现并执行它。",
        bullets: [
          "导出的函数名仍然会被转换为 `snake_case` 以匹配 HTTP 契约。",
          "先从一个简单工具开始，再逐步加入数据库或服务注入。",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.ts",
            language: "typescript",
            code: 'type CompanySummaryPayload = {\n  company?: string;\n};\n\nexport async function getCompanySummary(payload: CompanySummaryPayload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a typed NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "步骤 5 在 NestJS 中挂载 NAVAI",
        description:
          "更新 `main.ts`，启用 CORS、暴露 `/health`，并在同一个 Nest 应用中把 NAVAI Router 挂载到 `/navai`。",
        bullets: [
          "您现有的 Nest 控制器可以继续正常工作。",
          "这样您的业务 API 和 NAVAI 只需要共享同一个后端 URL。",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "typescript",
            code: 'import * as dotenv from "dotenv";\nimport express from "express";\nimport { NestFactory } from "@nestjs/core";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\nimport { AppModule } from "./app.module";\n\ndotenv.config();\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  const port = Number(process.env.PORT || 3000);\n  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n    .split(",")\n    .map((value) => value.trim())\n    .filter(Boolean);\n\n  app.enableCors({\n    origin: allowedOrigins,\n    credentials: true,\n  });\n\n  const expressApp = app.getHttpAdapter().getInstance();\n  const navai = express();\n\n  navai.use(express.json());\n\n  registerNavaiExpressRoutes(navai, {\n    backendOptions: {\n      openaiApiKey: process.env.OPENAI_API_KEY,\n      defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n      defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n      defaultInstructions:\n        process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n        "You are a helpful assistant for UI navigation and function execution.",\n      defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n      clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n      allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n    },\n    clientSecretPath: "/realtime/client-secret",\n    functionsListPath: "/functions",\n    functionsExecutePath: "/functions/execute",\n    functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n  });\n\n  expressApp.get("/health", (_req, res) => {\n    res.json({\n      ok: true,\n      service: "navai-api-demo",\n      endpoints: [\n        "/navai/realtime/client-secret",\n        "/navai/functions",\n        "/navai/functions/execute",\n      ],\n    });\n  });\n\n  expressApp.use("/navai", navai);\n\n  await app.listen(port);\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n}\n\nbootstrap();',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "步骤 6 启动并验证已挂载的路由",
        description:
          "启动 Nest 服务器，并验证相同的四个检查。如果都能正常返回，挂载的 Router 就已经可以供客户端使用。",
        bullets: [
          "这些检查是一样的，因为 NAVAI 在 `/navai` 下暴露的还是相同端点。",
          "如果 `GET /navai/functions` 返回为空，请先检查 `NAVAI_FUNCTIONS_FOLDERS` 和文件导出名称。",
        ],
        codeBlocks: [
          {
            label: "启动服务器",
            language: "bash",
            code: "npm run start:dev",
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
          "当 NestJS 已经暴露 `/navai` 之后，前端只需要同一个后端的基础 URL 和标准 NAVAI 端点。",
        bullets: [
          "将应用指向 Nest 后端的基础 URL。",
          "NAVAI 端点仍然是 `/navai/realtime/client-secret`、`/navai/functions` 和 `/navai/functions/execute`。",
          "如果前端运行在其他来源，请在测试会话前把该来源保留在 `CORS_ORIGIN` 中。",
        ],
      },
    ],
  },
  ja: {
    value: "nestjs",
    label: "NestJS",
    title: "NestJS + マウントされた NAVAI Router",
    description:
      "既に Nest バックエンドがあり、別の API 契約を作らずに `/navai` 配下へ NAVAI を公開したい場合に最適です。",
    bullets: [
      "NestJS が実際のバックエンド基盤である場合にだけこのルートを使ってください。",
      "NAVAI は独自の Express Router として分離されたままです。",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "ステップ 1 NestJS プロジェクトを作成する",
        description:
          "新しい Nest アプリを生成し、NAVAI がバックエンド関数を読み込むフォルダを作成します。これで最初から実際の Nest バックエンドに沿った例になります。",
        bullets: [
          "このコマンドは対話ウィザードを避け、より早くプロジェクトを準備できます。",
          "既に Nest アプリがある場合は `src/ai/functions-modules` だけ作成してください。",
        ],
        codeBlocks: [
          {
            label: "ターミナル",
            language: "bash",
            code: "npx @nestjs/cli@latest new navai-api-demo --package-manager npm --skip-git\ncd navai-api-demo\nmkdir src/ai\nmkdir src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "ステップ 2 NAVAI 依存関係をインストールする",
        description:
          "NAVAI バックエンドパッケージ、dotenv、明示的な `express` 依存をインストールして、マウントする Router をプロジェクト内で明確に宣言します。",
        bullets: [
          "Nest が内部的に Express を使っていても、統合がより明示的になります。",
          "この簡易例では 2 つ目の HTTP サーバーは不要です。",
        ],
        codeBlocks: [
          {
            label: "ターミナル",
            language: "bash",
            code: "npm install express dotenv @navai/voice-backend\nnpm install -D @types/express",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "ステップ 3 環境変数を設定する",
        description:
          "最小限の Realtime 値と、NAVAI バックエンドツールを含むフォルダを持つ `.env` ファイルを作成します。",
        bullets: [
          "NAVAI 契約は同じなので、NestJS でも同じ変数が使えます。",
          "非常に特殊な内部要件がない限り、`NAVAI_ALLOW_FRONTEND_API_KEY=false` のままにしてください。",
        ],
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
        title: "ステップ 4 バックエンド関数モジュールを作成する",
        description:
          "`src/ai/functions-modules` に型付きツールを追加し、マウントされた NAVAI Router が NestJS からそれを検出・実行できるようにします。",
        bullets: [
          "export された関数名は HTTP 契約用に引き続き `snake_case` に変換されます。",
          "データベースやサービス注入を追加する前に、まず単純なツール 1 つから始めてください。",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.ts",
            language: "typescript",
            code: 'type CompanySummaryPayload = {\n  company?: string;\n};\n\nexport async function getCompanySummary(payload: CompanySummaryPayload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a typed NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "ステップ 5 NestJS 内に NAVAI をマウントする",
        description:
          "`main.ts` を更新して CORS を有効にし、`/health` を公開し、同じ Nest アプリ内で NAVAI Router を `/navai` にマウントします。",
        bullets: [
          "既存の Nest コントローラーはそのまま動かし続けられます。",
          "これにより業務 API と NAVAI の両方で 1 つのバックエンド URL を保てます。",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "typescript",
            code: 'import * as dotenv from "dotenv";\nimport express from "express";\nimport { NestFactory } from "@nestjs/core";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\nimport { AppModule } from "./app.module";\n\ndotenv.config();\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  const port = Number(process.env.PORT || 3000);\n  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n    .split(",")\n    .map((value) => value.trim())\n    .filter(Boolean);\n\n  app.enableCors({\n    origin: allowedOrigins,\n    credentials: true,\n  });\n\n  const expressApp = app.getHttpAdapter().getInstance();\n  const navai = express();\n\n  navai.use(express.json());\n\n  registerNavaiExpressRoutes(navai, {\n    backendOptions: {\n      openaiApiKey: process.env.OPENAI_API_KEY,\n      defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n      defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n      defaultInstructions:\n        process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n        "You are a helpful assistant for UI navigation and function execution.",\n      defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n      clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n      allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n    },\n    clientSecretPath: "/realtime/client-secret",\n    functionsListPath: "/functions",\n    functionsExecutePath: "/functions/execute",\n    functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n  });\n\n  expressApp.get("/health", (_req, res) => {\n    res.json({\n      ok: true,\n      service: "navai-api-demo",\n      endpoints: [\n        "/navai/realtime/client-secret",\n        "/navai/functions",\n        "/navai/functions/execute",\n      ],\n    });\n  });\n\n  expressApp.use("/navai", navai);\n\n  await app.listen(port);\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n}\n\nbootstrap();',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "ステップ 6 マウントしたルートを起動して検証する",
        description:
          "Nest サーバーを起動し、同じ 4 つのチェックを確認します。正常に応答すれば、マウントされた Router はクライアント利用の準備ができています。",
        bullets: [
          "NAVAI は `/navai` 配下に同じエンドポイントを公開するため、チェック内容は同じです。",
          "`GET /navai/functions` が空なら、まず `NAVAI_FUNCTIONS_FOLDERS` とファイルの export 名を確認してください。",
        ],
        codeBlocks: [
          {
            label: "サーバーを起動",
            language: "bash",
            code: "npm run start:dev",
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
          "NestJS がすでに `/navai` を公開していれば、フロントエンドに必要なのは同じバックエンドのベース URL と標準 NAVAI エンドポイントだけです。",
        bullets: [
          "アプリを Nest バックエンドのベース URL に向けてください。",
          "NAVAI エンドポイントは引き続き `/navai/realtime/client-secret`、`/navai/functions`、`/navai/functions/execute` です。",
          "フロントエンドが別オリジンで動く場合は、セッションをテストする前にそのオリジンを `CORS_ORIGIN` に含めてください。",
        ],
      },
    ],
  },
  ru: {
    value: "nestjs",
    label: "NestJS",
    title: "NestJS + подключенный NAVAI Router",
    description:
      "Лучший вариант, если у вас уже есть Nest backend и вы хотите опубликовать NAVAI под `/navai`, не создавая еще один API-контракт.",
    bullets: [
      "Используйте этот путь только если NestJS уже является реальной основой вашего backend.",
      "NAVAI остается изолированным внутри собственного подключенного Express Router.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Шаг 1 Создать проект NestJS",
        description:
          "Сгенерируйте новый Nest app и создайте папку, из которой NAVAI будет загружать backend-функции. Так пример с самого начала совпадает с реальным Nest backend.",
        bullets: [
          "Команда обходит интерактивный мастер и быстрее подготавливает проект.",
          "Если у вас уже есть Nest app, создайте только `src/ai/functions-modules`.",
        ],
        codeBlocks: [
          {
            label: "Терминал",
            language: "bash",
            code: "npx @nestjs/cli@latest new navai-api-demo --package-manager npm --skip-git\ncd navai-api-demo\nmkdir src/ai\nmkdir src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Шаг 2 Установить зависимости NAVAI",
        description:
          "Установите backend-пакет NAVAI, dotenv и явную зависимость `express`, чтобы подключаемый Router был явно объявлен в проекте.",
        bullets: [
          "Так интеграция остается явной, даже если Nest уже использует Express внутри.",
          "Для этого быстрого примера второй HTTP-сервер не нужен.",
        ],
        codeBlocks: [
          {
            label: "Терминал",
            language: "bash",
            code: "npm install express dotenv @navai/voice-backend\nnpm install -D @types/express",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Шаг 3 Настроить переменные окружения",
        description:
          "Создайте файл `.env` с минимальными Realtime-значениями и папкой, содержащей ваши backend-инструменты NAVAI.",
        bullets: [
          "Те же переменные работают и для NestJS, потому что контракт NAVAI остается прежним.",
          "Оставьте `NAVAI_ALLOW_FRONTEND_API_KEY=false`, если только у вас нет очень специфической внутренней необходимости.",
        ],
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
        title: "Шаг 4 Создать модуль backend-функции",
        description:
          "Добавьте типизированный инструмент в `src/ai/functions-modules`, чтобы подключенный NAVAI Router мог находить и выполнять его из NestJS.",
        bullets: [
          "Имя экспортируемой функции по-прежнему преобразуется в `snake_case` для HTTP-контракта.",
          "Начните с одного простого инструмента, прежде чем добавлять базу данных или внедрение сервисов.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.ts",
            language: "typescript",
            code: 'type CompanySummaryPayload = {\n  company?: string;\n};\n\nexport async function getCompanySummary(payload: CompanySummaryPayload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} already responds from a typed NAVAI backend tool.`,\n    nextStep: "Connect your frontend or mobile app to the backend.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "Шаг 5 Подключить NAVAI внутри NestJS",
        description:
          "Обновите `main.ts`, чтобы включить CORS, открыть `/health` и подключить NAVAI Router под `/navai` в том же приложении Nest.",
        bullets: [
          "Ваши существующие Nest-контроллеры могут продолжать работать как обычно.",
          "Это позволяет использовать один backend URL и для бизнес API, и для NAVAI.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "typescript",
            code: 'import * as dotenv from "dotenv";\nimport express from "express";\nimport { NestFactory } from "@nestjs/core";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\nimport { AppModule } from "./app.module";\n\ndotenv.config();\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  const port = Number(process.env.PORT || 3000);\n  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n    .split(",")\n    .map((value) => value.trim())\n    .filter(Boolean);\n\n  app.enableCors({\n    origin: allowedOrigins,\n    credentials: true,\n  });\n\n  const expressApp = app.getHttpAdapter().getInstance();\n  const navai = express();\n\n  navai.use(express.json());\n\n  registerNavaiExpressRoutes(navai, {\n    backendOptions: {\n      openaiApiKey: process.env.OPENAI_API_KEY,\n      defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n      defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n      defaultInstructions:\n        process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n        "You are a helpful assistant for UI navigation and function execution.",\n      defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n      clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n      allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n    },\n    clientSecretPath: "/realtime/client-secret",\n    functionsListPath: "/functions",\n    functionsExecutePath: "/functions/execute",\n    functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n  });\n\n  expressApp.get("/health", (_req, res) => {\n    res.json({\n      ok: true,\n      service: "navai-api-demo",\n      endpoints: [\n        "/navai/realtime/client-secret",\n        "/navai/functions",\n        "/navai/functions/execute",\n      ],\n    });\n  });\n\n  expressApp.use("/navai", navai);\n\n  await app.listen(port);\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n}\n\nbootstrap();',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Шаг 6 Запустить и проверить подключенные маршруты",
        description:
          "Запустите Nest-сервер и выполните те же четыре проверки. Если они отвечают корректно, подключенный Router готов для клиентов.",
        bullets: [
          "Проверки идентичны, потому что NAVAI публикует те же endpoints под `/navai`.",
          "Если `GET /navai/functions` пустой, сначала проверьте `NAVAI_FUNCTIONS_FOLDERS` и имя export в файле.",
        ],
        codeBlocks: [
          {
            label: "Запустить сервер",
            language: "bash",
            code: "npm run start:dev",
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
          "Если NestJS уже публикует `/navai`, frontend нужен только базовый URL того же backend и стандартные endpoints NAVAI.",
        bullets: [
          "Направьте приложение на базовый URL Nest backend.",
          "NAVAI endpoints остаются `/navai/realtime/client-secret`, `/navai/functions` и `/navai/functions/execute`.",
          "Если frontend работает на другом origin, сохраните этот origin в `CORS_ORIGIN` перед тестированием сессии.",
        ],
      },
    ],
  },
  ko: {
    value: "nestjs",
    label: "NestJS",
    title: "NestJS + 마운트된 NAVAI Router",
    description:
      "이미 Nest 백엔드가 있고 다른 API 계약을 만들지 않고 `/navai` 아래에 NAVAI를 노출하고 싶을 때 가장 적합합니다.",
    bullets: [
      "NestJS가 실제 백엔드 기반일 때만 이 경로를 사용하세요.",
      "NAVAI는 자체 마운트된 Express 라우터 내부에 분리된 상태로 유지됩니다.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "단계 1 NestJS 프로젝트 만들기",
        description:
          "새 Nest 앱을 생성하고 NAVAI가 백엔드 함수를 로드할 폴더를 만드세요. 이렇게 하면 예제가 처음부터 실제 Nest 백엔드와 맞춰집니다.",
        bullets: [
          "이 명령은 대화형 마법사를 건너뛰어 프로젝트를 더 빨리 준비합니다.",
          "이미 Nest 앱이 있다면 `src/ai/functions-modules` 만 만들면 됩니다.",
        ],
        codeBlocks: [
          {
            label: "터미널",
            language: "bash",
            code: "npx @nestjs/cli@latest new navai-api-demo --package-manager npm --skip-git\ncd navai-api-demo\nmkdir src/ai\nmkdir src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "단계 2 NAVAI 의존성 설치",
        description:
          "NAVAI 백엔드 패키지, dotenv, 그리고 프로젝트에 마운트된 라우터가 명시되도록 `express` 의존성을 설치하세요.",
        bullets: [
          "Nest가 내부적으로 Express를 사용하더라도 통합이 명확하게 유지됩니다.",
          "이 빠른 예제에는 두 번째 HTTP 서버가 필요하지 않습니다.",
        ],
        codeBlocks: [
          {
            label: "터미널",
            language: "bash",
            code: "npm install express dotenv @navai/voice-backend\nnpm install -D @types/express",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "단계 3 환경 변수 설정",
        description:
          "최소 realtime 값과 NAVAI 백엔드 도구가 들어 있는 폴더를 포함한 `.env` 파일을 만드세요.",
        bullets: [
          "NAVAI 계약이 동일하므로 같은 변수를 NestJS에서도 사용할 수 있습니다.",
          "아주 특별한 내부 요구가 없다면 `NAVAI_ALLOW_FRONTEND_API_KEY=false` 를 유지하세요.",
        ],
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
        title: "단계 4 백엔드 함수 모듈 만들기",
        description:
          "`src/ai/functions-modules` 안에 타입이 지정된 도구 하나를 추가해 마운트된 NAVAI 라우터가 NestJS에서 이를 발견하고 실행할 수 있게 하세요.",
        bullets: [
          "내보낸 함수 이름은 HTTP 계약을 위해 계속 `snake_case` 로 변환됩니다.",
          "주변에 데이터베이스나 서비스 주입을 추가하기 전에 단순한 도구 하나부터 시작하세요.",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.ts",
            language: "typescript",
            code: 'type CompanySummaryPayload = {\n  company?: string;\n};\n\nexport async function getCompanySummary(payload: CompanySummaryPayload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company}는 이미 타입이 지정된 NAVAI 백엔드 도구에서 응답하고 있습니다.`,\n    nextStep: "프런트엔드나 모바일 앱을 백엔드에 연결하세요.",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "단계 5 NestJS 안에 NAVAI 마운트하기",
        description:
          "`main.ts` 를 업데이트해 CORS를 활성화하고 `/health` 를 노출한 뒤, 같은 Nest 앱 안에서 `/navai` 아래에 NAVAI 라우터를 마운트하세요.",
        bullets: [
          "기존 Nest 컨트롤러는 평소처럼 계속 동작할 수 있습니다.",
          "이렇게 하면 비즈니스 API와 NAVAI 모두 하나의 백엔드 URL을 유지합니다.",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "typescript",
            code: 'import * as dotenv from "dotenv";\nimport express from "express";\nimport { NestFactory } from "@nestjs/core";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\nimport { AppModule } from "./app.module";\n\ndotenv.config();\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  const port = Number(process.env.PORT || 3000);\n  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n    .split(",")\n    .map((value) => value.trim())\n    .filter(Boolean);\n\n  app.enableCors({\n    origin: allowedOrigins,\n    credentials: true,\n  });\n\n  const expressApp = app.getHttpAdapter().getInstance();\n  const navai = express();\n\n  navai.use(express.json());\n\n  registerNavaiExpressRoutes(navai, {\n    backendOptions: {\n      openaiApiKey: process.env.OPENAI_API_KEY,\n      defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n      defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n      defaultInstructions:\n        process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n        "당신은 UI 탐색과 함수 실행을 돕는 유용한 도우미입니다.",\n      defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Korean",\n      clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n      allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n    },\n    clientSecretPath: "/realtime/client-secret",\n    functionsListPath: "/functions",\n    functionsExecutePath: "/functions/execute",\n    functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n  });\n\n  expressApp.get("/health", (_req, res) => {\n    res.json({\n      ok: true,\n      service: "navai-api-demo",\n      endpoints: [\n        "/navai/realtime/client-secret",\n        "/navai/functions",\n        "/navai/functions/execute",\n      ],\n    });\n  });\n\n  expressApp.use("/navai", navai);\n\n  await app.listen(port);\n  console.log(`NAVAI API 준비 완료: http://localhost:${port}`);\n}\n\nbootstrap();',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "단계 6 마운트된 경로 실행 및 검증",
        description:
          "Nest 서버를 시작하고 같은 네 가지 확인을 수행하세요. 응답이 모두 정상이면 마운트된 라우터는 클라이언트를 받을 준비가 된 것입니다.",
        bullets: [
          "NAVAI가 `/navai` 아래에 같은 엔드포인트를 노출하므로 확인 절차는 동일합니다.",
          "`GET /navai/functions` 가 비어 있다면 먼저 `NAVAI_FUNCTIONS_FOLDERS` 와 파일 export 이름을 확인하세요.",
        ],
        codeBlocks: [
          {
            label: "서버 시작",
            language: "bash",
            code: "npm run start:dev",
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
          "NestJS가 이미 `/navai` 를 노출하고 있으면 프런트엔드에는 같은 백엔드의 기본 URL과 표준 NAVAI 엔드포인트만 있으면 됩니다.",
        bullets: [
          "앱을 Nest 백엔드 기본 URL로 지정하세요.",
          "NAVAI 엔드포인트는 `/navai/realtime/client-secret`, `/navai/functions`, `/navai/functions/execute` 그대로입니다.",
          "프런트엔드가 다른 origin에서 실행된다면 세션을 테스트하기 전에 그 origin을 `CORS_ORIGIN` 에 유지하세요.",
        ],
      },
    ],
  },
  hi: {
    value: "nestjs",
    label: "NestJS",
    title: "NestJS + माउंट किया हुआ NAVAI Router",
    description:
      "जब आपके पास पहले से Nest backend हो और आप दूसरा API contract बनाए बिना NAVAI को `/navai` के तहत expose करना चाहें, तब यह सबसे अच्छा विकल्प है।",
    bullets: [
      "यह route तभी उपयोग करें जब NestJS सच में आपका मुख्य backend base हो।",
      "NAVAI अपने अलग mounted Express router के भीतर isolated रहता है।",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "चरण 1 NestJS प्रोजेक्ट बनाएं",
        description:
          "एक नया Nest app तैयार करें और वह folder बनाएं जहाँ NAVAI backend functions लोड करेगा। इससे उदाहरण शुरू से ही एक वास्तविक Nest backend के अनुरूप रहता है।",
        bullets: [
          "यह command interactive wizard से बचाती है और project को जल्दी तैयार करती है।",
          "अगर आपके पास पहले से Nest app है, तो केवल `src/ai/functions-modules` बनाएं।",
        ],
        codeBlocks: [
          {
            label: "टर्मिनल",
            language: "bash",
            code: "npx @nestjs/cli@latest new navai-api-demo --package-manager npm --skip-git\ncd navai-api-demo\nmkdir src/ai\nmkdir src/ai/functions-modules",
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "चरण 2 NAVAI dependencies इंस्टॉल करें",
        description:
          "NAVAI backend package, dotenv, और एक स्पष्ट `express` dependency इंस्टॉल करें ताकि mounted router आपके project में घोषित रहे।",
        bullets: [
          "इससे integration स्पष्ट रहती है, भले ही Nest अंदर से पहले ही Express उपयोग करता हो।",
          "इस त्वरित उदाहरण के लिए आपको दूसरा HTTP server नहीं चाहिए।",
        ],
        codeBlocks: [
          {
            label: "टर्मिनल",
            language: "bash",
            code: "npm install express dotenv @navai/voice-backend\nnpm install -D @types/express",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "चरण 3 एन्वायरनमेंट वेरिएबल सेट करें",
        description:
          "एक `.env` फ़ाइल बनाएं जिसमें न्यूनतम realtime values और वह folder हो जिसमें आपके NAVAI backend tools हैं।",
        bullets: [
          "वही variables NestJS के लिए भी काम करते हैं क्योंकि NAVAI contract वही रहता है।",
          "जब तक कोई बहुत खास internal ज़रूरत न हो, `NAVAI_ALLOW_FRONTEND_API_KEY=false` रखें।",
        ],
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
        title: "चरण 4 बैकएंड function module बनाएं",
        description:
          "`src/ai/functions-modules` के भीतर एक typed tool जोड़ें ताकि mounted NAVAI router उसे NestJS से discover और execute कर सके।",
        bullets: [
          "HTTP contract के लिए exported function name अब भी `snake_case` में बदला जाता है।",
          "उसके आसपास database या service injections जोड़ने से पहले एक साधारण tool से शुरू करें।",
        ],
        codeBlocks: [
          {
            label: "src/ai/functions-modules/getCompanySummary.ts",
            language: "typescript",
            code: 'type CompanySummaryPayload = {\n  company?: string;\n};\n\nexport async function getCompanySummary(payload: CompanySummaryPayload = {}) {\n  const company = String(payload.company || "NAVAI Demo").trim();\n\n  return {\n    ok: true,\n    company,\n    summary: `${company} के लिए typed NAVAI backend tool पहले से response दे रहा है।`,\n    nextStep: "अपने frontend या mobile app को backend से कनेक्ट करें।",\n  };\n}',
          },
        ],
      },
      {
        id: "paso-5-crear-servidor-navai",
        title: "चरण 5 NestJS के भीतर NAVAI माउंट करें",
        description:
          "`main.ts` अपडेट करें ताकि CORS सक्षम हो, `/health` expose हो, और उसी Nest application में `/navai` के नीचे NAVAI router mount हो।",
        bullets: [
          "आपके मौजूदा Nest controllers सामान्य रूप से काम करते रह सकते हैं।",
          "इससे आपकी business API और NAVAI, दोनों के लिए एक ही backend URL बना रहता है।",
        ],
        codeBlocks: [
          {
            label: "src/main.ts",
            language: "typescript",
            code: 'import * as dotenv from "dotenv";\nimport express from "express";\nimport { NestFactory } from "@nestjs/core";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\nimport { AppModule } from "./app.module";\n\ndotenv.config();\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  const port = Number(process.env.PORT || 3000);\n  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n    .split(",")\n    .map((value) => value.trim())\n    .filter(Boolean);\n\n  app.enableCors({\n    origin: allowedOrigins,\n    credentials: true,\n  });\n\n  const expressApp = app.getHttpAdapter().getInstance();\n  const navai = express();\n\n  navai.use(express.json());\n\n  registerNavaiExpressRoutes(navai, {\n    backendOptions: {\n      openaiApiKey: process.env.OPENAI_API_KEY,\n      defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n      defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n      defaultInstructions:\n        process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n        "आप UI नेविगेशन और फ़ंक्शन execution में मदद करने वाले उपयोगी सहायक हैं।",\n      defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Hindi",\n      clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n      allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n    },\n    clientSecretPath: "/realtime/client-secret",\n    functionsListPath: "/functions",\n    functionsExecutePath: "/functions/execute",\n    functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n  });\n\n  expressApp.get("/health", (_req, res) => {\n    res.json({\n      ok: true,\n      service: "navai-api-demo",\n      endpoints: [\n        "/navai/realtime/client-secret",\n        "/navai/functions",\n        "/navai/functions/execute",\n      ],\n    });\n  });\n\n  expressApp.use("/navai", navai);\n\n  await app.listen(port);\n  console.log(`NAVAI API यहाँ तैयार है: http://localhost:${port}`);\n}\n\nbootstrap();',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "चरण 6 माउंटेड routes चलाएँ और जाँचें",
        description:
          "Nest server चालू करें और वही चार checks validate करें। अगर वे सही respond करें, तो mounted router clients के लिए तैयार है।",
        bullets: [
          "Checks एक जैसे हैं क्योंकि NAVAI `/navai` के तहत वही endpoints expose करता है।",
          "अगर `GET /navai/functions` खाली हो, तो पहले `NAVAI_FUNCTIONS_FOLDERS` और file export name जाँचें।",
        ],
        codeBlocks: [
          {
            label: "सर्वर चलाएँ",
            language: "bash",
            code: "npm run start:dev",
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
          "जब NestJS पहले से `/navai` expose कर रहा हो, तो frontend को केवल उसी backend का base URL और standard NAVAI endpoints चाहिए होते हैं।",
        bullets: [
          "App को Nest backend के base URL पर point करें।",
          "NAVAI endpoints वही रहते हैं: `/navai/realtime/client-secret`, `/navai/functions`, और `/navai/functions/execute`।",
          "अगर frontend किसी दूसरे origin पर चलता है, तो session test करने से पहले उस origin को `CORS_ORIGIN` में रखें।",
        ],
      },
    ],
  },
};

export function getApiNestjsGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return withApiNgrokMobileTesting(
    getLocalizedInstallationGuideTab(API_NESTJS_GUIDE_TABS, language),
    language,
  );
}
