import type { Map as MapboxMap } from "mapbox-gl";

export const NAFAS_STYLE_URL = "mapbox://styles/mapbox/dark-v11";

/**
 * Instead of hardcoding layer IDs (which drift across Mapbox style versions and
 * cause noisy `Po._checkLayer` error events), walk the live style and tint
 * layers by their metadata / source-layer / type. Any layer id we don't touch
 * keeps its default dark-v11 paint.
 */
export function repaintNafas(map: MapboxMap) {
  const style = map.getStyle();
  if (!style?.layers) return;

  const tint = (layerId: string, key: string, value: unknown) => {
    try {
      map.setPaintProperty(layerId, key, value as never);
    } catch {
      /* wrong layer type for this property — skip */
    }
  };

  for (const layer of style.layers) {
    const id = layer.id.toLowerCase();
    const sourceLayer = (layer as { "source-layer"?: string })["source-layer"]?.toLowerCase() ?? "";
    const type = layer.type;

    // water — deep moody blue
    if (type === "fill" && (sourceLayer === "water" || id.includes("water"))) {
      tint(layer.id, "fill-color", "#0A2740");
    }
    if (type === "line" && id.includes("water")) {
      tint(layer.id, "line-color", "#11385C");
    }

    // land / land-structure
    if (type === "background") {
      tint(layer.id, "background-color", "#0B121A");
    }
    if (type === "fill" && (sourceLayer === "landuse" || id.includes("land"))) {
      tint(layer.id, "fill-color", "#0D1620");
    }

    // roads — dim but visible
    if (type === "line" && (id.startsWith("road") || sourceLayer === "road")) {
      tint(layer.id, "line-color", id.includes("motorway") ? "#2A3B52" : "#1A2635");
      tint(layer.id, "line-opacity", 0.6);
    }

    // admin boundaries — faint
    if (type === "line" && id.includes("admin")) {
      tint(layer.id, "line-color", "#2A3647");
      tint(layer.id, "line-opacity", 0.45);
    }

    // labels — keep readable
    if (type === "symbol") {
      const isImportant = id.includes("country") || id.includes("settlement-major") || id.includes("state");
      tint(layer.id, "text-color", isImportant ? "#C9CED6" : "#7D8691");
      tint(layer.id, "text-halo-color", "#0A0F14");
      tint(layer.id, "text-halo-width", 1.2);
    }
  }
}
