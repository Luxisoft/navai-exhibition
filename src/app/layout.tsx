import type { Metadata } from "next";
import Script from "next/script";
import {
  IBM_Plex_Mono,
  Noto_Sans,
  Noto_Sans_Devanagari,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_SC,
  Space_Grotesk,
} from "next/font/google";
import ClientProviders from "@/components/ClientProviders";
import "./globals.css";

const GOOGLE_TAG_ID = "G-J5MXCLPYHB";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-sans-devanagari",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "700"],
});

const THEME_INIT_SCRIPT = `
(() => {
  try {
    const key = "navai-theme";
    const stored = window.localStorage.getItem(key);
    const theme = stored === "light" || stored === "dark" ? stored : "light";
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    root.dataset.theme = theme;
  } catch {}
})();
`;

const LANGUAGE_INIT_SCRIPT = `
(() => {
  try {
    const key = "navai-language";
    const allowed = ["en", "fr", "es", "pt", "zh", "ja", "ru", "ko", "hi"];
    const allowedSet = new Set(allowed);
    const stored = window.localStorage.getItem(key);
    if (stored && allowedSet.has(stored)) {
      const root = document.documentElement;
      root.lang = stored;
      root.dataset.language = stored;
      for (const code of allowed) {
        root.classList.remove('lang-' + code);
      }
      root.classList.add('lang-' + stored);
    }
  } catch {}
})();
`;

const GOOGLE_ANALYTICS_INIT_SCRIPT = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GOOGLE_TAG_ID}');
`;

export const metadata: Metadata = {
  metadataBase: new URL("https://navai.luxisoft.com"),
  title: "NAVAI - Realtime Voice AI for UI Navigation & Function Execution",
  description:
    "NAVAI enables voice-first navigation and safe function execution across web and mobile apps.",
  icons: {
    icon: [
      {
        url: "/navai_logo.webp",
        type: "image/png",
      },
    ],
    shortcut: ["/navai_logo.webp"],
    apple: [
      {
        url: "/navai_logo.webp",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "NAVAI - Realtime Voice AI for UI Navigation & Function Execution",
    description:
      "NAVAI enables voice-first navigation and safe function execution across web and mobile apps.",
    images: [
      {
        url: "/navai_banner.webp",
        width: 420,
        height: 150,
        alt: "NAVAI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NAVAI - Realtime Voice AI for UI Navigation & Function Execution",
    description:
      "NAVAI enables voice-first navigation and safe function execution across web and mobile apps.",
    images: ["/navai_banner.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAnalyticsEnabled = process.env.NODE_ENV === "production";

  return (
    <html lang="es" className="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANGUAGE_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} ${notoSans.variable} ${notoSansSc.variable} ${notoSansJp.variable} ${notoSansKr.variable} ${notoSansDevanagari.variable} antialiased`}
      >
        {isAnalyticsEnabled ? (
          <>
            <Script
              id="ga-script"
              strategy="lazyOnload"
              src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
            />
            <Script id="ga-init" strategy="lazyOnload">
              {GOOGLE_ANALYTICS_INIT_SCRIPT}
            </Script>
          </>
        ) : null}
        <ClientProviders>
          <div className="site-shell">
            <main className="site-main">{children}</main>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
