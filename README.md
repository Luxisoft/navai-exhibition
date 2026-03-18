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
  <img alt="NAVAI" src="https://img.shields.io/badge/NAVAI-Voice%20Agent-0A66C2?style=for-the-badge">
  <img alt="OpenAI Realtime" src="https://img.shields.io/badge/OpenAI-Realtime-1D9A6C?style=for-the-badge">
</p>

---

This repository uses Astro for the frontend and Node.js/Express for the backend API, and showcases NAVAI documentation, implementation request flows, and a NAVAI voice agent integrated into the UI.

- `README.es.md`: Spanish documentation
- `README.en.md`: English documentation
- `frontend/README.md`: Frontend setup, env vars and commands
- `backend/README.md`: Backend setup, env vars, endpoints and commands

## NAVAI Multi-Agent Structure

The project now uses the NAVAI multi-agent layout:

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

Only the first level under `src/ai/` defines an agent. Inner folders are optional and only help organize files.

- `main`: primary agent for navigation, orchestration, and specialist delegation.
- `evaluations`: specialist for evaluation flows.
- `surveys`: specialist for survey flows.
- `public-experience`: public runtime for shared survey/evaluation links.

On web realtime, the main agent delegates to specialists with `handoffs`.

## Environment

- Frontend: `NAVAI_FUNCTIONS_FOLDERS=src/ai`
- Frontend: `NAVAI_AGENTS_FOLDERS=main,evaluations,surveys,public-experience`
- Frontend routes: `NAVAI_ROUTES_FILE=src/ai/main/routes.ts`
- Backend: `NAVAI_FUNCTIONS_FOLDERS=backend/src/ai`
- Backend: `NAVAI_AGENTS_FOLDERS=main,evaluations,surveys`

## Add a New Agent

1. Create `src/ai/<agent>/`.
2. Add `agent.config.ts`.
3. Place the agent functions inside that folder.
4. Add the folder name to `NAVAI_AGENTS_FOLDERS`.
5. Regenerate loaders and run validation commands.

## Test the Multi-Agent Flow

```bash
npm run generate:module-loaders
npm run dev:frontend
npm run dev:backend
npm run check:backend-functions
```

Then verify:

- General navigation requests stay in `main`.
- Evaluation requests are delegated to `evaluations`.
- Survey requests are delegated to `surveys`.
