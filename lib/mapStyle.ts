import type { Map as MapboxMap } from "mapbox-gl";

export const NAFAS_STYLE_URL = "mapbox://styles/mapbox/dark-v11";

/**
 * Runtime repaint of Mapbox dark-v11 into NAFAS cool palette.
 * Wrapped in try/catch per layer so Mapbox style version bumps can't crash us.
 */
export function repaintNafas(map: MapboxMap) {
  const safe = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* layer missing in this style version — ignore */
    }
  };

  safe(() => map.setPaintProperty("background", "background-color", "#070B10"));
  safe(() => map.setPaintProperty("land", "background-color", "#0A0F14"));
  safe(() => map.setPaintProperty("water", "fill-color", "#061628"));
  safe(() => map.setPaintProperty("waterway", "line-color", "#0B2338"));

  // tone down roads / admin boundaries
  for (const id of [
    "road-primary",
    "road-secondary-tertiary",
    "road-street",
    "road-minor",
    "road-motorway-trunk",
    "road-path",
  ]) {
    safe(() => map.setPaintProperty(id, "line-color", "#19222E"));
    safe(() => map.setPaintProperty(id, "line-opacity", 0.55));
  }

  // admin boundaries
  for (const id of ["admin-0-boundary", "admin-1-boundary", "admin-0-boundary-disputed"]) {
    safe(() => map.setPaintProperty(id, "line-color", "#2A3647"));
    safe(() => map.setPaintProperty(id, "line-opacity", 0.4));
  }

  // labels
  for (const id of [
    "settlement-major-label",
    "settlement-minor-label",
    "settlement-subdivision-label",
    "country-label",
    "place-label",
    "water-point-label",
    "water-line-label",
    "natural-point-label",
    "poi-label",
    "airport-label",
  ]) {
    safe(() => map.setPaintProperty(id, "text-color", "#7D8691"));
    safe(() => map.setPaintProperty(id, "text-halo-color", "#0A0F14"));
    safe(() => map.setPaintProperty(id, "text-halo-width", 1.2));
  }

  // hide hillshade (we add our own 3D terrain exaggeration)
  safe(() => map.setLayoutProperty("hillshade", "visibility", "none"));
}
