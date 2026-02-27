import type { NavaiRoute } from "@navai/voice-frontend";
import navigationCatalog from "@/ai/navigation-catalog.json";

type NavigationCatalogRoute = {
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
const EXCLUDED_PATHS = new Set<string>(["/documentation/playground-stores"]);

export const NAVAI_ROUTE_ITEMS: NavaiRoute[] = catalog.routes
  .filter((route) => {
    if (EXCLUDED_PATHS.has(route.path)) {
      return false;
    }
    if (route.path.startsWith("/documentation/playground-stores#")) {
      return false;
    }
    return !EXCLUDED_PATH_PREFIXES.some((prefix) => route.path.startsWith(prefix));
  })
  .map((route) => ({
    name: route.name,
    path: route.path,
    description: route.description,
    synonyms: route.synonyms,
  }));
