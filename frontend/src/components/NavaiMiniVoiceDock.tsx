'use client';

import {
  NavaiVoiceOrbDock,
  type NavaiVoiceOrbDockProps,
  type NavaiWebVoiceAgentLike,
} from "@navai/voice-frontend";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/i18n/provider";
import {
  getNavaiVoiceSnapshot,
  stopNavaiVoiceSession,
  subscribeNavaiVoiceSnapshot,
  syncNavaiVoiceSessionLanguage,
  toggleNavaiVoiceSession,
} from "@/lib/navai-voice-controller";
import { useTheme } from "@/theme/provider";

type NavaiMiniVoiceDockProps = {
  className?: string;
};

type UseNavaiMiniVoiceOrbDockPropsOptions = Pick<
  NavaiVoiceOrbDockProps,
  "className" | "placement" | "showStatus"
>;

function useNavaiMiniVoiceOrbAgent(): NavaiWebVoiceAgentLike {
  const { language, messages } = useI18n();
  const [voiceSnapshot, setVoiceSnapshot] = useState(getNavaiVoiceSnapshot);

  useEffect(() => {
    setVoiceSnapshot(getNavaiVoiceSnapshot());
    return subscribeNavaiVoiceSnapshot((snapshot) => {
      setVoiceSnapshot(snapshot);
    });
  }, []);

  useEffect(() => {
    void syncNavaiVoiceSessionLanguage({
      languageCode: language,
    });
  }, [language]);

  const start = async () => {
    await toggleNavaiVoiceSession({
      apiKey: "",
      micMessages: messages.mic,
      languageCode: language,
    });
  };

  const stop = () => {
    stopNavaiVoiceSession(messages.mic.stopped);
  };

  return useMemo(() => {
    const resolvedStatus = voiceSnapshot.status ?? voiceSnapshot.state;
    const resolvedVoiceState = voiceSnapshot.agentVoiceState ?? (voiceSnapshot.isAgentSpeaking ? "speaking" : "idle");
    const errorMessage =
      resolvedStatus === "error" ? voiceSnapshot.statusMessage || voiceSnapshot.ariaMessage || null : null;

    return {
      status: resolvedStatus,
      agentVoiceState: resolvedVoiceState,
      error: errorMessage,
      isConnecting: resolvedStatus === "connecting",
      isConnected: resolvedStatus === "connected",
      isAgentSpeaking: Boolean(voiceSnapshot.isAgentSpeaking ?? resolvedVoiceState === "speaking"),
      start,
      stop,
    };
  }, [start, stop, voiceSnapshot]);
}

export function useNavaiMiniVoiceOrbDockProps({
  className = "",
  placement,
  showStatus = false,
}: UseNavaiMiniVoiceOrbDockPropsOptions = {}): NavaiVoiceOrbDockProps {
  const { messages } = useI18n();
  const { theme } = useTheme();
  const agent = useNavaiMiniVoiceOrbAgent();
  const resolvedPlacement =
    placement ?? (className.includes("navai-mini-dock--in-topbar-mobile") ? "inline" : "bottom-right");

  const orbMessages = useMemo<NonNullable<NavaiVoiceOrbDockProps["messages"]>>(() => {
    return {
      ariaStart: messages.mic.ariaStart,
      ariaStop: messages.mic.ariaStop,
      connecting: messages.mic.connecting,
    };
  }, [messages.mic.ariaStart, messages.mic.ariaStop, messages.mic.connecting]);

  return useMemo(() => {
    return {
      agent,
      className,
      placement: resolvedPlacement,
      themeMode: theme,
      showStatus,
      messages: orbMessages,
    };
  }, [agent, className, orbMessages, resolvedPlacement, showStatus, theme]);
}

export default function NavaiMiniVoiceDock({ className = "" }: NavaiMiniVoiceDockProps) {
  const dockProps = useNavaiMiniVoiceOrbDockProps({ className });

  return <NavaiVoiceOrbDock {...dockProps} />;
}
