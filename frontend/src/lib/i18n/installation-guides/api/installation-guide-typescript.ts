import type { InstallationGuideTab, LanguageCode } from "@/lib/i18n/messages";

import { getLocalizedInstallationGuideTab } from "../helpers";
import { withApiNgrokMobileTesting } from "./ngrok-mobile-testing";

const API_TYPESCRIPT_GUIDE_TABS: Partial<
  Record<LanguageCode, InstallationGuideTab>
> = {
  en: {
    value: "typescript",
    label: "TypeScript",
    title: "Express + TypeScript",
    description:
      "Same quick route, but with typed files, `tsx` for local dev, and a build output for deployment.",
    bullets: [
      "Recommended if your team already keeps backend code typed.",
      "The NAVAI contract stays the same, only the project setup changes.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Step 1 Create the TypeScript project",
        description:
          "Create the project, prepare `src`, and add a minimal `tsconfig.json` so you can run locally with `tsx` and deploy from `dist` later.",
        bullets: [
          "Use Node.js 20 or newer.",
          "This path keeps local setup fast and still gives you a production build.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="tsx watch src/server.ts"\nnpm pkg set scripts.build="tsc -p tsconfig.json"\nnpm pkg set scripts.start="node dist/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
          {
            label: "tsconfig.json",
            language: "json",
            code: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "rootDir": "src",\n    "outDir": "dist",\n    "strict": true,\n    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Step 2 Install runtime and TypeScript tooling",
        description:
          "Install the same NAVAI runtime packages plus the minimum TypeScript toolchain for local execution and build output.",
        bullets: [
          "`tsx` lets you validate the integration without a manual compile step.",
          "You can keep the same folder structure from the Node.js route.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend\nnpm install -D typescript tsx @types/cors @types/express @types/node",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Step 3 Configure environment variables",
        description:
          "Create a `.env` file with the same minimum NAVAI values. The TypeScript route uses the same backend contract and the same functions folder.",
        bullets: [
          "`OPENAI_API_KEY` must stay server-side only.",
          "Leave `NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules` so the server can find your tools.",
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
        title: "Step 4 Create the typed backend function",
        description:
          "Add one typed tool first. This keeps the payload shape explicit and gives you the same quick verification as the JavaScript route.",
        bullets: [
          "NAVAI still exposes the tool as `get_company_summary`.",
          "You can keep returning plain JSON objects.",
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
        title: "Step 5 Create `server.ts` with NAVAI",
        description:
          "Mount the health route and register NAVAI in the same Express app. The TypeScript version keeps the exact same HTTP endpoints as the Node.js route.",
        bullets: [
          "Your frontend should not notice any contract difference.",
          "For production, build once and run `node dist/server.js`.",
        ],
        codeBlocks: [
          {
            label: "src/server.ts",
            language: "typescript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Step 6 Run and verify the API",
        description:
          "Start the server with `tsx` and validate the health route, realtime secret, tool discovery, and one tool execution in that order.",
        bullets: [
          "For local testing, `npm run dev` is enough.",
          "Before deployment, use `npm run build` and then `npm run start`.",
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
          "Once the typed backend is alive, the client integration stays exactly the same because the NAVAI HTTP contract did not change.",
        bullets: [
          "Point the client to your TypeScript backend base URL.",
          "Keep `/navai/realtime/client-secret`, `/navai/functions`, and `/navai/functions/execute` reachable to the app.",
          "If your frontend runs on another origin, add it to `CORS_ORIGIN` before testing the voice session.",
        ],
      },
    ],
  },
  fr: {
    value: "typescript",
    label: "TypeScript",
    title: "Express + TypeScript",
    description:
      "Même chemin rapide, mais avec des fichiers typés, `tsx` pour le développement local et une sortie de build pour le déploiement.",
    bullets: [
      "Recommandé si votre équipe maintient déjà le backend en TypeScript.",
      "Le contrat NAVAI reste identique, seule la base du projet change.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Étape 1 Créer le projet TypeScript",
        description:
          "Créez le projet, préparez `src` et ajoutez un `tsconfig.json` minimal pour exécuter localement avec `tsx` puis déployer depuis `dist`.",
        bullets: [
          "Utilisez Node.js 20 ou plus récent.",
          "Cette route garde une mise en place locale rapide tout en laissant une build de production prête.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="tsx watch src/server.ts"\nnpm pkg set scripts.build="tsc -p tsconfig.json"\nnpm pkg set scripts.start="node dist/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
          {
            label: "tsconfig.json",
            language: "json",
            code: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "rootDir": "src",\n    "outDir": "dist",\n    "strict": true,\n    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Étape 2 Installer le runtime et l'outillage TypeScript",
        description:
          "Installez les mêmes paquets runtime NAVAI ainsi que l'outillage TypeScript minimal pour l'exécution locale et la sortie de build.",
        bullets: [
          "`tsx` vous permet de valider l'intégration sans compilation manuelle.",
          "Vous pouvez conserver la même structure de dossiers que la route Node.js.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend\nnpm install -D typescript tsx @types/cors @types/express @types/node",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Étape 3 Configurer les variables d'environnement",
        description:
          "Créez un fichier `.env` avec les mêmes valeurs minimales NAVAI. La route TypeScript utilise le même contrat backend et le même dossier de fonctions.",
        bullets: [
          "`OPENAI_API_KEY` doit rester côté serveur uniquement.",
          "Laissez `NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules` pour que le serveur trouve vos outils.",
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
        title: "Étape 4 Créer la fonction backend typée",
        description:
          "Ajoutez d'abord un outil typé. Cela garde la forme du payload explicite et vous donne la même validation rapide que la route JavaScript.",
        bullets: [
          "NAVAI expose toujours la fonction comme `get_company_summary`.",
          "Vous pouvez continuer à retourner des objets JSON simples.",
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
        title: "Étape 5 Créer `server.ts` avec NAVAI",
        description:
          "Montez la route de santé et enregistrez NAVAI dans la même app Express. La version TypeScript garde exactement les mêmes endpoints HTTP que la route Node.js.",
        bullets: [
          "Votre frontend ne devrait remarquer aucune différence de contrat.",
          "Pour la production, faites une build puis exécutez `node dist/server.js`.",
        ],
        codeBlocks: [
          {
            label: "src/server.ts",
            language: "typescript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Étape 6 Démarrer et vérifier l'API",
        description:
          "Démarrez le serveur avec `tsx` puis vérifiez la route de santé, le secret Realtime, la découverte des outils et l'exécution d'un outil dans cet ordre.",
        bullets: [
          "Pour les tests locaux, `npm run dev` suffit.",
          "Avant le déploiement, utilisez `npm run build` puis `npm run start`.",
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
          "Une fois le backend typé actif, l'intégration côté client reste exactement la même car le contrat HTTP NAVAI ne change pas.",
        bullets: [
          "Pointez le client vers l'URL de base de votre backend TypeScript.",
          "Gardez `/navai/realtime/client-secret`, `/navai/functions` et `/navai/functions/execute` accessibles à l'application.",
          "Si votre frontend s'exécute sur une autre origine, ajoutez-la à `CORS_ORIGIN` avant de tester la session vocale.",
        ],
      },
    ],
  },
  es: {
    value: "typescript",
    label: "TypeScript",
    title: "Express + TypeScript",
    description:
      "La misma ruta rápida, pero con archivos tipados, `tsx` para desarrollo local y salida compilada para despliegue.",
    bullets: [
      "Es la opción recomendada si su equipo ya mantiene backend tipado.",
      "El contrato NAVAI no cambia; solo cambia la base del proyecto.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Paso 1 Crear el proyecto TypeScript",
        description:
          "Cree el proyecto, prepare `src` y agregue un `tsconfig.json` mínimo para correr local con `tsx` y desplegar después desde `dist`.",
        bullets: [
          "Use Node.js 20 o superior.",
          "Esta ruta mantiene el setup local rapido y a la vez deja lista una salida de produccion.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="tsx watch src/server.ts"\nnpm pkg set scripts.build="tsc -p tsconfig.json"\nnpm pkg set scripts.start="node dist/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
          {
            label: "tsconfig.json",
            language: "json",
            code: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "rootDir": "src",\n    "outDir": "dist",\n    "strict": true,\n    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Paso 2 Instalar runtime y toolchain TypeScript",
        description:
          "Instale los mismos paquetes runtime de NAVAI junto al toolchain mínimo de TypeScript para correr local y generar build.",
        bullets: [
          "`tsx` le permite validar la integración sin compilar manualmente cada cambio.",
          "Puede mantener exactamente la misma estructura de carpetas de la ruta Node.js.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend\nnpm install -D typescript tsx @types/cors @types/express @types/node",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Paso 3 Configurar variables",
        description:
          "Cree el archivo `.env` con los mismos valores mínimos de NAVAI. La ruta TypeScript usa el mismo contrato backend y la misma carpeta de funciones.",
        bullets: [
          "`OPENAI_API_KEY` debe vivir solo en backend.",
          "Mantenga `NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules` para que el servidor encuentre sus tools.",
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
        title: "Paso 4 Crear la función backend tipada",
        description:
          "Agregue primero un tool tipado. Así mantiene explícita la forma del payload y valida la misma integración rápida que en JavaScript.",
        bullets: [
          "NAVAI seguirá exponiendo la función como `get_company_summary`.",
          "Puede seguir devolviendo objetos JSON planos.",
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
        title: "Paso 5 Crear `server.ts` con NAVAI",
        description:
          "Monte la ruta de salud y registre NAVAI en la misma app Express. La versión TypeScript mantiene exactamente los mismos endpoints HTTP de la ruta Node.js.",
        bullets: [
          "Su frontend no deberia notar diferencia en el contrato.",
          "Para produccion, haga build una vez y corra `node dist/server.js`.",
        ],
        codeBlocks: [
          {
            label: "src/server.ts",
            language: "typescript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "Eres una asistente util para navegacion por interfaces y ejecucion de funciones.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Spanish",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API lista en http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Paso 6 Levantar y validar la API",
        description:
          "Inicie el servidor con `tsx` y valide la ruta de salud, el realtime secret, el descubrimiento de tools y la ejecución de una función en ese orden.",
        bullets: [
          "Para pruebas locales, `npm run dev` es suficiente.",
          "Antes de desplegar, use `npm run build` y luego `npm run start`.",
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
          "Cuando el backend tipado ya está vivo, la integración cliente sigue exactamente igual porque el contrato HTTP de NAVAI no cambia.",
        bullets: [
          "Apunte el cliente a la URL base de su backend TypeScript.",
          "Mantenga disponibles `/navai/realtime/client-secret`, `/navai/functions` y `/navai/functions/execute` para la app.",
          "Si el frontend corre en otro origen, agréguelo a `CORS_ORIGIN` antes de probar la sesión de voz.",
        ],
      },
    ],
  },
  pt: {
    value: "typescript",
    label: "TypeScript",
    title: "Express + TypeScript",
    description:
      "A mesma rota rápida, mas com arquivos tipados, `tsx` para desenvolvimento local e saída de build para implantação.",
    bullets: [
      "Recomendado se sua equipe já mantém o backend tipado.",
      "O contrato NAVAI continua o mesmo; muda apenas a base do projeto.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Etapa 1 Criar o projeto TypeScript",
        description:
          "Crie o projeto, prepare `src` e adicione um `tsconfig.json` mínimo para rodar localmente com `tsx` e implantar depois a partir de `dist`.",
        bullets: [
          "Use Node.js 20 ou mais recente.",
          "Esse caminho mantém o setup local rápido e ao mesmo tempo deixa uma build de produção pronta.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="tsx watch src/server.ts"\nnpm pkg set scripts.build="tsc -p tsconfig.json"\nnpm pkg set scripts.start="node dist/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
          {
            label: "tsconfig.json",
            language: "json",
            code: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "rootDir": "src",\n    "outDir": "dist",\n    "strict": true,\n    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Etapa 2 Instalar runtime e toolchain TypeScript",
        description:
          "Instale os mesmos pacotes runtime do NAVAI junto com o toolchain mínimo de TypeScript para execução local e saída de build.",
        bullets: [
          "`tsx` permite validar a integração sem compilação manual.",
          "Você pode manter a mesma estrutura de pastas da rota Node.js.",
        ],
        codeBlocks: [
          {
            label: "Terminal",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend\nnpm install -D typescript tsx @types/cors @types/express @types/node",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Etapa 3 Configurar variáveis de ambiente",
        description:
          "Crie um arquivo `.env` com os mesmos valores mínimos do NAVAI. A rota TypeScript usa o mesmo contrato backend e a mesma pasta de funções.",
        bullets: [
          "`OPENAI_API_KEY` deve permanecer apenas no servidor.",
          "Mantenha `NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules` para que o servidor encontre suas ferramentas.",
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
        title: "Etapa 4 Criar a função backend tipada",
        description:
          "Adicione primeiro uma ferramenta tipada. Isso mantém o formato do payload explícito e oferece a mesma validação rápida da rota JavaScript.",
        bullets: [
          "O NAVAI continua expondo a função como `get_company_summary`.",
          "Você pode continuar retornando objetos JSON simples.",
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
        title: "Etapa 5 Criar `server.ts` com NAVAI",
        description:
          "Monte a rota de saúde e registre o NAVAI na mesma app Express. A versão TypeScript mantém exatamente os mesmos endpoints HTTP da rota Node.js.",
        bullets: [
          "Seu frontend não deve notar nenhuma diferença de contrato.",
          "Para produção, faça o build uma vez e execute `node dist/server.js`.",
        ],
        codeBlocks: [
          {
            label: "src/server.ts",
            language: "typescript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Etapa 6 Iniciar e validar a API",
        description:
          "Inicie o servidor com `tsx` e valide a rota de saúde, o segredo Realtime, a descoberta de ferramentas e a execução de uma ferramenta nessa ordem.",
        bullets: [
          "Para testes locais, `npm run dev` é suficiente.",
          "Antes de implantar, use `npm run build` e depois `npm run start`.",
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
          "Quando o backend tipado estiver ativo, a integração do cliente continuará igual porque o contrato HTTP do NAVAI não muda.",
        bullets: [
          "Aponte o cliente para a URL base do seu backend TypeScript.",
          "Mantenha `/navai/realtime/client-secret`, `/navai/functions` e `/navai/functions/execute` acessíveis para a aplicação.",
          "Se o frontend roda em outra origem, adicione-a em `CORS_ORIGIN` antes de testar a sessão de voz.",
        ],
      },
    ],
  },
  zh: {
    value: "typescript",
    label: "TypeScript",
    title: "Express + TypeScript",
    description:
      "同样是快速路线，但使用类型化文件、`tsx` 本地开发，以及用于部署的构建输出。",
    bullets: [
      "如果您的团队已经使用类型化后端代码，建议选择此路线。",
      "NAVAI 契约保持不变，变化的只是项目基础。",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "步骤 1 创建 TypeScript 项目",
        description:
          "创建项目，准备 `src`，并添加一个最小化的 `tsconfig.json`，以便本地使用 `tsx` 运行，后续从 `dist` 部署。",
        bullets: [
          "使用 Node.js 20 或更高版本。",
          "这条路线既能保持本地启动快速，也能保留生产构建输出。",
        ],
        codeBlocks: [
          {
            label: "终端",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="tsx watch src/server.ts"\nnpm pkg set scripts.build="tsc -p tsconfig.json"\nnpm pkg set scripts.start="node dist/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
          {
            label: "tsconfig.json",
            language: "json",
            code: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "rootDir": "src",\n    "outDir": "dist",\n    "strict": true,\n    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "步骤 2 安装运行时和 TypeScript 工具链",
        description:
          "安装相同的 NAVAI 运行时包，以及本地运行和构建输出所需的最小 TypeScript 工具链。",
        bullets: [
          "`tsx` 可以让您在不手动编译的情况下验证集成。",
          "您可以保留与 Node.js 路线相同的目录结构。",
        ],
        codeBlocks: [
          {
            label: "终端",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend\nnpm install -D typescript tsx @types/cors @types/express @types/node",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "步骤 3 配置环境变量",
        description:
          "创建一个 `.env` 文件，填入相同的 NAVAI 最小配置。TypeScript 路线使用相同的后端契约和函数目录。",
        bullets: [
          "`OPENAI_API_KEY` 必须只保留在服务端。",
          "保持 `NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules`，这样服务器才能找到您的工具。",
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
        title: "步骤 4 创建类型化后端函数",
        description:
          "先添加一个类型化工具。这样可以明确 payload 结构，并获得与 JavaScript 路线相同的快速验证流程。",
        bullets: [
          "NAVAI 仍然会把该函数暴露为 `get_company_summary`。",
          "您仍然可以返回普通 JSON 对象。",
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
        title: "步骤 5 使用 NAVAI 创建 `server.ts`",
        description:
          "挂载健康检查路由，并在同一个 Express 应用中注册 NAVAI。TypeScript 版本保持与 Node.js 路线完全相同的 HTTP 端点。",
        bullets: [
          "您的前端不会感知到契约差异。",
          "生产环境中先构建，再运行 `node dist/server.js`。",
        ],
        codeBlocks: [
          {
            label: "src/server.ts",
            language: "typescript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "步骤 6 启动并验证 API",
        description:
          "用 `tsx` 启动服务器，并按顺序验证健康检查、Realtime 密钥、工具发现以及一次工具执行。",
        bullets: [
          "本地测试时，`npm run dev` 就足够。",
          "部署前请先执行 `npm run build`，然后执行 `npm run start`。",
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
          "当类型化后端已经可用时，客户端集成方式保持完全一致，因为 NAVAI 的 HTTP 契约没有变化。",
        bullets: [
          "将客户端指向您的 TypeScript 后端基础 URL。",
          "确保应用可以访问 `/navai/realtime/client-secret`、`/navai/functions` 和 `/navai/functions/execute`。",
          "如果前端运行在其他来源，请在测试语音会话前把该来源加入 `CORS_ORIGIN`。",
        ],
      },
    ],
  },
  ja: {
    value: "typescript",
    label: "TypeScript",
    title: "Express + TypeScript",
    description:
      "同じく高速なルートですが、型付きファイル、ローカル開発用の `tsx`、デプロイ用のビルド出力を使います。",
    bullets: [
      "チームがすでに型付きバックエンドコードを使っているならおすすめです。",
      "変わるのはプロジェクト構成だけで、NAVAI 契約自体は同じです。",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "ステップ 1 TypeScript プロジェクトを作成する",
        description:
          "プロジェクトを作成し、`src` を準備して、ローカルでは `tsx`、後のデプロイでは `dist` を使える最小構成の `tsconfig.json` を追加します。",
        bullets: [
          "Node.js 20 以上を使用してください。",
          "このルートはローカルセットアップを高速に保ちつつ、本番ビルドも用意できます。",
        ],
        codeBlocks: [
          {
            label: "ターミナル",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="tsx watch src/server.ts"\nnpm pkg set scripts.build="tsc -p tsconfig.json"\nnpm pkg set scripts.start="node dist/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
          {
            label: "tsconfig.json",
            language: "json",
            code: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "rootDir": "src",\n    "outDir": "dist",\n    "strict": true,\n    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "ステップ 2 ランタイムと TypeScript ツールをインストールする",
        description:
          "同じ NAVAI ランタイムパッケージに加えて、ローカル実行とビルド出力に必要な最小の TypeScript ツールチェーンをインストールします。",
        bullets: [
          "`tsx` を使えば、手動でコンパイルせずに統合を確認できます。",
          "Node.js ルートと同じフォルダ構成を維持できます。",
        ],
        codeBlocks: [
          {
            label: "ターミナル",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend\nnpm install -D typescript tsx @types/cors @types/express @types/node",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "ステップ 3 環境変数を設定する",
        description:
          "同じ最小構成の NAVAI 値を持つ `.env` ファイルを作成します。TypeScript ルートでも同じバックエンド契約と同じ関数フォルダを使います。",
        bullets: [
          "`OPENAI_API_KEY` はサーバー側だけに置いてください。",
          "サーバーがツールを見つけられるように `NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules` を維持してください。",
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
        title: "ステップ 4 型付きバックエンド関数を作成する",
        description:
          "まず型付きツールを 1 つ追加します。これにより payload の形が明確になり、JavaScript ルートと同じ素早い検証ができます。",
        bullets: [
          "NAVAI はこの関数も `get_company_summary` として公開します。",
          "プレーンな JSON オブジェクトを返し続けることができます。",
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
        title: "ステップ 5 NAVAI 付きの `server.ts` を作成する",
        description:
          "ヘルスルートを用意し、同じ Express アプリに NAVAI を登録します。TypeScript 版でも Node.js ルートとまったく同じ HTTP エンドポイントを維持します。",
        bullets: [
          "フロントエンド側から契約の違いは見えないはずです。",
          "本番では一度ビルドしてから `node dist/server.js` を実行してください。",
        ],
        codeBlocks: [
          {
            label: "src/server.ts",
            language: "typescript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "ステップ 6 API を起動して検証する",
        description:
          "`tsx` でサーバーを起動し、ヘルスルート、Realtime シークレット、ツール一覧、ツール実行をこの順序で確認します。",
        bullets: [
          "ローカル検証なら `npm run dev` で十分です。",
          "デプロイ前に `npm run build` を実行し、その後 `npm run start` を使ってください。",
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
          "型付きバックエンドが動き始めた後も、NAVAI の HTTP 契約は変わらないため、クライアント統合はまったく同じです。",
        bullets: [
          "クライアントを TypeScript バックエンドのベース URL に向けてください。",
          "アプリから `/navai/realtime/client-secret`、`/navai/functions`、`/navai/functions/execute` に到達できるようにしてください。",
          "フロントエンドが別オリジンで動く場合は、音声セッションをテストする前にそのオリジンを `CORS_ORIGIN` に追加してください。",
        ],
      },
    ],
  },
  ru: {
    value: "typescript",
    label: "TypeScript",
    title: "Express + TypeScript",
    description:
      "Та же быстрая схема, но с типизированными файлами, `tsx` для локальной разработки и результатом сборки для деплоя.",
    bullets: [
      "Рекомендуется, если ваша команда уже использует типизированный backend-код.",
      "Контракт NAVAI не меняется, меняется только основа проекта.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "Шаг 1 Создать проект TypeScript",
        description:
          "Создайте проект, подготовьте `src` и добавьте минимальный `tsconfig.json`, чтобы запускать локально через `tsx`, а потом деплоить из `dist`.",
        bullets: [
          "Используйте Node.js 20 или новее.",
          "Этот путь сохраняет быстрый локальный старт и при этом оставляет готовую production-сборку.",
        ],
        codeBlocks: [
          {
            label: "Терминал",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="tsx watch src/server.ts"\nnpm pkg set scripts.build="tsc -p tsconfig.json"\nnpm pkg set scripts.start="node dist/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
          {
            label: "tsconfig.json",
            language: "json",
            code: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "rootDir": "src",\n    "outDir": "dist",\n    "strict": true,\n    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "Шаг 2 Установить runtime и инструменты TypeScript",
        description:
          "Установите те же NAVAI runtime-пакеты и минимальную TypeScript toolchain для локального запуска и build-вывода.",
        bullets: [
          "`tsx` позволяет проверить интеграцию без ручной компиляции.",
          "Можно сохранить ту же структуру папок, что и в маршруте Node.js.",
        ],
        codeBlocks: [
          {
            label: "Терминал",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend\nnpm install -D typescript tsx @types/cors @types/express @types/node",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "Шаг 3 Настроить переменные окружения",
        description:
          "Создайте файл `.env` с теми же минимальными значениями NAVAI. Маршрут TypeScript использует тот же backend-контракт и ту же папку функций.",
        bullets: [
          "`OPENAI_API_KEY` должен оставаться только на сервере.",
          "Оставьте `NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules`, чтобы сервер нашел ваши инструменты.",
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
        title: "Шаг 4 Создать типизированную backend-функцию",
        description:
          "Сначала добавьте типизированный инструмент. Это делает структуру payload явной и дает такую же быструю проверку, как и в JavaScript-маршруте.",
        bullets: [
          "NAVAI все так же публикует функцию как `get_company_summary`.",
          "Вы по-прежнему можете возвращать обычные JSON-объекты.",
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
        title: "Шаг 5 Создать `server.ts` с NAVAI",
        description:
          "Подключите health-маршрут и зарегистрируйте NAVAI в том же Express-приложении. Версия TypeScript сохраняет те же HTTP-эндпоинты, что и маршрут Node.js.",
        bullets: [
          "Frontend не должен заметить разницы в контракте.",
          "Для production сначала соберите проект, затем запустите `node dist/server.js`.",
        ],
        codeBlocks: [
          {
            label: "src/server.ts",
            language: "typescript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "You are a helpful assistant for UI navigation and function execution.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "English",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API ready at http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "Шаг 6 Запустить и проверить API",
        description:
          "Запустите сервер через `tsx` и последовательно проверьте маршрут здоровья, Realtime secret, список инструментов и выполнение одного инструмента.",
        bullets: [
          "Для локальной проверки достаточно `npm run dev`.",
          "Перед деплоем выполните `npm run build`, затем `npm run start`.",
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
          "Когда типизированный backend уже работает, интеграция клиента остается той же, потому что HTTP-контракт NAVAI не меняется.",
        bullets: [
          "Направьте клиент на базовый URL вашего TypeScript backend.",
          "Сделайте `/navai/realtime/client-secret`, `/navai/functions` и `/navai/functions/execute` доступными для приложения.",
          "Если frontend работает на другом origin, добавьте его в `CORS_ORIGIN` перед проверкой голосовой сессии.",
        ],
      },
    ],
  },
  ko: {
    value: "typescript",
    label: "TypeScript",
    title: "Express + TypeScript",
    description:
      "같은 빠른 경로이지만 타입이 있는 파일, 로컬 개발용 `tsx`, 배포용 빌드 출력을 사용합니다.",
    bullets: [
      "팀이 이미 타입 기반 백엔드 코드를 유지하고 있다면 권장되는 선택입니다.",
      "NAVAI 계약은 그대로이고 프로젝트 설정만 바뀝니다.",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "단계 1 TypeScript 프로젝트 만들기",
        description:
          "프로젝트를 만들고 `src` 를 준비한 뒤, 나중에 `tsx` 로 로컬 실행하고 `dist` 에서 배포할 수 있도록 최소한의 `tsconfig.json` 을 추가하세요.",
        bullets: [
          "Node.js 20 이상을 사용하세요.",
          "이 경로는 로컬 설정을 빠르게 유지하면서도 프로덕션 빌드를 제공합니다.",
        ],
        codeBlocks: [
          {
            label: "터미널",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="tsx watch src/server.ts"\nnpm pkg set scripts.build="tsc -p tsconfig.json"\nnpm pkg set scripts.start="node dist/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
          {
            label: "tsconfig.json",
            language: "json",
            code: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "rootDir": "src",\n    "outDir": "dist",\n    "strict": true,\n    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "단계 2 런타임과 TypeScript 도구 설치",
        description:
          "같은 NAVAI 런타임 패키지와 로컬 실행 및 빌드 출력에 필요한 최소 TypeScript 도구 체인을 설치하세요.",
        bullets: [
          "`tsx` 는 수동 컴파일 단계 없이 통합을 검증할 수 있게 해줍니다.",
          "Node.js 경로와 같은 폴더 구조를 그대로 유지할 수 있습니다.",
        ],
        codeBlocks: [
          {
            label: "터미널",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend\nnpm install -D typescript tsx @types/cors @types/express @types/node",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "단계 3 환경 변수 설정",
        description:
          "같은 최소 NAVAI 값으로 `.env` 파일을 만드세요. TypeScript 경로도 같은 백엔드 계약과 같은 함수 폴더를 사용합니다.",
        bullets: [
          "`OPENAI_API_KEY` 는 서버 측에만 있어야 합니다.",
          "서버가 도구를 찾을 수 있도록 `NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules` 를 그대로 두세요.",
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
        title: "단계 4 타입이 지정된 백엔드 함수 만들기",
        description:
          "먼저 타입이 지정된 도구 하나를 추가하세요. 이렇게 하면 payload 형태가 명확해지고 JavaScript 경로와 같은 빠른 검증이 가능합니다.",
        bullets: [
          "NAVAI는 이 도구를 계속 `get_company_summary` 로 노출합니다.",
          "일반 JSON 객체를 그대로 반환할 수 있습니다.",
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
        title: "단계 5 NAVAI와 함께 `server.ts` 만들기",
        description:
          "health 경로를 만들고 같은 Express 앱에 NAVAI를 등록하세요. TypeScript 버전은 Node.js 경로와 동일한 HTTP 엔드포인트를 유지합니다.",
        bullets: [
          "프런트엔드는 계약 차이를 느끼지 않아야 합니다.",
          "프로덕션에서는 한 번 빌드한 뒤 `node dist/server.js` 를 실행하세요.",
        ],
        codeBlocks: [
          {
            label: "src/server.ts",
            language: "typescript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "당신은 UI 탐색과 함수 실행을 돕는 유용한 도우미입니다.",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Korean",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API 준비 완료: http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "단계 6 API 실행 및 검증",
        description:
          "`tsx` 로 서버를 시작하고 health 경로, realtime secret, 도구 발견, 도구 실행 하나를 이 순서로 검증하세요.",
        bullets: [
          "로컬 테스트에는 `npm run dev` 면 충분합니다.",
          "배포 전에 `npm run build` 를 실행한 다음 `npm run start` 를 사용하세요.",
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
          "타입이 지정된 백엔드가 실행되면 NAVAI HTTP 계약이 바뀌지 않았기 때문에 클라이언트 통합은 완전히 동일하게 유지됩니다.",
        bullets: [
          "클라이언트를 TypeScript 백엔드 기본 URL로 지정하세요.",
          "앱이 `/navai/realtime/client-secret`, `/navai/functions`, `/navai/functions/execute` 에 접근할 수 있어야 합니다.",
          "프런트엔드가 다른 origin에서 실행된다면 음성 세션을 테스트하기 전에 그 origin을 `CORS_ORIGIN` 에 추가하세요.",
        ],
      },
    ],
  },
  hi: {
    value: "typescript",
    label: "TypeScript",
    title: "Express + TypeScript",
    description:
      "वही तेज़ रास्ता, लेकिन typed files, local dev के लिए `tsx`, और deployment के लिए build output के साथ।",
    bullets: [
      "अगर आपकी team पहले से typed backend code maintain करती है तो यह अनुशंसित विकल्प है।",
      "NAVAI contract वही रहता है, सिर्फ project setup बदलता है।",
    ],
    sections: [
      {
        id: "paso-1-crear-proyecto",
        title: "चरण 1 TypeScript प्रोजेक्ट बनाएं",
        description:
          "प्रोजेक्ट बनाएं, `src` तैयार करें, और एक न्यूनतम `tsconfig.json` जोड़ें ताकि आप `tsx` के साथ local चला सकें और बाद में `dist` से deploy कर सकें।",
        bullets: [
          "Node.js 20 या नया संस्करण उपयोग करें।",
          "यह रास्ता local setup को तेज़ रखता है और production build भी देता है।",
        ],
        codeBlocks: [
          {
            label: "टर्मिनल",
            language: "bash",
            code: 'mkdir navai-api-demo\ncd navai-api-demo\nnpm init -y\nnpm pkg set type=module\nnpm pkg set scripts.dev="tsx watch src/server.ts"\nnpm pkg set scripts.build="tsc -p tsconfig.json"\nnpm pkg set scripts.start="node dist/server.js"\nmkdir src\nmkdir src/ai\nmkdir src/ai/functions-modules',
          },
          {
            label: "tsconfig.json",
            language: "json",
            code: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "rootDir": "src",\n    "outDir": "dist",\n    "strict": true,\n    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}',
          },
        ],
      },
      {
        id: "paso-2-instalar-dependencias",
        title: "चरण 2 runtime और TypeScript tooling इंस्टॉल करें",
        description:
          "वही NAVAI runtime packages और local execution तथा build output के लिए न्यूनतम TypeScript toolchain इंस्टॉल करें।",
        bullets: [
          "`tsx` आपको manual compile step के बिना integration validate करने देता है।",
          "आप Node.js route वाली वही folder structure रख सकते हैं।",
        ],
        codeBlocks: [
          {
            label: "टर्मिनल",
            language: "bash",
            code: "npm install express cors dotenv @navai/voice-backend\nnpm install -D typescript tsx @types/cors @types/express @types/node",
          },
        ],
      },
      {
        id: "paso-3-configurar-variables",
        title: "चरण 3 एन्वायरनमेंट वेरिएबल सेट करें",
        description:
          "उसी न्यूनतम NAVAI values के साथ एक `.env` फ़ाइल बनाएं। TypeScript route वही backend contract और वही functions folder इस्तेमाल करता है।",
        bullets: [
          "`OPENAI_API_KEY` केवल server-side ही रहना चाहिए।",
          "`NAVAI_FUNCTIONS_FOLDERS=src/ai/functions-modules` वैसे ही रहने दें ताकि server आपके tools ढूंढ सके।",
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
        title: "चरण 4 typed backend function बनाएं",
        description:
          "पहले एक typed tool जोड़ें। इससे payload shape स्पष्ट रहती है और JavaScript route जैसी तेज़ verification मिलती है।",
        bullets: [
          "NAVAI tool को फिर भी `get_company_summary` के रूप में expose करता है।",
          "आप साधारण JSON objects लौटाते रह सकते हैं।",
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
        title: "चरण 5 NAVAI के साथ `server.ts` बनाएं",
        description:
          "Health route माउंट करें और उसी Express app में NAVAI register करें। TypeScript version, Node.js route वाले बिल्कुल वही HTTP endpoints बनाए रखता है।",
        bullets: [
          "आपके frontend को contract में कोई अंतर महसूस नहीं होना चाहिए।",
          "Production के लिए एक बार build करें और `node dist/server.js` चलाएँ।",
        ],
        codeBlocks: [
          {
            label: "src/server.ts",
            language: "typescript",
            code: 'import cors from "cors";\nimport dotenv from "dotenv";\nimport express from "express";\nimport { registerNavaiExpressRoutes } from "@navai/voice-backend";\n\ndotenv.config();\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:4321")\n  .split(",")\n  .map((value) => value.trim())\n  .filter(Boolean);\n\napp.use(express.json());\napp.use(\n  cors({\n    origin: allowedOrigins,\n    credentials: true,\n  })\n);\n\napp.get("/health", (_req, res) => {\n  res.json({\n    ok: true,\n    service: "navai-api-demo",\n    endpoints: [\n      "/navai/realtime/client-secret",\n      "/navai/functions",\n      "/navai/functions/execute",\n    ],\n  });\n});\n\nregisterNavaiExpressRoutes(app, {\n  backendOptions: {\n    openaiApiKey: process.env.OPENAI_API_KEY,\n    defaultModel: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",\n    defaultVoice: process.env.OPENAI_REALTIME_VOICE || "marin",\n    defaultInstructions:\n      process.env.OPENAI_REALTIME_INSTRUCTIONS ||\n      "आप UI नेविगेशन और फ़ंक्शन execution में मदद करने वाले उपयोगी सहायक हैं।",\n    defaultLanguage: process.env.OPENAI_REALTIME_LANGUAGE || "Hindi",\n    clientSecretTtlSeconds: Number(process.env.OPENAI_REALTIME_CLIENT_SECRET_TTL || 600),\n    allowApiKeyFromRequest: process.env.NAVAI_ALLOW_FRONTEND_API_KEY === "true",\n  },\n  functionsFolders: process.env.NAVAI_FUNCTIONS_FOLDERS || "src/ai/functions-modules",\n});\n\napp.listen(port, () => {\n  console.log(`NAVAI API यहाँ तैयार है: http://localhost:${port}`);\n});',
          },
        ],
      },
      {
        id: "paso-6-probar-api",
        title: "चरण 6 API चलाएँ और जाँचें",
        description:
          "Server को `tsx` से चालू करें और इसी क्रम में health route, realtime secret, tool discovery और एक tool execution validate करें।",
        bullets: [
          "Local test के लिए `npm run dev` पर्याप्त है।",
          "Deployment से पहले `npm run build` और फिर `npm run start` चलाएँ।",
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
          "जब typed backend चालू हो जाए, तो client integration बिल्कुल वही रहती है क्योंकि NAVAI HTTP contract नहीं बदलता।",
        bullets: [
          "Client को अपने TypeScript backend के base URL पर point करें।",
          "सुनिश्चित करें कि `/navai/realtime/client-secret`, `/navai/functions`, और `/navai/functions/execute` app के लिए उपलब्ध रहें।",
          "अगर आपका frontend किसी दूसरे origin पर चलता है, तो voice session test करने से पहले उसे `CORS_ORIGIN` में जोड़ें।",
        ],
      },
    ],
  },
};

export function getApiTypescriptGuideTab(
  language: LanguageCode,
): InstallationGuideTab {
  return withApiNgrokMobileTesting(
    getLocalizedInstallationGuideTab(API_TYPESCRIPT_GUIDE_TABS, language),
    language,
  );
}
