import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(frontendRoot, "..");
const frontendSrc = path.resolve(frontendRoot, "src");

// Load envs from both project root and frontend root to avoid deployment path mismatches.
dotenv.config({ path: path.resolve(projectRoot, ".env") });
dotenv.config({ path: path.resolve(frontendRoot, ".env"), override: true });

export default defineConfig({
  integrations: [react()],
  devToolbar: {
    enabled: false,
  },
  build: {
    inlineStylesheets: "always",
  },
  vite: {
    cacheDir: path.resolve(projectRoot, "node_modules/.vite/frontend"),
    plugins: [tailwindcss()],
    optimizeDeps: {
      force: true,
      // Keep a stable dep cache across dev restarts to prevent "Outdated Optimize Dep" 504s.
      include: [
        "@hcaptcha/react-hcaptcha",
        "@navai/voice-frontend",
        "@openai/agents/realtime",
        "@radix-ui/react-dialog",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-label",
        "@radix-ui/react-separator",
        "@radix-ui/react-tabs",
        "@tanstack/react-table",
        "embla-carousel-auto-height",
        "embla-carousel-autoplay",
        "embla-carousel-react",
        "react",
        "react-dom",
        "react/jsx-dev-runtime",
        "react/jsx-runtime",
        "react-markdown",
        "rehype-raw",
        "remark-gfm",
      ],
    },
    resolve: {
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
      alias: {
        "@": frontendSrc,
      },
    },
    server: {
      host: "0.0.0.0",
      port: 4321,
      strictPort: true,
      fs: {
        allow: [projectRoot],
      },
      hmr: {
        host: "localhost",
        port: 4321,
        clientPort: 4321,
        protocol: "ws",
      },
    },
  },
});
