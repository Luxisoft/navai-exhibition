import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(frontendRoot, "..");
const sharedSrc = path.resolve(projectRoot, "src");

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": sharedSrc,
        "next/link": path.resolve(frontendRoot, "src/compat/next-link.tsx"),
        "next/image": path.resolve(frontendRoot, "src/compat/next-image.tsx"),
        "next/navigation": path.resolve(frontendRoot, "src/compat/next-navigation.ts"),
        "next/dynamic": path.resolve(frontendRoot, "src/compat/next-dynamic.tsx"),
      },
    },
    server: {
      fs: {
        allow: [projectRoot],
      },
    },
  },
});
