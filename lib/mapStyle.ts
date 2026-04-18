import type { Map as MapboxMap } from "mapbox-gl";

export const NAFAS_STYLE_URL = "mapbox://styles/mapbox/dark-v11";

/**
 * Repaint the live Mapbox dark style into the NAFAS editorial register.
 *
 * Three moves happen here:
 *   1. KILL dual-script noise: force every label to Latin via `name_en` coalesce.
 *      Mapbox's default `{name}` renders both French AND Arabic in the Gulf —
 *      too busy for a monitoring tool. We want one calm label per place.
 *   2. DEEPEN contrast: land darkens toward bg; water gains a teal depth ramp
 *      so the Gulf of Gabès reads as a negative-space hero, not noise.
 *   3. DIMINISH label density: minor POI + neighborhood layers are hidden; only
 *      settlement + major road labels survive at a calm ink tone.
 */
export function repaintNafas(map: MapboxMap) {
  const style = map.getStyle();
  if (!style?.layers) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paint = (layerId: string, key: any, value: unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map.setPaintProperty as any)(layerId, key, value);
    } catch {
      /* wrong layer type for this property — skip */
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layout = (layerId: string, key: any, value: unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map.setLayoutProperty as any)(layerId, key, value);
    } catch {
      /* skip */
    }
  };

  // Latin-preferring label expression. Falls through: name_en → name_fr → name.
  // If the primary `name` is non-Latin (Arabic), we still render name_en/name_fr.
  const latinOnlyTextField = [
    "coalesce",
    ["get", "name_en"],
    ["get", "name_fr"],
    ["get", "name_es"],
    ["get", "name"],
  ];

  // Layers we quietly hide to reduce clutter. Matches against layer id substrings.
  const HIDE_IDS = [
    "poi-",
    "transit-label",
    "airport-label",
    "waterway-label",
    "natural-line-label",
    "natural-point-label",
    "place-neighborhood",
    "place-suburb",
  ];

  for (const layer of style.layers) {
    const id = layer.id.toLowerCase();
    const sourceLayer = (layer as { "source-layer"?: string })["source-layer"]?.toLowerCase() ?? "";
    const type = layer.type;

    // ── water ────────────────────────────────────────────────────────
    if (type === "fill" && (sourceLayer === "water" || id.includes("water"))) {
      paint(layer.id, "fill-color", "#0A2540");
    }
    if (type === "line" && id.includes("water")) {
      paint(layer.id, "line-color", "#123A5E");
      paint(layer.id, "line-opacity", 0.35);
    }

    // ── background / land ───────────────────────────────────────────
    if (type === "background") {
      paint(layer.id, "background-color", "#12192A");
    }
    if (type === "fill" && (sourceLayer === "landuse" || id.includes("land") || id.includes("landcover"))) {
      paint(layer.id, "fill-color", "#141C2E");
      paint(layer.id, "fill-opacity", 0.65);
    }
    if (type === "fill" && sourceLayer === "national_park") {
      paint(layer.id, "fill-color", "#16242E");
      paint(layer.id, "fill-opacity", 0.4);
    }

    // ── hillshade — very subtle, keeps terrain readable on pitch ────
    if (type === "hillshade") {
      paint(layer.id, "hillshade-shadow-color", "#000000");
      paint(layer.id, "hillshade-highlight-color", "#2A3852");
      paint(layer.id, "hillshade-exaggeration", 0.35);
    }

    // ── roads — reduced opacity, cooler tone ────────────────────────
    if (type === "line" && (id.startsWith("road") || sourceLayer === "road" || id.includes("bridge"))) {
      const isMotorway = id.includes("motorway");
      const isPrimary = id.includes("primary") || id.includes("trunk");
      paint(layer.id, "line-color", isMotorway ? "#3B4F70" : isPrimary ? "#2E3E5C" : "#25324B");
      paint(layer.id, "line-opacity", isMotorway ? 0.75 : isPrimary ? 0.55 : 0.35);
    }

    // ── admin boundaries — whisper-thin ─────────────────────────────
    if (type === "line" && id.includes("admin")) {
      paint(layer.id, "line-color", "#3B4F70");
      paint(layer.id, "line-opacity", 0.25);
    }

    // ── labels ──────────────────────────────────────────────────────
    if (type === "symbol") {
      // Hide noisy label classes entirely
      if (HIDE_IDS.some((h) => id.includes(h))) {
        layout(layer.id, "visibility", "none");
        continue;
      }

      // Force Latin-preferring text for every surviving label
      layout(layer.id, "text-field", latinOnlyTextField);

      const isCountry = id.includes("country");
      const isMajorSettlement = id.includes("settlement-major") || id.includes("settlement-subdivision");
      const isState = id.includes("state");
      const isRoadLabel = id.includes("road-label") || id.includes("road_label");

      // Tone per tier — keep most labels recessive; promote only the important ones
      if (isCountry) {
        paint(layer.id, "text-color", "#E4E8EE");
        paint(layer.id, "text-halo-color", "#0A0F14");
        paint(layer.id, "text-halo-width", 1.4);
      } else if (isMajorSettlement || isState) {
        paint(layer.id, "text-color", "#C9CFD8");
        paint(layer.id, "text-halo-color", "#0A0F14");
        paint(layer.id, "text-halo-width", 1.1);
      } else if (isRoadLabel) {
        paint(layer.id, "text-color", "#6A7690");
        paint(layer.id, "text-halo-color", "#0A0F14");
        paint(layer.id, "text-halo-width", 0.8);
        paint(layer.id, "text-opacity", 0.65);
      } else {
        paint(layer.id, "text-color", "#8C94A4");
        paint(layer.id, "text-halo-color", "#0A0F14");
        paint(layer.id, "text-halo-width", 0.9);
        paint(layer.id, "text-opacity", 0.8);
      }
    }
  }
}
