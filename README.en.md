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
  <img alt="NAVAI" src="https://img.shields.io/badge/NAVAI-Voice%20Agent-0A66C2?style=for-the-badge">
  <img alt="OpenAI Realtime" src="https://img.shields.io/badge/OpenAI-Realtime-1D9A6C?style=for-the-badge">
</p>

---

Next.js app used as a NAVAI showcase site with:

- Product/landing screens
- Documentation pages
- Implementation request page
- NAVAI voice agent integration (frontend + backend)
- Project-aware AI navigation tools (routes, views, submenus, page purpose, scrolling)

## What This Repository Includes

- `App Router` site (`src/app`) with:
- `/` home page
- `/documentation` docs index
- `/documentation/[slug]` documentation pages
- `/request-implementation` implementation request flow
- API routes for docs search, quote submission, and hCaptcha site key
- NAVAI backend routes under `/navai/*`
- Multi-language documentation content
- Custom NAVAI function modules (backend + frontend)

## Main Features

### Documentation Experience

- Documentation content is stored in `src/content/navai-readmes/*.md`
- Pages are rendered through the docs shell/components in `src/components`
- Search endpoint available at `src/app/api/docs-search/route.ts`
- Localized documentation content is available for the docs UI

### NAVAI Voice Agent Integration

- Backend config is loaded from environment variables in `navai.config.ts`
- NAVAI function routes are exposed from:
- `src/app/navai/functions/route.ts`
- `src/app/navai/functions/execute/route.ts`
- Realtime client secret endpoint:
- `src/app/navai/realtime/client-secret/route.ts`

### Project-Aware AI Navigation

The agent can reason about this project's screens and URLs using the navigation catalog and custom tools.

- Navigation catalog: `src/ai/navigation-catalog.json`
- Route items: `src/ai/routes.ts`
- Backend function modules:
- `src/ai/functions-modules/backend/navigation/project-navigation.js`
- `src/ai/functions-modules/backend/system/health.js`
- Frontend local function modules:
- `src/ai/functions-modules/frontend/ui/scroll-page.ts`
- Frontend local function loader:
- `src/ai/frontend-function-loaders.ts`

Custom capabilities include:

- Listing project routes/menus/submenus
- Describing a specific page/view
- Explaining what a page is for
- Searching project docs/implementation knowledge
- Scrolling the current page in the browser (`scroll_page`)

## Project Structure

```text
src/
  app/                         Next.js routes (UI + API)
  ai/                          NAVAI route catalog, route items, function modules
  components/                  UI components (docs shell, home, NAVAI mic, etc.)
  content/navai-readmes/       Documentation content and localized resources
  i18n/                        Translations and language provider
  lib/                         Docs parsing and backend runtime helpers
  theme/                       Theme provider
scripts/                       Project maintenance utilities
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

Copy `.env.example` to `.env` and set at least:

- `OPENAI_API_KEY`

### 3. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Defined in `.env.example`:

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

- `npm run dev`: Start development server
- `npm run build`: Production build
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## Notes

- This repository is customized for NAVAI documentation and implementation flows; it is not a default `create-next-app` template anymore.
- If you deploy in an environment that installs only production dependencies, keep runtime-imported CSS packages available (for example `shadcn` if reintroduced in global CSS imports).
