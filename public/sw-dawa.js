/**
 * HealiX · Dawa' — hand-rolled service worker.
 *
 * Scope: /dawa
 * Strategy:
 *   - Precache the /dawa shell + manifest + icons + offline fallback.
 *   - Runtime cache for Supabase REST GETs using stale-while-revalidate
 *     (5 min freshness).
 *   - Runtime cache for static /_next/static/* with cache-first.
 *   - On navigation failures (offline), serve /dawa/offline.
 *
 * Intentionally no Web Push handling — ntfy owns alerts on device.
 */

/* eslint-disable no-restricted-globals */

// BUMP VERSION on every deploy that changes precached files or routing.
// A convenient pattern: suffix with a short git short-sha or a date tag.
const VERSION = "dawa-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/dawa",
  "/dawa/offline",
  "/manifest.webmanifest",
  "/icons/dawa-192.png",
  "/icons/dawa-512.png",
  "/icons/dawa-maskable-512.png",
];

const SUPABASE_URL = (self.registration && self.registration.scope) || "";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        // Ignore per-URL failures — e.g. a page not yet deployed on first install.
        Promise.all(
          PRECACHE_URLS.map((u) =>
            cache
              .add(new Request(u, { credentials: "same-origin" }))
              .catch(() => undefined),
          ),
        ),
      )
      // Chain skipWaiting inside waitUntil so the SW doesn't start intercepting
      // before the shell cache is populated (Safari-safe).
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE]);
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (keep.has(k) ? undefined : caches.delete(k))),
      );
      await self.clients.claim();
    })(),
  );
});

async function staleWhileRevalidate(request, cacheName, maxAgeMs) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const now = Date.now();
  const fresh = (async () => {
    try {
      const resp = await fetch(request);
      if (resp && resp.ok) {
        const meta = new Response(resp.clone().body, {
          status: resp.status,
          statusText: resp.statusText,
          headers: new Headers({
            ...Object.fromEntries(resp.headers.entries()),
            "x-dawa-cached-at": String(now),
          }),
        });
        cache.put(request, meta);
      }
      return resp;
    } catch (err) {
      return null;
    }
  })();
  if (cached) {
    const cachedAt = Number(cached.headers.get("x-dawa-cached-at") || 0);
    if (!maxAgeMs || now - cachedAt < maxAgeMs) {
      // Kick off background revalidation but respond from cache.
      fresh.catch(() => undefined);
      return cached;
    }
  }
  const net = await fresh;
  if (net) return net;
  if (cached) return cached;
  return Response.error();
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Same-origin navigations — network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          return net;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const offline =
            (await cache.match("/dawa/offline")) ||
            (await cache.match("/dawa"));
          if (offline) return offline;
          return new Response("Offline", { status: 503 });
        }
      })(),
    );
    return;
  }

  // Next.js static bundles — cache-first.
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.webmanifest")
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Supabase REST (both /rest/v1/ and /auth/v1/). SWR with 5 min freshness.
  if (
    url.hostname.endsWith(".supabase.co") ||
    url.hostname.endsWith(".supabase.in")
  ) {
    if (url.pathname.startsWith("/rest/v1/")) {
      event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE, 5 * 60_000));
      return;
    }
  }

  // Our own API routes for the /dawa experience — SWR 2 min.
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/api/dawa/")
  ) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE, 2 * 60_000));
    return;
  }
  // Fall-through: default browser handling.
});

// Silence "message" channel warnings; no push handling.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
