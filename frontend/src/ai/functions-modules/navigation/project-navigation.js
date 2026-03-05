import navigationCatalog from "@/ai/navigation-catalog.json";
import { getBackendApiBaseUrl } from "@/lib/backend-api";

let catalogPromise = Promise.resolve(navigationCatalog);

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toPayloadObject(payload) {
  return isRecord(payload) ? payload : {};
}

async function loadNavigationCatalog() {
  return catalogPromise;
}

function getRoutes(catalog) {
  const routes = Array.isArray(catalog?.routes) ? catalog.routes : [];
  return routes.filter((item) => isRecord(item));
}

function getChildrenByParentId(routes) {
  const map = new Map();

  for (const route of routes) {
    const parentId = typeof route.parentId === "string" ? route.parentId : "";
    if (!parentId) {
      continue;
    }
    const current = map.get(parentId) ?? [];
    current.push(route);
    map.set(parentId, current);
  }

  for (const items of map.values()) {
    items.sort((a, b) => String(a.path ?? "").localeCompare(String(b.path ?? "")));
  }

  return map;
}

function routeToPublicSummary(route, children) {
  return {
    id: route.id,
    group: route.group,
    kind: route.kind,
    name: route.name,
    title: route.title,
    path: route.path,
    description: route.description,
    synonyms: Array.isArray(route.synonyms) ? route.synonyms : [],
    parentId: route.parentId ?? null,
    screenComponents: Array.isArray(route.screenComponents) ? route.screenComponents : [],
    notes: Array.isArray(route.notes) ? route.notes : [],
    submenus: children.map((child) => ({
      id: child.id,
      name: child.name,
      title: child.title,
      path: child.path,
      kind: child.kind,
      description: child.description,
    })),
  };
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))];
}

