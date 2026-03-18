'use client';

import { MessageCircle, Rocket } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { NAVAI_PANEL_HREF, storePostAuthRedirect } from "@/lib/auth-redirect";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { stripLeadingDecorativeText } from "@/lib/decorative-text";
import { useI18n } from "@/lib/i18n/provider";
import { getLuxisoftWhatsAppLink } from "@/lib/luxisoft-contact";
import { cn } from "@/lib/utils";
import { useRouter } from "@/platform/navigation";

export default function ImplementationContact() {
  const { messages } = useI18n();
  const router = useRouter();
  const {
    isBusy,
    isConfigured,
    isInitializing,
    signInWithGoogle,
    user,
  } = useFirebaseAuth();

  const whatsappLink = useMemo(() => {
    return getLuxisoftWhatsAppLink(messages.implementationPage.whatsappPrefill);
  }, [messages.implementationPage.whatsappPrefill]);
  const useInMyAppButtonLabel = useMemo(
    () => stripLeadingDecorativeText(messages.implementationPage.useInMyAppButtonLabel),
    [messages.implementationPage.useInMyAppButtonLabel]
  );
  const whatsappButtonLabel = useMemo(
    () => stripLeadingDecorativeText(messages.implementationPage.whatsappButtonLabel),
    [messages.implementationPage.whatsappButtonLabel]
  );
  const canStartImplementation = Boolean(user);
  const isStartButtonDisabled =
    !canStartImplementation && (!isConfigured || isInitializing || isBusy);

  const handleUseInMyApp = async () => {
    if (canStartImplementation) {
      router.push(NAVAI_PANEL_HREF);
      return;
    }

    if (!isConfigured || isInitializing || isBusy || typeof window === "undefined") {
      return;
    }

    storePostAuthRedirect(NAVAI_PANEL_HREF);
    await signInWithGoogle();
  };

  return (
    <div className="impl-contact-wrap">
      <div className="impl-contact-top-actions">
        <Button
          type="button"
          size="lg"
          className={cn("impl-use-app-btn min-w-[18rem] justify-center rounded-[0.75rem]")}
          disabled={isStartButtonDisabled}
          onClick={() => {
            void handleUseInMyApp();
          }}
          aria-label={useInMyAppButtonLabel}
          title={!isConfigured && !canStartImplementation ? messages.common.authUnavailable : useInMyAppButtonLabel}
        >
          <Rocket className="impl-use-app-icon" aria-hidden="true" />
          <span>{useInMyAppButtonLabel}</span>
        </Button>
        <Button
          asChild
          variant="success"
          size="lg"
          className={cn("impl-whatsapp-btn min-w-[15rem] justify-center rounded-[0.75rem]")}
        >
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={whatsappButtonLabel}
            title={whatsappButtonLabel}
          >
            <MessageCircle className="impl-whatsapp-icon" aria-hidden="true" />
            <span>{whatsappButtonLabel}</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
