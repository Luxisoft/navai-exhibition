'use client';

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/provider";

type PwaInstallButtonProps = {
  compact?: boolean;
  disabled?: boolean;
  className?: string;
};

type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

function isIosSafari() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos =
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isSafari =
    /safari/.test(userAgent) &&
    !/crios|fxios|edgios|opr\/|mercury/.test(userAgent);

  return isIos && isSafari;
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

export default function PwaInstallButton({
  compact = false,
  disabled = false,
  className = "",
}: PwaInstallButtonProps) {
  const { messages } = useI18n();
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isIosManualInstall, setIsIosManualInstall] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsStandalone(isStandaloneDisplayMode());
    setIsIosManualInstall(isIosSafari());

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallPromptEvent(promptEvent);
      setIsStandalone(isStandaloneDisplayMode());
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setShowIosInstructions(false);
      setIsStandalone(true);
    };

    const handleVisibilityChange = () => {
      setIsStandalone(isStandaloneDisplayMode());
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleAppInstalled);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const canShowButton =
    isMounted && !isStandalone && (Boolean(installPromptEvent) || isIosManualInstall);

  if (!canShowButton) {
    return null;
  }

  const triggerInstall = async () => {
    if (disabled) {
      return;
    }

    if (installPromptEvent) {
      await installPromptEvent.prompt();
      try {
        await installPromptEvent.userChoice;
        setInstallPromptEvent(null);
      } catch {
        setInstallPromptEvent(null);
        return;
      }
      return;
    }

    if (isIosManualInstall) {
      setShowIosInstructions(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={compact ? "ghost" : "outline"}
        size={compact ? "icon" : "sm"}
        className={className}
        onClick={() => {
          void triggerInstall();
        }}
        aria-label={messages.common.installApp}
        title={messages.common.installApp}
        disabled={disabled}
      >
        <Download aria-hidden="true" />
        {!compact ? <span>{messages.common.installApp}</span> : null}
      </Button>

      <Dialog open={showIosInstructions} onOpenChange={setShowIosInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{messages.common.installAppInstructionsTitle}</DialogTitle>
            <DialogDescription>
              {messages.common.installAppInstructionsDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>{messages.common.installAppInstructionsStepShare}</p>
            <p>{messages.common.installAppInstructionsStepAdd}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
