export const NAVAI_FRONTEND_FUNCTION_LOADERS = {
  "src/ai/functions-modules/frontend/ui/scroll-page.ts": () =>
    import("@/ai/functions-modules/frontend/ui/scroll-page"),
  "src/ai/functions-modules/frontend/ecommerce/local-ecommerce.ts": () =>
    import("@/ai/functions-modules/frontend/ecommerce/local-ecommerce"),
} as const;
