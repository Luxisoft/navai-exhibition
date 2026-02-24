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

export const NAVAI_ROUTE_ITEMS: NavaiRoute[] = catalog.routes.map((route) => ({
  name: route.name,
  path: route.path,
  description: route.description,
  synonyms: route.synonyms,
}));
