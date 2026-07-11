// Selfie Booth service worker.
//
// Strategy:
//  - App shell (booth capture route + static assets): cache-first, so a
//    kiosk that loses connectivity mid-event keeps working instantly.
//  - Navigations: network-first with a cached-shell fallback, so online
//    users always get the latest deploy while offline ones still land on
//    a working page instead of the browser's default offline error.
//  - API calls (/api/*): network-only. Write operations made while offline
//    are the offline-sync module's job (IndexedDB queue + Background Sync,
//    see src/lib/offline/*), not the service worker's — mutating requests
//    are typically multipart/non-idempotent and unsafe to blindly replay
//    from a generic fetch-cache layer.
//  - Everything else (images, fonts): stale-while-revalidate.

const CACHE_VERSION = "v1";
const SHELL_CACHE = `selfie-booth-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `selfie-booth-runtime-${CACHE_VERSION}`;

const APP_SHELL_URLS = ["/booth", "/offline", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    return; // network-only; not intercepted
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);
    return cached ?? cache.match("/offline");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cached ?? (await network) ?? Response.error();
}

function isStaticAsset(pathname) {
  return /\.(?:png|jpg|jpeg|svg|webp|avif|woff2?|ico|css|js)$/.test(pathname) || pathname.startsWith("/_next/static/");
}

// Background Sync: the offline queue (src/lib/offline/print-queue-db.ts,
// photo-session-db.ts) registers a sync tag whenever it enqueues work while
// offline. The page itself does the actual upload/print-submission (it has
// the authenticated fetch context); this handler just wakes the app.
self.addEventListener("sync", (event) => {
  if (event.tag === "selfie-booth-sync") {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => client.postMessage({ type: "SYNC_REQUESTED" }));
}
