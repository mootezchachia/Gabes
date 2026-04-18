"use client";

import { useEffect } from "react";

/**
 * Registers /sw-dawa.js (custom, hand-written) on mount.
 *
 * We intentionally don't use `next-pwa`'s auto-registration; a hand-written
 * service worker is small and easier to audit for this app. The SW handles
 * shell caching + offline fallback only (no Web Push — ntfy handles that).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // In dev, skip to avoid stale caches biting us between HMR reloads.
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw-dawa.js", { scope: "/dawa" })
        .catch(() => {
          /* swallow — offline support is best-effort */
        });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
