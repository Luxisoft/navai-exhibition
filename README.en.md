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
</p>

---

This repository is split into:

- `frontend/`: Astro app (UI and static output).
- `backend/`: Node.js/Express API and runtime endpoints.
- `frontend/src/`: shared React/UI logic, docs content, i18n and NAVAI integrations.

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
cp backend/.env.example backend/.env
```

3. Development

```bash
npm run dev:frontend
npm run dev:backend
```

4. Production build and start

```bash
npm run build
npm run start
```

## Scripts

- `npm run dev:frontend`: Astro dev server (`frontend/`).
- `npm run dev:backend`: Express API dev server.
- `npm run build`: frontend Astro build + backend typecheck build.
- `npm run start`: starts backend server that serves `frontend/dist`.


