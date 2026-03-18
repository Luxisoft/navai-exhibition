'use client';

import { type CSSProperties, type ComponentType, useEffect, useState } from "react";

import { MiniVoiceOrbSkeleton } from "@/components/AppShellSkeletons";
import type { UseNavaiMiniVoiceOrbDockPropsOptions } from "@/lib/navai-voice-orb";

type NavaiVoiceOrbDockRuntimeProps = UseNavaiMiniVoiceOrbDockPropsOptions & {
  agent: {
    status: string;
    agentVoiceState: string;
    error: string | null;
    isConnecting: boolean;
    isConnected: boolean;
    isAgentSpeaking: boolean;
    start: () => void | Promise<void>;
    stop: () => void;
  };
  className?: string;
  style?: CSSProperties;
  placement?: string;
  themeMode?: string;
  showStatus?: boolean;
  messages?: {
    ariaStart?: string;
    ariaStop?: string;
    connecting?: string;
  };
};

export default function NavaiVoiceOrbDockClient(props: NavaiVoiceOrbDockRuntimeProps) {
  const [DockComponent, setDockComponent] = useState<ComponentType<NavaiVoiceOrbDockRuntimeProps> | null>(null);

  useEffect(() => {
    let isMounted = true;

    void import("@navai/voice-frontend").then((module) => {
      if (!isMounted) {
        return;
      }

      setDockComponent(() => module.NavaiVoiceOrbDock as ComponentType<NavaiVoiceOrbDockRuntimeProps>);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!DockComponent) {
    return <MiniVoiceOrbSkeleton compact={props.className?.includes("navai-mini-dock--in-topbar-mobile")} />;
  }

  return <DockComponent {...props} />;
}
