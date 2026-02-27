import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "frontend/dist/**",
    "frontend/.astro/**",
    "coverage/**",
    "build/**",
    "**/*.ts",
    "**/*.tsx",
    "**/*.mts",
    "**/*.cts",
  ]),
]);
