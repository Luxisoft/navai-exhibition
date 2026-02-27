<h1 align="center">🦉 NAVAI — Realtime Voice AI for UI Navigation & Function Execution</h1>

<p align="center">
  <a href="https://github.com/Luxisoft/navai">
    <img src="./assets/img/navai.png" alt="NAVAI by LUXISOFT" height="120" />
  </a>
</p>

---

🎙️🤖 Build voice-first experiences where an AI agent 🧠 can understand natural speech, 🧭 navigate your app's UI automatically, and ⚡ execute frontend or backend functions in real time — all powered by seamless voice interaction, without clicks.

♿ NAVAI also helps web/mobile projects provide better accessibility for people with visual disabilities, enabling hands-free voice interaction, guided navigation, and real-time execution of key actions.

<div class="docs-install-links">
  <a class="docs-install-link" href="/documentation/installation-api">Installation API</a>
  <a class="docs-install-link" href="/documentation/installation-web">Installation Web</a>
  <a class="docs-install-link" href="/documentation/installation-mobile">Installation Mobile</a>
</div>

### 🚀 High-Impact Real-World Use Cases

- **Executive dashboards and reporting (Web + Mobile):** ask by voice for KPI summaries, filter by date/region/product, open report modules, and trigger secure export/share actions.
- **E-commerce and digital stores:** voice-driven product discovery, category navigation, cart updates, checkout shortcuts, and backend order status checks in one flow.
- **CRM and sales operations:** navigate accounts/opportunities with natural speech, create notes/tasks, and execute backend automations from the same voice session.
- **Field service and logistics apps:** hands-free navigation for technicians/drivers, job lookup, status updates, incident reports, and checklist execution while on the move.
- **Healthcare and clinical workflows:** fast screen navigation, patient record lookup, appointment management, and guided task execution with reduced manual interaction.
- **Finance and operations control centers:** command-and-query interfaces for alerts, approvals, reconciliations, and rule-based backend actions in real time.

### 📦 Core Libraries

| Package | What it does |
| --- | --- |
| ![Backend](https://img.shields.io/badge/%40navai%2Fvoice--backend-Backend-0A66C2?style=flat-square&logo=nodedotjs&logoColor=white) | Creates Realtime `client_secret` and exposes backend tool routes (`/navai/realtime/client-secret`, `/navai/functions`, `/navai/functions/execute`). |
| ![Frontend](https://img.shields.io/badge/%40navai%2Fvoice--frontend-Web-1D9A6C?style=flat-square&logo=react&logoColor=white) | Builds a voice runtime for web apps with navigation + local/backend function execution. |
| ![Mobile](https://img.shields.io/badge/%40navai%2Fvoice--mobile-Mobile-FF6B35?style=flat-square&logo=react&logoColor=white) | Provides React Native voice runtime with pluggable transport (including React Native WebRTC). |

### 🧩 Framework Coverage

![Direct](https://img.shields.io/badge/Coverage-Direct%20Support-success?style=flat-square)
![Compatible](https://img.shields.io/badge/Coverage-Compatible%20via%20Adapter-0A66C2?style=flat-square)
![Backend Contract](https://img.shields.io/badge/Coverage-Backend%20Contract%20Integration-6B7280?style=flat-square)

| Level | Technologies |
| --- | --- |
| Direct support | React (Vite/SPA), React Native, Expo |
| Compatible via adapter/runtime wiring | Remix, Astro, Vue, Nuxt, Angular, Svelte, SvelteKit, Ionic (React/Vue/Angular) |
| Backend contract integration (implement NAVAI HTTP routes) | Laravel, CodeIgniter, Symfony, Django, FastAPI, Flask, Rails, Spring Boot, ASP.NET Core |
| Not direct with current packages | Flutter (requires Dart-specific client/runtime implementation) |

### 📱 Platforms and Devices

| Area | Coverage |
| --- | --- |
| Web | Modern desktop/mobile browsers with mic + WebRTC capabilities |
| Mobile | Android (device + emulator) and iOS (simulator/device) through React Native/Expo development builds |
| Backend runtime | Node.js 20+ (official package path), plus any backend stack that implements the NAVAI route contract |
| AI/Voice transport | OpenAI Realtime + ephemeral backend-issued credentials + tool execution bridge |

