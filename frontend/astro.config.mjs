import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(frontendRoot, "..");
const frontendSrc = path.resolve(frontendRoot, "src");

export default defineConfig({
  integrations: [react()],
  build: {
    inlineStylesheets: "always",
  },
  vite: {
    plugins: [tailwindcss()],
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
