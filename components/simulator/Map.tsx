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
}

export function Map({ onReady }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!TOKEN) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: NAFAS_STYLE_URL,
      center: GABES.center,
      zoom: 10.8,
      pitch: 52,
      bearing: -18,
      antialias: true,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("error", (e) => {
      const msg = (e as { error?: { message?: string } }).error?.message ?? "";
      if (msg.includes("does not exist in the map")) {
        // Harmless — our repaint targets a layer this style version removed.
        return;
      }
      console.error("[nafas · mapbox]", e);
    });

    map.on("style.load", () => {
      map.setFog({
        color: "rgb(10, 15, 20)",
        "high-color": "rgb(17, 24, 33)",
        "horizon-blend": 0.18,
        "space-color": "rgb(7, 11, 16)",
        "star-intensity": 0.1,
      });

      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      repaintNafas(map);
      onReady?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
}
