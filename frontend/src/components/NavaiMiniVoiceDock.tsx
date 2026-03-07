'use client';

import { NavaiProjectVoiceOrbDock } from "@/components/orb";

type NavaiMiniVoiceDockProps = {
  className?: string;
};

export default function NavaiMiniVoiceDock({ className = "" }: NavaiMiniVoiceDockProps) {
  return <NavaiProjectVoiceOrbDock className={className} />;
}
