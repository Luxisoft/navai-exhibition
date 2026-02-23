import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import ClientProviders from "@/components/ClientProviders";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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

export const metadata: Metadata = {
  title: "Navai | Voice Runtime",
  description:
    "Navai enables voice-first navigation and safe function execution across web and mobile apps.",
  icons: {
    icon: [
      {
        url: "/navai_logo.png",
        type: "image/png",
      },
    ],
    shortcut: ["/navai_logo.png"],
    apple: [
      {
        url: "/navai_logo.png",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "Navai | Voice Runtime",
    description:
      "Navai enables voice-first navigation and safe function execution across web and mobile apps.",
    images: [
      {
        url: "/navai_banner.png",
        width: 420,
        height: 150,
        alt: "Navai",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Navai | Voice Runtime",
    description:
      "Navai enables voice-first navigation and safe function execution across web and mobile apps.",
    images: ["/navai_banner.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <ClientProviders>
          <div className="site-shell">
            <main className="site-main">{children}</main>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