function buildPagePurposeProfile(route, parent, children) {
  const kind = typeof route.kind === "string" ? route.kind : "page";
  const group = typeof route.group === "string" ? route.group : "app";
  const components = Array.isArray(route.screenComponents) ? route.screenComponents : [];
  const notes = Array.isArray(route.notes) ? route.notes : [];
  const childItems = Array.isArray(children) ? children : [];

  const whatUserCanDo = [];
  const pageRole = [];
  const agentGuidance = [];
  const contentSources = [];

  if (kind === "group") {
    pageRole.push("Navigation submenu group");
    whatUserCanDo.push("Choose a child page inside this submenu group");
    agentGuidance.push("If the user asks for a specific child topic, navigate directly to the child page URL.");
  }

  if (kind === "section") {
    pageRole.push("In-page anchor subsection");
    whatUserCanDo.push("Jump to a specific subsection inside the parent page");
    agentGuidance.push("Prefer this URL hash when the user asks for a specific subsection on the page.");
  }

  if (kind === "page") {
    pageRole.push("Standalone page route");
  }

  if (group === "documentation") {
    pageRole.push("Documentation surface");
    whatUserCanDo.push("Read NAVAI documentation content and move across docs via sidebar navigation");
    agentGuidance.push("Use navigate_to with the exact docs path when the user requests a specific guide.");
  }

  if (group === "implementation") {
    pageRole.push("Implementation information / quote surface");
    whatUserCanDo.push("Review service scope, plans, and contact options for implementation requests");
    agentGuidance.push("Use URL hashes for direct jumps to plans, pricing note, process, or contact form.");
  }

  if (group === "wordpress") {
    pageRole.push("WordPress integration guide surface");
    whatUserCanDo.push("Review plugin setup, guardrails, endpoint contracts, and operational checklists");
    agentGuidance.push("Use URL hashes for direct jumps to setup, security, endpoints, and operations sections.");
  }

  if (group === "app") {
    pageRole.push("Top-level application surface");
    whatUserCanDo.push("Use entry-point actions to access documentation, implementation, WordPress, or the voice demo");
  }

  if (components.includes("NavaiMicButton")) {
    whatUserCanDo.push("Start or stop the NAVAI realtime voice agent demo");
    contentSources.push("Realtime voice UI");
  }

  if (components.includes("HomeHero")) {
    whatUserCanDo.push("Use quick navigation actions to Documentation and Request Implementation");
    contentSources.push("Home hero actions");
  }

  if (components.includes("NavaiDocsShell")) {
    whatUserCanDo.push("Use docs top tabs, sidebar groups, and right-side table of contents");
    contentSources.push("NavaiDocsShell");
  }

  if (components.includes("DocsSidebarAccordion")) {
    whatUserCanDo.push("Open documentation submenu groups such as Installation, Demo, and Libraries");
    contentSources.push("DocsSidebarAccordion");
  }

  if (components.includes("NavaiDocMarkdown")) {
    whatUserCanDo.push("Read markdown content imported from NAVAI repository README files");
    contentSources.push("Repository README-derived markdown");
  }

  if (components.includes("KnowledgeTemplate")) {
    whatUserCanDo.push("Read structured sections rendered as a knowledge-style page template");
    contentSources.push("KnowledgeTemplate");
  }

  if (components.includes("EcommerceStoreDemo")) {
    whatUserCanDo.push("Explore a realistic ecommerce demo catalog and recent orders");
    whatUserCanDo.push("Review SQLite-backed KPI and sales reports (read-only seed data)");
    whatUserCanDo.push("Create, edit, delete, and buy user demo products stored in localStorage");
    agentGuidance.push(
      "Seed ecommerce records are read-only; only user-created demo products in localStorage can be modified."
    );
    contentSources.push("EcommerceStoreDemo (SQLite seed + localStorage sandbox)");
  }

  if (components.includes("ImplementationContact")) {
    whatUserCanDo.push("Open the quote request form and submit contact details");
    whatUserCanDo.push("Use the WhatsApp shortcut to contact Luxisoft");
    contentSources.push("ImplementationContact form");
  }

  if (route.path === "/documentation/home") {
    whatUserCanDo.push("Open the main documentation home page.");
  }

  if (route.path === "/wordpress") {
    whatUserCanDo.push("Open the WordPress integration guide and navigate its anchored sections.");
  }

  if (childItems.length > 0) {
    whatUserCanDo.push(`Access ${childItems.length} submenu item(s) from this route`);
    agentGuidance.push("List child submenu paths when the user is unsure which page to open.");
  }

  if (parent && kind === "section") {
    whatUserCanDo.push(`Return to parent page ${parent.path} for broader context`);
  }

  const summary =
    typeof route.description === "string" && route.description.trim().length > 0
      ? route.description
      : `Page ${route.title ?? route.name ?? route.path} in the ${group} group.`;

  const audienceHints = [];
  if (group === "documentation") {
    audienceHints.push("Developers integrating NAVAI");
  }
  if (group === "implementation") {
    audienceHints.push("Teams requesting implementation services");
  }
  if (group === "wordpress") {
    audienceHints.push("Teams integrating NAVAI in WordPress");
  }
  if (group === "app" && route.path === "/") {
    audienceHints.push("Visitors exploring NAVAI capabilities");
  }

  return {
    summary,
    pageRole: uniqueStrings(pageRole),
    whatUserCanDo: uniqueStrings(whatUserCanDo),
    contentSources: uniqueStrings(contentSources),
    audienceHints: uniqueStrings(audienceHints),
    agentGuidance: uniqueStrings([
      ...agentGuidance,
      ...(notes.length > 0 ? notes : []),
    ]),
  };
}

function buildNavigationSuggestions(route, parent, children, siblings) {
  const suggestions = [];

  suggestions.push({
    type: "self",
    label: "Open this view",
    target: route.path,
  });

  if (parent && typeof parent.path === "string") {
    suggestions.push({
      type: "parent",
      label: `Parent: ${parent.title ?? parent.name ?? parent.path}`,
      target: parent.path,
    });
  }

  for (const child of (Array.isArray(children) ? children : []).slice(0, 8)) {
    suggestions.push({
      type: "child",
      label: child.title ?? child.name ?? child.path,
      target: child.path,
    });
  }

  for (const sibling of (Array.isArray(siblings) ? siblings : []).slice(0, 6)) {
    suggestions.push({
      type: "sibling",
      label: sibling.title ?? sibling.name ?? sibling.path,
      target: sibling.path,
    });
  }

  return suggestions;
}

