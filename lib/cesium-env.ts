/**
 * Cesium runtime asset path configuration.
 *
 * Cesium loads its Workers, Widgets, and ThirdParty assets at runtime from
 * `window.CESIUM_BASE_URL`. Our `postinstall` script copies those into
 * `/public/cesium/`, and this module sets the URL before Cesium is imported.
 *
 * MUST be imported before any `import ... from "cesium"` in client code.
 */
declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

if (typeof window !== "undefined" && !window.CESIUM_BASE_URL) {
  window.CESIUM_BASE_URL = "/cesium";
}

export const CESIUM_BASE_URL = "/cesium";
