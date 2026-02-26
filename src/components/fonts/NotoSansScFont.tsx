'use client';

import { Noto_Sans_SC } from "next/font/google";
import { useEffect } from "react";

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

export default function NotoSansScFont() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(notoSansSc.variable);

    return () => {
      root.classList.remove(notoSansSc.variable);
    };
  }, []);

  return null;
}
