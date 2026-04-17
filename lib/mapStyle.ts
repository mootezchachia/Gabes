import type { Map as MapboxMap } from "mapbox-gl";

export const NAFAS_STYLE_URL = "mapbox://styles/mapbox/dark-v11";

/**
 * Walk the live style's layers and tint by type / source-layer. We keep the
 * palette DARK but with enough land↔water contrast that the Gulf of Gabès reads
 * clearly at a glance. Land ~#1A2430, water ~#0D2840 — WCAG-grade contrast.
 */
export function repaintNafas(map: MapboxMap) {
  const style = map.getStyle();
  if (!style?.layers) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tint = (layerId: string, key: any, value: unknown) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map.setPaintProperty as any)(layerId, key, value);
    } catch {
      /* wrong layer type for this property — skip */
    }
  };

  for (const layer of style.layers) {
    const id = layer.id.toLowerCase();
    const sourceLayer = (layer as { "source-layer"?: string })["source-layer"]?.toLowerCase() ?? "";
    const type = layer.type;

    // water — teal, readable against land
    if (type === "fill" && (sourceLayer === "water" || id.includes("water"))) {
      tint(layer.id, "fill-color", "#103A5A");
    }
    if (type === "line" && id.includes("water")) {
      tint(layer.id, "line-color", "#1C5580");
    }

    // background / land
    if (type === "background") {
      tint(layer.id, "background-color", "#1A2430");
    }
    if (type === "fill" && (sourceLayer === "landuse" || id.includes("land"))) {
      tint(layer.id, "fill-color", "#1E2A38");
    }

    // roads — brighten for visibility
    if (type === "line" && (id.startsWith("road") || sourceLayer === "road")) {
      tint(layer.id, "line-color", id.includes("motorway") ? "#4A5C76" : "#34425A");
      tint(layer.id, "line-opacity", 0.85);
    }

    // admin boundaries
    if (type === "line" && id.includes("admin")) {
      tint(layer.id, "line-color", "#4A5C76");
      tint(layer.id, "line-opacity", 0.6);
    }

    // labels — bright enough to read
    if (type === "symbol") {
      const isMajor = id.includes("country") || id.includes("settlement-major") || id.includes("state");
      tint(layer.id, "text-color", isMajor ? "#E4E8EE" : "#B0B8C2");
      tint(layer.id, "text-halo-color", "#0A0F14");
      tint(layer.id, "text-halo-width", 1.2);
    }
  }
}
