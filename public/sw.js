// AgriMobi AI — Service Worker (Phase 8: app shell + connectivity-ping bypass)
//
// Caches the static app shell so the blank app loads when offline.
// Still does NOT cache API/backend responses — that's a future phase,
// once a real backend exists. Phase 8 adds one thing: same-origin
// requests carrying a `?ping=` marker (used by
// services/offline/connectivity.js to check real internet
// reachability) bypass the cache entirely and go straight to the
// network, uncached. Without this, a cached response would make the
// connectivity check always report "online" even with no internet.

const CACHE_NAME = 'agrimobi-shell-v2';

// Core files needed to boot the app shell offline.
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache-first for the app shell; same-origin GET requests are cached
// opportunistically as they're fetched so the shell keeps working
// offline after the first successful load. This does NOT cache API
// calls to a real backend — that remains out of scope until a real
// backend exists.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Connectivity ping: always hit the real network, never the cache,
  // and never fall back to a cached page on failure — the whole point
  // is letting the request genuinely succeed or fail.
  if (url.searchParams.has('ping')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          const isValid = response && response.status === 200;
          if (isValid) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
