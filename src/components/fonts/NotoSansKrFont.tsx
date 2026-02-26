'use client';

import { Noto_Sans_KR } from "next/font/google";
import { useEffect } from "react";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

export default function NotoSansKrFont() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(notoSansKr.variable);

    return () => {
      root.classList.remove(notoSansKr.variable);
    };
  }, []);

  return null;
}
