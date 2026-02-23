import { buildNavaiAgent, createNavaiBackendClient, type NavaiRoute } from "@navai/voice-frontend";

const ROUTES: NavaiRoute[] = [
  {
    name: "inicio",
    path: "/",
    description: "Pantalla principal",
    synonyms: ["home", "inicio"],
  },
  {
    name: "perfil",
    path: "/perfil",
    description: "Area de perfil",
    synonyms: ["mi perfil", "profile"],
  },
];

export async function createDemoVoiceAgent(navigate: (path: string) => void) {
  const backend = createNavaiBackendClient({ apiBaseUrl: "http://localhost:3000" });
  const backendFunctions = await backend.listFunctions();

  return buildNavaiAgent({
    navigate,
    routes: ROUTES,
    backendFunctions: backendFunctions.functions,
    executeBackendFunction: backend.executeFunction,
  });
}
