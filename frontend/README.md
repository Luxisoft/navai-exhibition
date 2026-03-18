# Frontend NAVAI (Astro + React)

Este modulo contiene la aplicacion web (UI, paginas de docs, Request Implementation y Home con Orb/NAVAI voice).

## Requisitos

- Node.js 20+
- npm 10+

## Instalacion

Desde la raiz del repo:

```bash
npm install
```

Crear entorno de frontend:

```bash
# Linux/macOS
cp frontend/.env.example frontend/.env
```

```powershell
# Windows PowerShell
Copy-Item frontend/.env.example frontend/.env
```

## Variables de entorno (`frontend/.env`)

| Variable | Requerida | Default sugerido | Uso |
| --- | --- | --- | --- |
| `NAVAI_FUNCTIONS_FOLDERS` | Si | `src/ai` | Raiz de agentes NAVAI en frontend. |
| `NAVAI_AGENTS_FOLDERS` | Si | `main,evaluations,surveys,public-experience` | Agentes que se cargan desde el primer nivel de `src/ai/`. |
| `NAVAI_ROUTES_FILE` | Si | `src/ai/main/routes.ts` | Archivo de rutas navegables del agente principal. |
| `PUBLIC_NAVAI_API_URL` | No | `http://localhost:3000` | Base URL del backend API. Si queda vacio usa same-origin. |
| `PUBLIC_HOME_HYDRATION_MODE` | No | `idle` | Modo de hidratacion para Home (`idle` o `load`). |
| `PUBLIC_ORB_AUTOPLAY_DELAY_MS` | No | `9000` | Delay de auto-animacion del Orb (0-60000). |
| `PUBLIC_ORB_REVEAL_DELAY_MS` | No | `5200` | Delay para mostrar Orb en Home (0-60000). |
| `PUBLIC_VOICE_PANEL_REVEAL_DELAY_MS` | No | `6500` | Delay para mostrar panel/boton de voz (0-60000). |
| `PUBLIC_HCAPTCHA_SITE_KEY` | No | vacio | Site key publica para el formulario de contacto. |

## Comandos

Todos se ejecutan desde la raiz del repo.

```bash
# Genera frontend function loaders (se ejecuta automaticamente en predev/prebuild)
npm run generate:module-loaders

# Desarrollo frontend
npm run dev:frontend

# Build frontend (Astro static build)
npm run build:frontend
```

## Flujo NAVAI en frontend

- Agentes frontend: `src/ai/<agent>/...`
- Agente principal: `src/ai/main/agent.config.ts`
- Especialista evaluaciones: `src/ai/evaluations/agent.config.ts`
- Especialista encuestas: `src/ai/surveys/agent.config.ts`
- Rutas navegables: `src/ai/main/routes.ts`
- Catalogo de navegacion: `src/ai/main/navigation-catalog.json`
- Tools frontend: `src/ai/main/**`, `src/ai/evaluations/**`, `src/ai/surveys/**`
- Loader generado: `src/ai/frontend-function-loaders.ts` (auto-generado)

Solo el primer nivel debajo de `src/ai/` define el agente. Las subcarpetas internas son solo organizacion y no crean agentes nuevos.

Regla del proyecto: las funciones de navegacion/UI del sitio deben vivir en frontend, sin importar imports desde backend.

## Arquitectura multiagente

Estructura actual:

```text
src/ai/
  main/
    agent.config.ts
    routes.ts
    ...
  evaluations/
    agent.config.ts
    ...
  surveys/
    agent.config.ts
    ...
```

- `main`: navegacion, orquestacion y handoffs.
- `evaluations`: creacion, consulta, recomendacion y guardado de evaluaciones.
- `surveys`: creacion, consulta, recomendacion y guardado de encuestas.
- `public-experience`: experiencia publica para enlaces compartidos de encuestas y evaluaciones.

En web realtime NAVAI usa `handoffs` para delegar desde `main` hacia `evaluations` y `surveys`.

## Como agregar un nuevo agente

1. Crear carpeta de primer nivel en `src/ai/<nuevo-agente>/`.
2. Añadir `agent.config.ts`.
3. Colocar las funciones dentro de esa carpeta o subcarpetas internas.
4. Agregar el nombre del agente a `NAVAI_AGENTS_FOLDERS`.
5. Regenerar loaders con `npm run generate:module-loaders`.

## Como probar el flujo multiagente

```bash
npm run generate:module-loaders
npm run dev:frontend
npm run dev:backend
```

Luego abre la app y prueba:

- Solicitudes generales y navegacion: debe responder `main`.
- Solicitudes de evaluaciones: `main` debe delegar a `evaluations`.
- Solicitudes de encuestas: `main` debe delegar a `surveys`.

## Paginas principales

- `/` Home
- `/documentation/*`
- `/request-implementation`

## Notas

- Este frontend espera backend activo para:
  - `/api/backend-capabilities`
  - `/navai/realtime/client-secret`
  - `/navai/functions`
  - `/navai/functions/execute`
  - `/api/quote` (formulario contacto)
