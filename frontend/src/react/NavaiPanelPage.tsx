import { useEffect } from "react";

import { PanelContentSkeleton, PanelSidebarCardsSkeleton } from "@/components/AppShellSkeletons";
import KnowledgeTemplate from "@/components/KnowledgeTemplate";
import NavaiPanelManager from "@/components/NavaiPanelManager";
import { REQUEST_IMPLEMENTATION_HREF } from "@/lib/auth-redirect";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { useNavaiPanelAccess } from "@/lib/navai-panel-access";
import { buildNavaiPanelSidebarGroups } from "@/lib/navai-panel-navigation";
import { useRouter } from "@/platform/navigation";

import AppProvidersShell from "./AppProvidersShell";

function NavaiPanelContent() {
  const { messages } = useI18n();
  const { isInitializing, user } = useFirebaseAuth();
  const { canManageUsers } = useNavaiPanelAccess();
  const router = useRouter();

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      router.replace(REQUEST_IMPLEMENTATION_HREF);
    }
  }, [isInitializing, router, user]);

  const panelGroups = buildNavaiPanelSidebarGroups(messages, { canManageUsers });

  if (isInitializing || !user) {
    return (
      <KnowledgeTemplate
        activeTopNav="navai-panel"
        title={messages.panelPage.title}
        description={messages.panelPage.domainsSectionDescription}
        sidebarTitle=""
        sections={[]}
        sidebarPageGroups={panelGroups}
        showRightSidebarSourceLink={false}
        showRightSidebarToc={false}
        rightSidebarContent={<PanelSidebarCardsSkeleton />}
        sourceLabel={messages.common.sourceRepository}
        sourceHref="https://github.com/Luxisoft/navai"
        customSectionsContent={<PanelContentSkeleton />}
      />
    );
  }

  return (
    <NavaiPanelManager>
      {({ renderDomainListSection, renderEditorSection }) => (
        <KnowledgeTemplate
          activeTopNav="navai-panel"
          title={messages.panelPage.title}
          description={messages.panelPage.domainsSectionDescription}
          sidebarTitle=""
          sections={[]}
          sidebarPageGroups={panelGroups}
          showRightSidebarSourceLink={false}
          showRightSidebarToc={false}
          rightSidebarContent={renderDomainListSection()}
          sourceLabel={messages.common.sourceRepository}
          sourceHref="https://github.com/Luxisoft/navai"
          customSectionsContent={
            <article className="navai-panel-layout">
              <div className="navai-panel-mobile-domain-list">
                {renderDomainListSection({ mobile: true })}
              </div>
              {renderEditorSection()}
            </article>
          }
        />
      )}
    </NavaiPanelManager>
  );
}

export default function NavaiPanelPage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <NavaiPanelContent />
    </AppProvidersShell>
  );
}
