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
    plugins: [tailwindcss()],
    optimizeDeps: {
      // Keep a stable dep cache across dev restarts to prevent "Outdated Optimize Dep" 504s.
      include: [
        "@hcaptcha/react-hcaptcha",
        "@navai/voice-frontend",
        "@openai/agents/realtime",
        "react-markdown",
        "rehype-raw",
        "remark-gfm",
      ],
    },
    resolve: {
      alias: {
        "@": frontendSrc,
      },
    },
    server: {
      fs: {
        allow: [projectRoot],
      },
    },
  },
});
