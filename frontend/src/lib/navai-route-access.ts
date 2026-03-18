import type { AppMessages } from "@/lib/i18n/messages";
import type {
  NavaiPanelActorRole,
  NavaiPanelRouteAccess,
} from "@/lib/navai-panel-api";
import { normalizePathname } from "@/platform/navigation";

export type NavaiRouteAccessRole = NavaiPanelActorRole | "visitor";

function escapeRoutePatternForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchNavaiRouteAccessPattern(
  pathnamePattern: string,
  pathname: string,
) {
  const normalizedPathname = normalizePathname(pathname);
  const normalizedPattern = normalizePathname(pathnamePattern);

  if (normalizedPattern === normalizedPathname) {
    return true;
  }

  if (normalizedPattern.endsWith("/*")) {
    const prefix = normalizedPattern.slice(0, -2);
    return (
      normalizedPathname === prefix ||
      normalizedPathname.startsWith(`${prefix}/`)
    );
  }

  if (normalizedPattern.includes("/:")) {
    const expression = normalizedPattern
      .split("/")
      .map((segment) => {
        if (!segment) {
          return "";
        }
        if (segment.startsWith(":")) {
          return "[^/]+";
        }
        return escapeRoutePatternForRegExp(segment);
      })
      .join("/");
    const matcher = new RegExp(`^${expression}$`);
    return matcher.test(normalizedPathname);
  }

  return false;
}

export function resolveNavaiRouteAccessForPathname(
  pathname: string,
  items: NavaiPanelRouteAccess[],
) {
  const normalizedPathname = normalizePathname(pathname);
  return (
    items.find((item) =>
      matchNavaiRouteAccessPattern(item.pathnamePattern, normalizedPathname),
    ) ?? null
  );
}

export function isNavaiRouteAllowedForRole(
  item: NavaiPanelRouteAccess,
  role: NavaiRouteAccessRole,
) {
  switch (role) {
    case "visitor":
      return item.allowVisitor;
    case "support":
      return item.allowSupport;
    case "moderator":
      return item.allowModerator;
    case "admin":
      return item.allowAdmin;
    case "user":
    default:
      return item.allowUser;
  }
}

export function hasAnyAuthenticatedAccess(item: NavaiPanelRouteAccess) {
  return (
    item.allowUser ||
    item.allowSupport ||
    item.allowModerator ||
    item.allowAdmin
  );
}

export function resolveNavaiRouteAccessHref(item: NavaiPanelRouteAccess) {
  if (item.routeId === "documentation") {
    return "/documentation/home";
  }
  if (item.routeId === "evaluation-public") {
    return "/evaluations";
  }
  if (item.routeId === "survey-public") {
    return "/surveys";
  }

  if (item.pathnamePattern.endsWith("/*")) {
    const prefix = item.pathnamePattern.slice(0, -2);
    return prefix || "/";
  }

  if (item.pathnamePattern.includes("/:")) {
    return "";
  }

  return item.pathnamePattern;
}

export function resolveFirstAllowedNavaiRouteHref(
  items: NavaiPanelRouteAccess[],
  role: NavaiRouteAccessRole,
) {
  for (const item of items) {
    if (!isNavaiRouteAllowedForRole(item, role)) {
      continue;
    }

    const href = resolveNavaiRouteAccessHref(item);
    if (href) {
      return href;
    }
  }

  return "/";
}

export function getNavaiRouteAccessDisplayLabel(
  messages: AppMessages,
  item: NavaiPanelRouteAccess,
) {
  switch (item.routeId) {
    case "home":
      return messages.common.home;
    case "documentation":
      return messages.common.documentation;
    case "request-implementation":
      return messages.common.requestImplementation;
    case "evaluations-directory":
      return "/evaluations";
    case "surveys-directory":
      return "/surveys";
    case "panel-home":
      return "/panel";
    case "panel-manage":
      return messages.panelPage.title;
    case "panel-evaluations":
      return messages.panelPage.evaluationsNavLabel;
    case "panel-surveys":
      return messages.panelPage.surveysNavLabel;
    case "panel-support":
      return messages.panelPage.supportNavLabel;
    case "panel-profile":
      return messages.panelPage.profileNavLabel;
    case "panel-payments":
      return messages.panelPage.paymentsNavLabel;
    case "panel-points":
      return messages.panelPage.pointsNavLabel;
    case "panel-referrals":
      return messages.panelPage.referralsNavLabel;
    case "panel-users":
      return messages.panelPage.usersNavLabel;
    case "panel-withdrawals":
      return messages.panelPage.withdrawalsNavLabel;
    default:
      return item.pathnamePattern;
  }
}
