"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { NAFAS_STYLE_URL, repaintNafas } from "@/lib/mapStyle";
import { SCOPE_CAMERA, useMonitor } from "@/lib/monitor/store";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (TOKEN) mapboxgl.accessToken = TOKEN;

interface MapProps {
  onReady?: (m: mapboxgl.Map) => void;
}

/**
 * Mediterranean-scope Mapbox basemap for /monitor. Starts at `med` scope.
 * Listens to the monitor store: scope changes trigger flyTo; selectedEvent +
 * flyToToken changes also fly. Zoom/pitch/bearing all controlled by scope.
 *
 * Height-fix note: Mapbox injects `.mapboxgl-map { position: relative }`
 * which overrides Tailwind `absolute inset-0` and collapses height to 0.
 * We use `w-full h-full` + inline `position: absolute` to win specificity.
 */
export function Map({ onReady }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const scope = useMonitor((s) => s.scope);
  const selectedEvent = useMonitor((s) => s.selectedEvent);
  const flyToToken = useMonitor((s) => s.flyToToken);

  // mount
  useEffect(() => {
    if (!containerRef.current) return;
    if (!TOKEN) return;

    const cam = SCOPE_CAMERA.med;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: NAFAS_STYLE_URL,
      center: cam.center,
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: cam.bearing,
      antialias: true,
      attributionControl: false,
      minZoom: 3,
      maxZoom: 15,
    });
    mapRef.current = map;

    map.on("error", (e) => {
      const msg = (e as { error?: { message?: string } }).error?.message ?? "";
      if (msg.includes("does not exist in the map")) return;
      console.error("[nafas · mapbox]", e);
    });

    map.on("style.load", () => {
      map.setFog({
        color: "rgb(18, 26, 38)",
        "high-color": "rgb(10, 15, 20)",
        "horizon-blend": 0.04,
        "space-color": "rgb(6, 10, 15)",
        "star-intensity": 0.05,
      });
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
      repaintNafas(map);
      onReady?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // scope change → easeTo new preset, toggle terrain for gabes scope only
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const cam = SCOPE_CAMERA[scope];
    map.easeTo({
      center: cam.center,
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: cam.bearing,
      duration: 1400,
      essential: true,
    });
    try {
      if (scope === "gabes") {
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.15 });
      } else {
        map.setTerrain(null);
      }
    } catch {
      /* terrain source not yet loaded on first scope change */
    }
  }, [scope]);

  // event selection or explicit flyTo bump
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedEvent) return;
    map.flyTo({
      center: [selectedEvent.lon, selectedEvent.lat],
      zoom: Math.max(map.getZoom(), 9),
      duration: 1400,
      essential: true,
    });
  }, [selectedEvent, flyToToken]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: "absolute", inset: 0 }}
    />
  );
}
