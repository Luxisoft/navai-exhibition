import type { AppMessages } from "@/lib/i18n/messages";

export type NavaiPanelSidebarLink = {
  href: string;
  label: string;
};

export type NavaiPanelSidebarGroup = {
  id: string;
  label: string;
  links: NavaiPanelSidebarLink[];
};

export function buildNavaiPanelSidebarGroups(
  messages: AppMessages,
  options?: { canManageUsers?: boolean },
): NavaiPanelSidebarGroup[] {
  const canManageUsers = options?.canManageUsers ?? false;

  return [
    {
      id: "overview",
      label: messages.panelPage.navGroupOverviewLabel,
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
        { href: "/panel/support", label: messages.panelPage.supportNavLabel },
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
        {
          href: "/panel/points",
          label: messages.panelPage.pointsNavLabel,
        },
        {
          href: "/panel/referrals",
          label: messages.panelPage.referralsNavLabel,
        },
      ],
    },
    ...(canManageUsers
      ? [
          {
            id: "administration",
            label: messages.panelPage.navGroupAdministrationLabel,
            links: [
              {
                href: "/panel/users",
                label: messages.panelPage.usersNavLabel,
              },
              {
                href: "/panel/withdrawals",
                label: messages.panelPage.withdrawalsNavLabel,
              },
              {
                href: "/panel/entry-packages",
                label: messages.panelPage.entryPackagesNavLabel,
              },
            ],
          } satisfies NavaiPanelSidebarGroup,
        ]
      : []),
  ];
}
