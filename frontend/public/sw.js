const CACHE_NAME = "elevoni-app-shell-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/elevoni-192.png",
  "/icons/elevoni-512.png",
  "/icons/elevoni-maskable-512.png",
  "/apple-splash-1179x2556.png",
  "/apple-splash-1290x2796.png",
  "/apple-splash-2048x2732.png",
  "/apple-splash-2732x2048.png",
];

async function getBuildAssets() {
  // Vite generates hashed filenames at build time. Read the built HTML so the
  // entry JavaScript and CSS can be available after the first online visit.
  const response = await fetch("/index.html", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load the app shell for caching.");

  const html = await response.text();
  const urls = new Set();
  const matches = html.matchAll(/(?:src|href)=["']([^"']+)["']/g);

  for (const match of matches) {
    const value = match[1];
    if (!value.startsWith("/assets/")) continue;
    urls.add(value);
  }

  return { response, urls: [...urls] };
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const { response, urls } = await getBuildAssets();
    await cache.put("/index.html", response.clone());
    await cache.addAll(APP_SHELL.filter((url) => url !== "/index.html"));
    if (urls.length) await cache.addAll(urls);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("elevoni-app-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Do not cache writes, APIs, authentication, or third-party/payment traffic.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.toLowerCase().includes("paystack")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/index.html");
        return cached || new Response("Elevoni is unavailable offline. Reconnect and try again.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
    );
    return;
  }

  // Hashed Vite assets and app icons are safe to cache. API responses and
  // customer/order data are deliberately excluded from this cache.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })());
  }
});
