"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "@/platform/navigation";

import AppProvidersShell from "./AppProvidersShell";

import {
  PanelContentSkeleton,
  PanelSidebarCardsSkeleton,
} from "@/components/AppShellSkeletons";
import KnowledgeTemplate from "@/components/KnowledgeTemplate";
import { REQUEST_IMPLEMENTATION_HREF } from "@/lib/auth-redirect";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import type { AppMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/provider";
import { useNavaiPanelAccess } from "@/lib/navai-panel-access";
import { buildNavaiPanelSidebarGroups } from "@/lib/navai-panel-navigation";

type PanelModuleShellProps = {
  page:
    | "home"
    | "manage"
    | "evaluations"
    | "surveys"
    | "support"
    | "users"
    | "withdrawals"
    | "entry-packages"
    | "profile"
    | "payments"
    | "points"
    | "referrals";
  description?: string;
  children: ReactNode;
  rightSidebarExtra?: ReactNode;
  requireAdmin?: boolean;
  shellClassName?: string;
};

function resolvePanelTitle(
  page: PanelModuleShellProps["page"],
  messages: AppMessages,
) {
  switch (page) {
    case "evaluations":
      return messages.panelPage.evaluationsNavLabel;
    case "surveys":
      return messages.panelPage.surveysNavLabel;
    case "support":
      return messages.panelPage.supportNavLabel;
    case "users":
      return messages.panelPage.usersNavLabel;
    case "withdrawals":
      return messages.panelPage.withdrawalsNavLabel;
    case "entry-packages":
      return messages.panelPage.entryPackagesNavLabel;
    case "profile":
      return messages.panelPage.profileNavLabel;
    case "payments":
      return messages.panelPage.paymentsNavLabel;
    case "points":
      return messages.panelPage.pointsNavLabel;
    case "referrals":
      return messages.panelPage.referralsNavLabel;
    default:
      return messages.panelPage.title;
  }
}

export function PanelModuleShellContent({
  page,
  description = "",
  children,
  rightSidebarExtra,
  requireAdmin = false,
  shellClassName,
}: PanelModuleShellProps) {
  const { messages } = useI18n();
  const { isInitializing, user } = useFirebaseAuth();
  const {
    canManageUsers,
    isAdmin,
    isLoading: isAccessLoading,
  } = useNavaiPanelAccess();
  const router = useRouter();
  const title = resolvePanelTitle(page, messages);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      router.replace(REQUEST_IMPLEMENTATION_HREF);
      return;
    }

    if (requireAdmin && !isAccessLoading && !canManageUsers) {
      router.replace("/panel");
    }
  }, [
    canManageUsers,
    isAccessLoading,
    isInitializing,
    requireAdmin,
    router,
    user,
  ]);

  const panelGroups = useMemo(
    () => buildNavaiPanelSidebarGroups(messages, { canManageUsers }),
    [canManageUsers, messages],
  );

  if (isInitializing || !user || (requireAdmin && isAccessLoading)) {
    return (
      <KnowledgeTemplate
        activeTopNav="navai-panel"
        title={title}
        description=""
        sidebarTitle=""
        sections={[]}
        sidebarPageGroups={panelGroups}
        showRightSidebarSourceLink={false}
        showRightSidebarToc={false}
        rightSidebarContent={<PanelSidebarCardsSkeleton />}
        shellClassName={shellClassName}
        sourceLabel={messages.common.sourceRepository}
        sourceHref="https://github.com/Luxisoft/navai"
        customSectionsContent={<PanelContentSkeleton />}
      />
    );
  }

  return (
    <KnowledgeTemplate
      activeTopNav="navai-panel"
      title={title}
      description={description}
      sidebarTitle=""
      sections={[]}
      sidebarPageGroups={panelGroups}
      showRightSidebarSourceLink={false}
      showRightSidebarToc={false}
      rightSidebarContent={rightSidebarExtra}
      shellClassName={shellClassName}
      sourceLabel={messages.common.sourceRepository}
      sourceHref="https://github.com/Luxisoft/navai"
      customSectionsContent={children}
    />
  );
}

export default function PanelModuleShell(props: PanelModuleShellProps) {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelModuleShellContent {...props} />
    </AppProvidersShell>
  );
}
