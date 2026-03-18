const CACHE_NAME = "navai-pwa-v2";
const APP_SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/navai-install-192.png",
  "/navai-install-512.png",
  "/navai_banner.webp",
  "/navai_logo.webp",
];

function isCacheableStaticAsset(url) {
  return /\.(?:avif|css|gif|ico|jpg|jpeg|js|json|mjs|png|svg|webp|woff2?)$/i.test(url.pathname);
}

function shouldBypassRequest(request) {
  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return true;
  }

  if (
    url.pathname.startsWith("/@fs/") ||
    url.pathname.startsWith("/@id/") ||
    url.pathname.startsWith("/@vite/") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/")
  ) {
    return true;
  }

  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (shouldBypassRequest(request)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse));
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          return cachedResponse || caches.match("/");
        })
    );
    return;
  }

  if (!isCacheableStaticAsset(url)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse));
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
