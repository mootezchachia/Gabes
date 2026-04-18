import type { NextConfig } from "next";
import path from "path";

/**
 * Base Next config. The PWA bits live in a separate block below and are
 * applied only in production so dev HMR isn't poisoned by stale SW caches.
 *
 * We deliberately do NOT use `next-pwa`'s auto-generated Workbox worker
 * here — a hand-written `public/sw-dawa.js` is registered by
 * `components/dawa/ServiceWorkerRegister.tsx`. `next-pwa` is kept as a
 * dependency so we can pivot to generated SWs later without a build change.
 */

const baseConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ["cesium"],
  async headers() {
    return [
      {
        source: "/sw-dawa.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default baseConfig;