function matchRouteByTarget(routes, payload) {
  const explicitTarget =
    typeof payload.target === "string"
      ? payload.target
      : typeof payload.path === "string"
        ? payload.path
        : typeof payload.url === "string"
          ? payload.url
          : typeof payload.name === "string"
            ? payload.name
            : typeof payload.id === "string"
              ? payload.id
              : "";

  const target = normalizeText(explicitTarget);
  if (!target) {
    return null;
  }

  const exact = routes.find((route) => {
    const values = [
      route.id,
      route.name,
      route.path,
      route.title,
      ...(Array.isArray(route.synonyms) ? route.synonyms : []),
    ];
    return values.some((value) => normalizeText(value) === target);
  });
  if (exact) {
    return exact;
  }

  return (
    routes.find((route) => {
      const values = [
        route.id,
        route.name,
        route.path,
        route.title,
        route.description,
        ...(Array.isArray(route.synonyms) ? route.synonyms : []),
      ];
      return values.some((value) => normalizeText(value).includes(target));
    }) ?? null
  );
}

function scoreRouteMatch(route, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return 0;
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const values = [
    route.id,
    route.name,
    route.title,
    route.path,
    route.description,
    ...(Array.isArray(route.synonyms) ? route.synonyms : []),
  ].map(normalizeText);
  const joined = values.join(" ");

  let score = 0;
  for (const value of values) {
    if (!value) {
      continue;
    }
    if (value === normalizedQuery) {
      score += 30;
    } else if (value.startsWith(normalizedQuery)) {
      score += 16;
    } else if (value.includes(normalizedQuery)) {
      score += 8;
    }
  }

  if (joined.includes(normalizedQuery)) {
    score += 12;
  }

  const tokenHits = tokens.reduce((count, token) => (joined.includes(token) ? count + 1 : count), 0);
  if (tokenHits === tokens.length && tokens.length > 1) {
    score += 14;
  } else {
    score += tokenHits * 4;
  }

  return score;
}

