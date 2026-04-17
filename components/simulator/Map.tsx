"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { GABES } from "@/lib/tokens";
import { NAFAS_STYLE_URL, repaintNafas } from "@/lib/mapStyle";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
if (TOKEN) mapboxgl.accessToken = TOKEN;

interface MapProps {
  onReady?: (m: mapboxgl.Map) => void;
  /** When true: minimal map for diagnostics. No repaint, no terrain, pitch 0. */
  safeMode?: boolean;
}

export function Map({ onReady, safeMode = false }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!TOKEN) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: NAFAS_STYLE_URL,
      center: GABES.center,
      zoom: safeMode ? 11.4 : 10.4,
      pitch: safeMode ? 0 : 42,
      bearing: safeMode ? 0 : -18,
      antialias: true,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("error", (e) => {
      const msg = (e as { error?: { message?: string } }).error?.message ?? "";
      if (msg.includes("does not exist in the map")) return;
      console.error("[nafas · mapbox]", e);
    });

    map.on("style.load", () => {
      if (!safeMode) {
        map.setFog({
          color: "rgb(32, 44, 58)",
          "high-color": "rgb(20, 30, 44)",
          "horizon-blend": 0.08,
          "space-color": "rgb(10, 15, 20)",
          "star-intensity": 0.08,
        });

        if (!map.getSource("mapbox-dem")) {
          map.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });
        }
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.15 });

        repaintNafas(map);
      }
      onReady?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeMode]);

  // NB: Mapbox injects `.mapboxgl-map { position: relative }` which overrides
  // Tailwind `absolute inset-0`, collapsing height to 0. Give explicit w/h
  // from the fixed parent instead of relying on inset.
  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: "absolute", inset: 0 }}
    />
  );
}
