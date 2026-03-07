# Backend NAVAI (Node.js + Express)

Este modulo expone la API para realtime client secrets, registro/ejecucion de funciones NAVAI y endpoints auxiliares (docs search, quote form, ecommerce seed).

## Requisitos

- Node.js 20+
- npm 10+

## Instalacion

Desde la raiz del repo:

```bash
npm install
```

Crear entorno de backend:

```bash
# Linux/macOS
cp backend/.env.example backend/.env
```

```powershell
# Windows PowerShell
Copy-Item backend/.env.example backend/.env
```

## Variables de entorno (`backend/.env`)

| Variable | Requerida | Default sugerido | Uso |
| --- | --- | --- | --- |
| `PORT` | Si | `3000` | Puerto del backend HTTP. |
| `CORS_ALLOWED_ORIGINS` | Si | `http://localhost:4321,http://127.0.0.1:4321` | Origenes permitidos para `/api/*` y `/navai/*`. |
| `CORS_ALLOW_CREDENTIALS` | No | `false` | Habilita `Access-Control-Allow-Credentials`. |
| `CORS_ALLOWED_METHODS` | No | `GET,POST,PUT,PATCH,DELETE,OPTIONS` | Metodos permitidos por CORS. |
| `CORS_ALLOWED_HEADERS` | No | `Content-Type,Authorization,X-Requested-With` | Headers permitidos por CORS. |
| `CORS_EXPOSE_HEADERS` | No | vacio | Headers expuestos en respuestas CORS. |
| `OPENAI_API_KEY` | Recomendado | vacio | API key backend para OpenAI Realtime. |
| `OPENAI_REALTIME_MODEL` | No | `gpt-realtime` | Modelo por defecto para client secret. |
| `OPENAI_REALTIME_VOICE` | No | `marin` | Voz por defecto para realtime. |
| `OPENAI_REALTIME_INSTRUCTIONS` | No | `You are a helpful assistant.` | Prompt base por defecto. |
| `OPENAI_REALTIME_LANGUAGE` | No | `Spanish` | Idioma inicial por defecto. |
| `OPENAI_REALTIME_VOICE_ACCENT` | No | `neutral Latin American Spanish` | Acento por defecto. |
| `OPENAI_REALTIME_VOICE_TONE` | No | `friendly and professional` | Tono por defecto. |
| `OPENAI_REALTIME_CLIENT_SECRET_TTL` | No | `600` | TTL del client secret (segundos). |
| `NAVAI_ALLOW_FRONTEND_API_KEY` | No | `false` | Permite `apiKey` enviada por frontend (usar con cuidado). |
| `NAVAI_SECURITY_ENABLED` | No | `true` | Activa proteccion anti-abuso solo para `/navai/*`. |
| `NAVAI_SECURITY_ALLOW_MISSING_ORIGIN` | No | `true` | Permite requests sin header `Origin` (curl/mobile/server-to-server). |
| `NAVAI_SECURITY_REQUIRE_BROWSER_CLIENT_ID` | No | `true` | Exige `X-NAVAI-Client-Id` cuando llega un `Origin` de navegador. |
| `NAVAI_SECURITY_WINDOW_SECONDS` | No | `600` | Ventana de conteo para cuotas del agente. |
| `NAVAI_SECURITY_BLOCK_SECONDS` | No | `600` | Tiempo de enfriamiento cuando una identidad supera el presupuesto. |
| `NAVAI_SECURITY_MAX_REQUESTS_PER_WINDOW` | No | `240` | Maximo total de requests `/navai/*` por identidad y ventana. |
| `NAVAI_SECURITY_MAX_CLIENT_SECRETS_PER_WINDOW` | No | `10` | Maximo de emisiones `client_secret` por identidad y ventana. |
| `NAVAI_SECURITY_MAX_FUNCTION_LISTS_PER_WINDOW` | No | `120` | Maximo de consultas a `/navai/functions` por identidad y ventana. |
| `NAVAI_SECURITY_MAX_FUNCTION_EXECUTIONS_PER_WINDOW` | No | `150` | Maximo de ejecuciones `/navai/functions/execute` por identidad y ventana. |
| `NAVAI_SECURITY_MIN_CLIENT_SECRET_INTERVAL_SECONDS` | No | `8` | Tiempo minimo entre emisiones consecutivas de `client_secret` por identidad. |
| `NAVAI_FUNCTIONS_FOLDERS` | Si | `backend/src/ai/functions-modules` | Carpetas backend para auto-cargar tools. |
| `NAVAI_FUNCTIONS_BASE_DIR` | No | vacio | Base dir opcional para resolver loaders. |
| `PUBLIC_HCAPTCHA_SITE_KEY` | No | vacio | Site key publica (fallback para frontend/API). |
| `HCAPTCHA_SITE_KEY` | No | vacio | Site key publica alternativa. |
| `HCAPTCHA_SITE_SECRET_KEY` | Si para `/api/quote` | vacio | Secret key de hCaptcha para validar token. |
| `SMTP_HOST` | Si para `/api/quote` | vacio | Host SMTP para envio de correos. |
| `SMTP_PORT` | Si para `/api/quote` | `465` | Puerto SMTP. |
| `SMTP_SECURE` | No | `true` | Conexion segura SMTP. |
| `SMTP_USER` | Si para `/api/quote` | vacio | Usuario SMTP. |
| `SMTP_PASS` | Si para `/api/quote` | vacio | Password SMTP. |
| `SMTP_FROM` | No | usa `SMTP_USER` | Remitente de correo. |

## Comandos

Todos se ejecutan desde la raiz del repo.

```bash
# Desarrollo backend
npm run dev:backend

# Verifica carga de funciones backend y warnings
npm run check:backend-functions

# Typecheck backend
npm run build:backend

# Arranque (modo API)
npm run start
```

## Endpoints principales

- `GET /health`
- `GET /api/backend-capabilities`
- `GET /api/hcaptcha/site-key`
- `POST /api/quote`
- `GET /api/docs-search`
- `GET /api/ecommerce-demo/seed`
- `POST /navai/realtime/client-secret`
- `GET /navai/functions`
- `POST /navai/functions/execute`

## Proteccion anti-abuso del agente

El backend ahora aplica una capa de seguridad en memoria sobre `/navai/*` para reducir abuso y costo de OpenAI:

- valida `Origin` cuando existe y rechaza origenes fuera de `CORS_ALLOWED_ORIGINS`
- identifica al navegador por `X-NAVAI-Client-Id` y cae a IP cuando ese header no existe
- limita emisiones de `client_secret`, consultas de functions y ejecuciones backend por ventana
- aplica enfriamiento temporal cuando una identidad supera el presupuesto
- devuelve `Retry-After` para que el frontend sepa cuando puede reintentar

Limitacion importante: en esta arquitectura el browser se conecta directo a OpenAI Realtime despues de recibir `client_secret`. Eso significa que este backend puede frenar reconexiones, bursts y abuso de emision de sesiones, pero no medir ni cortar con precision los tokens consumidos dentro de una sesion ya abierta. Para imponer presupuesto exacto por token o duracion real necesitas un relay/proxy server-side entre cliente y OpenAI.

## Estructura de funciones

- Funciones backend: `backend/src/ai/functions-modules/**`
- Las funciones frontend deben quedarse en `frontend/src/ai/functions-modules/**`
- No mezclar imports cruzados frontend/backend para funciones de runtime