function getRequestBaseUrl(context) {
  const backendBaseUrl = getBackendApiBaseUrl();
  if (backendBaseUrl) {
    return backendBaseUrl;
  }

  const request = isRecord(context) ? context.request : null;
  const requestUrl = request && typeof request.url === "string" ? request.url : null;
  if (!requestUrl) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return null;
  }

  try {
    const url = new URL(requestUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

async function fetchKnowledgeSearch(baseUrl, query, language) {
  if (!baseUrl || !query || query.trim().length < 2) {
    return {
      ok: false,
      reason: "missing_base_url_or_query",
      results: [],
    };
  }

  const searchUrl = new URL("/api/docs-search", baseUrl);
  searchUrl.searchParams.set("q", query);
  if (language) {
    searchUrl.searchParams.set("lang", language);
  }

  try {
    const response = await fetch(searchUrl.toString(), { cache: "no-store" });
    if (!response.ok) {
      return {
        ok: false,
        reason: `http_${response.status}`,
        results: [],
      };
    }

    const payload = await response.json().catch(() => ({}));
    const rawResults = Array.isArray(payload?.results) ? payload.results : [];

    return {
      ok: true,
      results: rawResults
        .filter((item) => isRecord(item))
        .map((item) => ({
          id: item.id ?? null,
          title: item.title ?? "",
          snippet: item.snippet ?? "",
          href: item.href ?? "",
          scope: item.scope ?? "",
        })),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
      results: [],
    };
  }
}

export async function listNavaiProjectNavigation(payload) {
  const input = toPayloadObject(payload);
  const catalog = await loadNavigationCatalog();
  const routes = getRoutes(catalog);
  const childrenByParentId = getChildrenByParentId(routes);
  const requestedGroup = typeof input.group === "string" ? normalizeText(input.group) : "";
  const includeSections = input.includeSections !== false;

  const filteredRoutes = routes.filter((route) => {
    if (!requestedGroup) {
      return true;
    }
    return normalizeText(route.group) === requestedGroup;
  });

  const rootRoutes = filteredRoutes.filter((route) => {
    if (!includeSections && route.kind === "section") {
      return false;
    }
    return typeof route.parentId !== "string" || route.parentId.length === 0;
  });

  const items = rootRoutes.map((route) =>
    routeToPublicSummary(
      route,
      includeSections ? childrenByParentId.get(route.id) ?? [] : (childrenByParentId.get(route.id) ?? []).filter((child) => child.kind !== "section")
    )
  );

  return {
    ok: true,
    projectId: catalog.projectId ?? "navai-exhibition",
    projectName: catalog.projectName ?? "NAVAI Exhibition",
    totalRoutes: filteredRoutes.length,
    groups: [...new Set(filteredRoutes.map((route) => route.group).filter(Boolean))],
    items,
    usage: {
      navigateTool: "Use navigate_to with name, alias, or path to move between screens.",
      infoTool: "Use describe_navai_project_view for a specific page or submenu URL.",
      searchTool: "Use search_navai_project_knowledge to search docs and implementation content.",
    },
  };
}

export async function describeNavaiProjectView(payload) {
  const input = toPayloadObject(payload);
  const catalog = await loadNavigationCatalog();
  const routes = getRoutes(catalog);
  const childrenByParentId = getChildrenByParentId(routes);

  const matched = matchRouteByTarget(routes, input);
  if (!matched) {
    return {
      ok: false,
      error: "No matching route/view found.",
      hint: "Pass payload.target with a route name, URL, alias, or title.",
      examples: ["/documentation/installation-web", "request implementation", "/request-implementation#plans"],
    };
  }

  const parent =
    typeof matched.parentId === "string"
      ? routes.find((route) => route.id === matched.parentId) ?? null
      : null;
  const children = childrenByParentId.get(matched.id) ?? [];
  const siblings = parent
    ? (childrenByParentId.get(parent.id) ?? []).filter((route) => route.id !== matched.id)
    : [];

  const related = routes
    .filter((route) => route.group === matched.group && route.id !== matched.id)
    .slice(0, 8)
    .map((route) => ({
      id: route.id,
      title: route.title,
      path: route.path,
      kind: route.kind,
    }));

  return {
    ok: true,
    projectId: catalog.projectId ?? "navai-exhibition",
    match: routeToPublicSummary(matched, children),
    parent: parent ? routeToPublicSummary(parent, childrenByParentId.get(parent.id) ?? []) : null,
    siblings: siblings.map((route) => ({
      id: route.id,
      title: route.title,
      path: route.path,
      kind: route.kind,
    })),
    related,
    navigationTips: [
      `navigate_to target can use the path "${matched.path}"`,
      `navigate_to target can use the route name "${matched.name}"`,
    ],
  };
}

export async function explainNavaiPagePurpose(payload) {
  const input = toPayloadObject(payload);
  const catalog = await loadNavigationCatalog();
  const routes = getRoutes(catalog);
  const childrenByParentId = getChildrenByParentId(routes);

  const matched = matchRouteByTarget(routes, input);
  if (!matched) {
    return {
      ok: false,
      error: "No matching page/view found.",
      hint: "Pass payload.target with a URL path, route name, alias, title, or route id.",
      examples: ["/", "/documentation/installation-web", "/request-implementation#contacto", "playground mobile"],
    };
  }

  const parent =
    typeof matched.parentId === "string"
      ? routes.find((route) => route.id === matched.parentId) ?? null
      : null;
  const children = childrenByParentId.get(matched.id) ?? [];
  const siblings = parent
    ? (childrenByParentId.get(parent.id) ?? []).filter((route) => route.id !== matched.id)
    : [];
  const purpose = buildPagePurposeProfile(matched, parent, children);

  return {
    ok: true,
    projectId: catalog.projectId ?? "navai-exhibition",
    page: routeToPublicSummary(matched, children),
    purpose,
    parent: parent
      ? {
          id: parent.id,
          title: parent.title,
          path: parent.path,
          kind: parent.kind,
        }
      : null,
    navigationSuggestions: buildNavigationSuggestions(matched, parent, children, siblings),
    answerTemplateHints: [
      "Explain what the page is for in one sentence.",
      "Mention the exact URL path.",
      "List the main user actions available on that page.",
    ],
  };
}

export async function listNavaiPagePurposeSummaries(payload) {
  const input = toPayloadObject(payload);
  const catalog = await loadNavigationCatalog();
  const routes = getRoutes(catalog);
  const childrenByParentId = getChildrenByParentId(routes);

  const requestedGroup = typeof input.group === "string" ? normalizeText(input.group) : "";
  const includeSections = input.includeSections === true;
  const includeChildren = input.includeChildren !== false;
  const maxItemsRaw = Number(input.maxItems);
  const maxItems = Number.isFinite(maxItemsRaw) && maxItemsRaw > 0 ? Math.min(60, Math.floor(maxItemsRaw)) : 30;

  const filteredRoutes = routes.filter((route) => {
    if (!requestedGroup) {
      return true;
    }
    return normalizeText(route.group) === requestedGroup;
  });

  const rootRoutes = filteredRoutes.filter((route) => {
    if (route.kind === "section" && !includeSections) {
      return false;
    }
    return typeof route.parentId !== "string" || route.parentId.length === 0;
  });

  const items = [];
  for (const route of rootRoutes) {
    const children = childrenByParentId.get(route.id) ?? [];
    const purpose = buildPagePurposeProfile(route, null, children);
    items.push({
      id: route.id,
      title: route.title,
      path: route.path,
      group: route.group,
      kind: route.kind,
      purposeSummary: purpose.summary,
      whatUserCanDo: purpose.whatUserCanDo.slice(0, 4),
      pageRole: purpose.pageRole,
      hasSubmenus: children.length > 0,
      submenuCount: children.length,
      submenus: includeChildren
        ? children
            .filter((child) => includeSections || child.kind !== "section")
            .slice(0, 12)
            .map((child) => {
              const childPurpose = buildPagePurposeProfile(child, route, []);
              return {
                id: child.id,
                title: child.title,
                path: child.path,
                kind: child.kind,
                purposeSummary: childPurpose.summary,
              };
            })
        : [],
    });

    if (items.length >= maxItems) {
      break;
    }
  }

  return {
    ok: true,
    projectId: catalog.projectId ?? "navai-exhibition",
    projectName: catalog.projectName ?? "NAVAI Exhibition",
    filters: {
      group: requestedGroup || null,
      includeSections,
      includeChildren,
      maxItems,
    },
    totalAvailableRootItems: rootRoutes.length,
    items,
    usage: {
      detailTool: "Use explain_navai_page_purpose for a specific page/submenu URL.",
      targetExamples: ["/documentation/home", "/documentation/voice-mobile", "/request-implementation#plans"],
    },
  };
}

export async function searchNavaiProjectKnowledge(payload, context) {
  const input = toPayloadObject(payload);
  const query = typeof input.query === "string" ? input.query.trim() : "";
  const language = typeof input.lang === "string" ? input.lang.trim() : "";

  if (query.length < 2) {
    return {
      ok: false,
      error: "payload.query must contain at least 2 characters.",
    };
  }

  const catalog = await loadNavigationCatalog();
  const routes = getRoutes(catalog);
  const childrenByParentId = getChildrenByParentId(routes);
  const scoredRouteMatches = routes
    .map((route) => ({ route, score: scoreRouteMatch(route, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const routeMatchesByPath = new Map();
  for (const entry of scoredRouteMatches) {
    const key = typeof entry.route.path === "string" ? entry.route.path : String(entry.route.id ?? "");
    if (!routeMatchesByPath.has(key)) {
      routeMatchesByPath.set(key, {
        score: entry.score,
        ...routeToPublicSummary(entry.route, childrenByParentId.get(entry.route.id) ?? []),
      });
    }
    if (routeMatchesByPath.size >= 8) {
      break;
    }
  }

  const routeMatches = [...routeMatchesByPath.values()];

  const baseUrl = getRequestBaseUrl(context);
  const knowledgeSearch = await fetchKnowledgeSearch(baseUrl, query, language);

  return {
    ok: true,
    query,
    language: language || null,
    baseUrlAvailable: Boolean(baseUrl),
    routeMatches,
    knowledgeSearch,
    usage: {
      routeMatches: "Best for screen URLs, menus, and submenus in this project.",
      knowledgeSearch: "Best for actual documentation or implementation page content snippets.",
    },
  };
}
