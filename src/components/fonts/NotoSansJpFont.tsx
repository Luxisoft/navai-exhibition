'use client';

import { Noto_Sans_JP } from "next/font/google";
import { useEffect } from "react";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

export default function NotoSansJpFont() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(notoSansJp.variable);

    return () => {
      root.classList.remove(notoSansJp.variable);
    };
  }, []);

  return null;
}
