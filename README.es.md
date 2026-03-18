<h1>NAVAI Exhibition (Astro + Node.js)</h1>

<p align="center">
  <img src="./frontend/public/navai_banner.webp" alt="NAVAI Exhibition banner" />
</p>

<p align="center">
  <a href="./README.es.md"><img alt="Spanish" src="https://img.shields.io/badge/Idioma-Spanish-0A66C2?style=for-the-badge"></a>
  <a href="./README.en.md"><img alt="English" src="https://img.shields.io/badge/Language-English-1D9A6C?style=for-the-badge"></a>
</p>

<p align="center">
  <img alt="Astro" src="https://img.shields.io/badge/Astro-5.x-ff5d01?style=for-the-badge&logo=astro">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Backend-3C873A?style=for-the-badge&logo=nodedotjs">
  <img alt="NAVAI" src="https://img.shields.io/badge/NAVAI-Agente%20de%20Voz-0A66C2?style=for-the-badge">
</p>

---

Este repositorio está separado en:

- `frontend/`: app Astro (UI y salida estática).
- `backend/`: API Node.js/Express y endpoints runtime.
- `frontend/src/`: lógica compartida de React/UI, contenido docs, i18n e integración NAVAI.
- `frontend/README.md`: setup frontend, variables de entorno y comandos.
- `backend/README.md`: setup backend, variables de entorno, endpoints y comandos.

## Estructura multiagente de NAVAI

El proyecto ahora usa esta estructura:

```text
frontend/src/ai/
  main/
  evaluations/
  surveys/
  public-experience/

backend/src/ai/
  main/
  evaluations/
  surveys/
```

Solo el primer nivel debajo de `src/ai/` define el agente. Las subcarpetas internas son opcionales y solo sirven para organizar.

- `main`: agente principal para navegación, orquestación y delegación.
- `evaluations`: especialista para evaluaciones.
- `surveys`: especialista para encuestas.
- `public-experience`: runtime público para enlaces compartidos de encuestas y evaluaciones.

En realtime web, el agente principal delega a los especialistas usando `handoffs`.

## Variables clave

- Frontend: `NAVAI_FUNCTIONS_FOLDERS=src/ai`
- Frontend: `NAVAI_AGENTS_FOLDERS=main,evaluations,surveys,public-experience`
- Frontend rutas: `NAVAI_ROUTES_FILE=src/ai/main/routes.ts`
- Backend: `NAVAI_FUNCTIONS_FOLDERS=backend/src/ai`
- Backend: `NAVAI_AGENTS_FOLDERS=main,evaluations,surveys`

## Cómo agregar un nuevo agente

1. Crear `src/ai/<agente>/`.
2. Añadir `agent.config.ts`.
3. Colocar las funciones dentro de esa carpeta.
4. Agregar el nombre a `NAVAI_AGENTS_FOLDERS`.
5. Regenerar loaders y validar el runtime.

## Cómo probar el flujo multiagente

```bash
npm run generate:module-loaders
npm run dev:frontend
npm run dev:backend
npm run check:backend-functions
```

Luego verificar:

- Solicitudes generales quedan en `main`.
- Solicitudes de evaluaciones se delegan a `evaluations`.
- Solicitudes de encuestas se delegan a `surveys`.

## Inicio rápido

1. Instalar dependencias

```bash
npm install
```

2. Configurar entorno

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

3. Desarrollo

```bash
npm run dev:frontend
npm run dev:backend
```

4. Build y arranque en producción

```bash
npm run build
npm run start
```

## Scripts

- `npm run dev:frontend`: servidor de desarrollo Astro (`frontend/`).
- `npm run dev:backend`: servidor de desarrollo Express API.
- `npm run build`: build frontend Astro + typecheck build backend.
- `npm run start`: inicia backend (modo API).
- `npm run generate:module-loaders`: genera/actualiza loaders de funciones NAVAI del frontend.
- `npm run check:backend-functions`: valida y lista funciones NAVAI detectadas en backend.

## Comandos NAVAI (funciones frontend/backend)

Todos se ejecutan desde la raíz del repo.

```bash
# Frontend: generar loaders de funciones locales NAVAI
npm run generate:module-loaders

# Backend: revisar funciones detectadas y warnings
npm run check:backend-functions

# Backend API: listar funciones expuestas para NAVAI
curl http://localhost:3000/navai/functions

# Backend API: ejecutar una funcion NAVAI
curl -X POST http://localhost:3000/navai/functions/execute \
  -H "Content-Type: application/json" \
  -d "{\"function_name\":\"health_check\",\"payload\":{}}"
```


