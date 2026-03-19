import type { AppMessages } from "@/lib/i18n/messages";
import type { NavaiPanelRouteAccess } from "@/lib/navai-panel-api";
import {
  resolveNavaiRouteAccessForPathname,
  isNavaiRouteAllowedForRole,
  type NavaiRouteAccessRole,
} from "@/lib/navai-route-access";
import {
  NAVAI_ADMINISTRATION_HREF,
  NAVAI_SUPPORT_HREF,
} from "@/lib/auth-redirect";

export type NavaiPanelSidebarLink = {
  href: string;
  label: string;
};

export type NavaiPanelSidebarGroup = {
  id: string;
  label: string;
  links: NavaiPanelSidebarLink[];
};

export function filterNavaiSidebarGroupsByRouteAccess(
  groups: NavaiPanelSidebarGroup[],
  role: NavaiRouteAccessRole,
  routeAccessItems: NavaiPanelRouteAccess[],
) {
  if (routeAccessItems.length < 1) {
    return groups;
  }

  return groups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => {
        const routeItem = resolveNavaiRouteAccessForPathname(
          link.href,
          routeAccessItems,
        );
        if (!routeItem) {
          return true;
        }

        return isNavaiRouteAllowedForRole(routeItem, role);
      }),
    }))
    .filter((group) => group.links.length > 0);
}

export function buildNavaiPanelSidebarGroups(
  messages: AppMessages,
  _options?: { canManageUsers?: boolean },
): NavaiPanelSidebarGroup[] {
  return [
    {
      id: "overview",
      label: "",
      links: [{ href: "/panel", label: messages.common.home }],
    },
    {
      id: "workspace",
      label: messages.panelPage.navGroupWorkspaceLabel,
      links: [
        { href: "/panel/manage", label: messages.panelPage.title },
        {
          href: "/panel/evaluations",
          label: messages.panelPage.evaluationsNavLabel,
        },
        { href: "/panel/surveys", label: messages.panelPage.surveysNavLabel },
      ],
    },
    {
      id: "calls",
      label: messages.panelPage.navGroupCallsLabel,
      links: [
        {
          href: "/panel/calls/contact",
          label: messages.panelPage.callsContactNavLabel,
        },
        {
          href: "/panel/calls/api",
          label: messages.panelPage.callsApiNavLabel,
        },
      ],
    },
    {
      id: "contacts",
      label: messages.panelPage.navGroupContactsLabel,
      links: [
        {
          href: "/panel/contacts/list",
          label: messages.panelPage.contactsListNavLabel,
        },
      ],
    },
    {
      id: "account",
      label: messages.panelPage.navGroupAccountLabel,
      links: [
        {
          href: "/panel/profile",
          label: messages.panelPage.profileNavLabel,
        },
        {
          href: "/panel/payments",
          label: messages.panelPage.paymentsNavLabel,
        },
      ],
    },
  ];
}

export function buildNavaiSupportSidebarGroups(
  messages: AppMessages,
): NavaiPanelSidebarGroup[] {
  return [
    {
      id: "overview",
      label: "",
      links: [
        { href: NAVAI_SUPPORT_HREF, label: messages.panelPage.supportNavLabel },
      ],
    },
  ];
}

export function buildNavaiAdministrationSidebarGroups(
  messages: AppMessages,
): NavaiPanelSidebarGroup[] {
  const usersNavLabel = "Usuarios";
  const rolesNavLabel = "Roles";
  const verificationsNavLabel = "Verificaciones";
  const schedulersNavLabel = "Tareas";
  const entryPackagesNavLabel = "Tienda";

  const administrationLinks: NavaiPanelSidebarLink[] = [
    {
      href: `${NAVAI_ADMINISTRATION_HREF}/users`,
      label: usersNavLabel,
    },
    {
      href: `${NAVAI_ADMINISTRATION_HREF}/roles`,
      label: rolesNavLabel,
    },
    {
      href: `${NAVAI_ADMINISTRATION_HREF}/verifications`,
      label: verificationsNavLabel,
    },
    {
      href: `${NAVAI_ADMINISTRATION_HREF}/schedulers`,
      label: schedulersNavLabel,
    },
    {
      href: `${NAVAI_ADMINISTRATION_HREF}/entry-packages`,
      label: entryPackagesNavLabel,
    },
  ].filter((link) => link.label.trim().length > 0);

  return [
    {
      id: "overview",
      label: "",
      links: [{ href: NAVAI_ADMINISTRATION_HREF, label: messages.common.home }],
    },
    {
      id: "administration",
      label: messages.panelPage.navGroupAdministrationLabel,
      links: administrationLinks,
    },
  ];
}
