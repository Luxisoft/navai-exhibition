import type { NavaiRoute } from "@navai/voice-frontend";

export const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [
  {
    name: "home",
    path: "/",
    description: "Landing principal",
    synonyms: ["inicio", "ir al inicio", "home", "volver al inicio", "pantalla principal", "start"],
  },
  {
    name: "documentation",
    path: "/documentation",
    description: "Documentation hub organized by README",
    synonyms: ["documentacion", "docs", "manual", "guia tecnica", "technical docs", "documentation", "doc"],
  },
  {
    name: "documentation-root-readme",
    path: "/documentation/root-readme",
    description: "Main README from Navai repository",
    synonyms: ["readme raiz", "readme principal", "overview navai", "project readme"],
  },
  {
    name: "documentation-playground-api",
    path: "/documentation/playground-api",
    description: "Playground API README",
    synonyms: ["playground api", "api de ejemplo", "backend demo"],
  },
  {
    name: "documentation-playground-web",
    path: "/documentation/playground-web",
    description: "Playground Web README",
    synonyms: ["playground web", "web demo", "frontend demo"],
  },
  {
    name: "documentation-playground-mobile",
    path: "/documentation/playground-mobile",
    description: "Playground Mobile README",
    synonyms: ["playground mobile", "mobile demo", "react native demo"],
  },
  {
    name: "documentation-voice-backend",
    path: "/documentation/voice-backend",
    description: "README for @navai/voice-backend",
    synonyms: ["voice backend", "libreria backend", "backend package"],
  },
  {
    name: "documentation-voice-frontend",
    path: "/documentation/voice-frontend",
    description: "README for @navai/voice-frontend",
    synonyms: ["voice frontend", "libreria frontend", "frontend package"],
  },
  {
    name: "documentation-voice-mobile",
    path: "/documentation/voice-mobile",
    description: "README for @navai/voice-mobile",
    synonyms: ["voice mobile", "libreria mobile", "mobile package"],
  },
  {
    name: "request-implementation",
    path: "/request-implementation",
    description: "Commercial page to request implementation",
    synonyms: [
      "pedir implementacion",
      "cotizacion",
      "solicitar propuesta",
      "implementation request",
      "hire implementation",
      "servicios",
    ],
  },
];
