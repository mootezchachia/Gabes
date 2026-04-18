/**
 * Small helper for the ntfy deep-linking flow used in the settings sheet.
 *
 * Strategy:
 *   - Primary: `ntfy://subscribe/<topic>` which the native ntfy app handles.
 *   - Fallback: `https://ntfy.sh/<topic>` which works in any browser + the
 *     ntfy webapp + can be subscribed to from there.
 *
 * We render BOTH as separate controls to avoid the well-known "deep link to
 * app that isn't installed" UX trap on iOS.
 */

export function getNtfyBaseUrl(): string {
  const fromEnv =
    (typeof process !== "undefined" &&
      process.env &&
      process.env.NEXT_PUBLIC_NTFY_URL) ||
    "";
  return (fromEnv || "https://ntfy.sh").replace(/\/+$/, "");
}

export function ntfyWebUrl(topic: string): string {
  return `${getNtfyBaseUrl()}/${encodeURIComponent(topic)}`;
}

export function ntfySubscribeDeepLink(topic: string): string {
  return `ntfy://subscribe/${encodeURIComponent(topic)}`;
}

export const NTFY_APPS = {
  ios: "https://apps.apple.com/app/ntfy/id1625396347",
  android: "https://play.google.com/store/apps/details?id=io.heckel.ntfy",
  desktop: "https://ntfy.sh/app",
} as const;
