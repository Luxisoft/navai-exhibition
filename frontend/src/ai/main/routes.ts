import type { NavaiRoute } from "@navai/voice-frontend";
import navigationCatalog from "@/ai/main/navigation-catalog.json";

type NavigationCatalogRoute = {
  kind?: string;
  name: string;
  path: string;
  description: string;
  synonyms?: string[];
};

type NavigationCatalogData = {
  routes: NavigationCatalogRoute[];
};

const catalog = navigationCatalog as NavigationCatalogData;

const EXCLUDED_PATH_PREFIXES = ["/example"];
const EXCLUDED_PATHS = new Set<string>([
  "/documentation",
  "/documentation/playground-stores",
]);
const ALLOWED_ROUTE_KINDS = new Set<string>(["page", "section"]);

const dedupedRoutesByPath = new Map<string, NavaiRoute>();

for (const route of catalog.routes) {
  const rawPath = typeof route.path === "string" ? route.path.trim() : "";
  if (!rawPath) {
    continue;
  }

  const routeKind = typeof route.kind === "string" ? route.kind : "page";
  if (!ALLOWED_ROUTE_KINDS.has(routeKind)) {
    continue;
  }
  if (EXCLUDED_PATHS.has(rawPath)) {
    continue;
  }
  if (rawPath.startsWith("/documentation/playground-stores#")) {
    continue;
  }
  if (EXCLUDED_PATH_PREFIXES.some((prefix) => rawPath.startsWith(prefix))) {
    continue;
  }

  if (dedupedRoutesByPath.has(rawPath)) {
    continue;
  }

  dedupedRoutesByPath.set(rawPath, {
    name: route.name,
    path: rawPath,
    description: route.description,
    synonyms: route.synonyms,
  });
}

export const NAVAI_ROUTE_ITEMS: NavaiRoute[] = [...dedupedRoutesByPath.values()];
