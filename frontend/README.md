# Frontend NAVAI (Astro + React)

Este modulo contiene la aplicacion web (UI, paginas de docs, WordPress, Request Implementation y Home con Orb/NAVAI voice).

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
| `NAVAI_FUNCTIONS_FOLDERS` | Si | `src/ai/functions-modules` | Carpetas de tools locales frontend para generar loaders. |
| `NAVAI_ROUTES_FILE` | Si | `src/ai/routes.ts` | Archivo de rutas navegables por NAVAI. |
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

- Rutas navegables: `src/ai/routes.ts`
- Catalogo de navegacion: `src/ai/navigation-catalog.json`
- Tools frontend: `src/ai/functions-modules/**`
- Loader generado: `src/ai/frontend-function-loaders.ts` (auto-generado)

Regla del proyecto: las funciones de navegacion/UI del sitio deben vivir en frontend, sin importar imports desde backend.

## Paginas principales

- `/` Home
- `/documentation/*`
- `/request-implementation`
- `/wordpress`

## Notas

- Este frontend espera backend activo para:
  - `/api/backend-capabilities`
  - `/navai/realtime/client-secret`
  - `/navai/functions`
  - `/navai/functions/execute`
  - `/api/quote` (formulario contacto)
