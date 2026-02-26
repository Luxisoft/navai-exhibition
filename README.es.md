<h1>NAVAI Exhibition (Next.js)</h1>

<p align="center">
  <img src="./public/navai_banner.webp" alt="NAVAI Exhibition banner" />
</p>

<p align="center">
  <a href="./README.es.md"><img alt="Spanish" src="https://img.shields.io/badge/Idioma-Spanish-0A66C2?style=for-the-badge"></a>
  <a href="./README.en.md"><img alt="English" src="https://img.shields.io/badge/Language-English-1D9A6C?style=for-the-badge"></a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16.1.6-000000?style=for-the-badge&logo=nextdotjs">
  <img alt="NAVAI" src="https://img.shields.io/badge/NAVAI-Agente%20de%20Voz-0A66C2?style=for-the-badge">
  <img alt="OpenAI Realtime" src="https://img.shields.io/badge/OpenAI-Realtime-1D9A6C?style=for-the-badge">
</p>

---

Aplicacion Next.js usada como sitio de exhibicion de NAVAI con:

- Pantallas de producto/landing
- Paginas de documentacion
- Pagina de solicitud de implementacion
- Integracion del agente de voz NAVAI (frontend + backend)
- Herramientas de IA con conocimiento del proyecto (rutas, vistas, submenus, proposito de pagina y scroll)

## Que incluye este repositorio

- Sitio `App Router` (`src/app`) con:
- `/` pagina principal
- `/documentation` indice de documentacion
- `/documentation/[slug]` paginas de documentacion
- `/request-implementation` flujo para solicitar implementacion
- API routes para busqueda en docs, envio de cotizacion y hCaptcha
- Rutas backend de NAVAI en `/navai/*`
- Contenido de documentacion multiidioma
- Modulos de funciones NAVAI personalizados (backend + frontend)

## Funcionalidades principales

### Experiencia de documentacion

- El contenido vive en `src/content/navai-readmes/*.md`
- Las paginas se renderizan con el shell/componentes de docs en `src/components`
- Endpoint de busqueda: `src/app/api/docs-search/route.ts`
- Contenido localizado disponible para la UI de documentacion

### Integracion del agente de voz NAVAI

- La configuracion backend se carga desde variables de entorno en `navai.config.ts`
- Rutas de funciones NAVAI:
- `src/app/navai/functions/route.ts`
- `src/app/navai/functions/execute/route.ts`
- Endpoint de client secret realtime:
- `src/app/navai/realtime/client-secret/route.ts`

### Navegacion IA consciente del proyecto

El agente puede entender pantallas y URLs de este proyecto usando un catalogo de navegacion y funciones personalizadas.

- Catalogo de navegacion: `src/ai/navigation-catalog.json`
- Items de ruta: `src/ai/routes.ts`
- Modulos de funciones backend:
- `src/ai/functions-modules/backend/navigation/project-navigation.js`
- `src/ai/functions-modules/backend/system/health.js`
- Modulos de funciones locales (frontend):
- `src/ai/functions-modules/frontend/ui/scroll-page.ts`
- Loader de funciones locales:
- `src/ai/frontend-function-loaders.ts`

Capacidades personalizadas:

- Listar rutas/menus/submenus del proyecto
- Describir una pagina/vista especifica
- Explicar para que sirve una pagina
- Buscar conocimiento en docs/implementacion
- Hacer scroll en la pagina actual del navegador (`scroll_page`)

## Estructura del proyecto

```text
src/
  app/                         Rutas Next.js (UI + API)
  ai/                          Catalogo de navegacion NAVAI, rutas y funciones
  components/                  Componentes UI (docs shell, home, NAVAI mic, etc.)
  content/navai-readmes/       Contenido de documentacion y recursos localizados
  i18n/                        Traducciones y provider de idioma
  lib/                         Helpers de docs y runtime backend
  theme/                       Provider de tema
scripts/                       Utilidades de mantenimiento del proyecto
```

## Inicio rapido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear archivo de entorno

Copia `.env.example` a `.env` y configura al menos:

- `OPENAI_API_KEY`

### 3. Ejecutar la app

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Variables de entorno

Definidas en `.env.example`:

- `OPENAI_API_KEY`
- `OPENAI_REALTIME_MODEL`
- `OPENAI_REALTIME_VOICE`
- `OPENAI_REALTIME_INSTRUCTIONS`
- `OPENAI_REALTIME_LANGUAGE`
- `OPENAI_REALTIME_VOICE_ACCENT`
- `OPENAI_REALTIME_VOICE_TONE`
- `OPENAI_REALTIME_CLIENT_SECRET_TTL`
- `NAVAI_ALLOW_FRONTEND_API_KEY`
- `NAVAI_FUNCTIONS_FOLDERS`

## Scripts

- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build de produccion
- `npm run start`: Ejecutar build de produccion
- `npm run lint`: Ejecutar ESLint

## Notas

- Este repositorio ya no es una plantilla default de `create-next-app`; esta adaptado para documentacion y flujos de implementacion NAVAI.
- Si despliegas en un entorno que instala solo dependencias de produccion, asegurese de mantener disponibles los paquetes CSS importados en runtime (por ejemplo `shadcn` si se vuelve a usar en imports globales).
