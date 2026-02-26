'use client';

import { Noto_Sans_Devanagari } from "next/font/google";
import { useEffect } from "react";

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-sans-devanagari",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

export default function NotoSansDevanagariFont() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(notoSansDevanagari.variable);

    return () => {
      root.classList.remove(notoSansDevanagari.variable);
    };
  }, []);

  return null;
}
