"use client";

import { useEffect, useRef, useState } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { IControl, Map as MapboxMap } from "mapbox-gl";
import type { FeatureCollection } from "geojson";
import {
  gctPolygonLayer,
  gctStacksLayer,
  landmarksLayer,
  plumeLayer,
  sensorsGlowLayer,
  sensorsLayer,
  type Sensor,
} from "@/lib/layers";

interface Props {
  map: MapboxMap | null;
  plumeIntensity?: number;
  layersVisible?: {
    plume?: boolean;
    sensors?: boolean;
    gct?: boolean;
    landmarks?: boolean;
  };
}

export function DeckOverlay({
  map,
  plumeIntensity = 1,
  layersVisible,
}: Props) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [gct, setGct] = useState<FeatureCollection | null>(null);
  const [landmarks, setLandmarks] = useState<FeatureCollection | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  // defaults
  const v = {
    plume: layersVisible?.plume ?? true,
    sensors: layersVisible?.sensors ?? true,
    gct: layersVisible?.gct ?? true,
    landmarks: layersVisible?.landmarks ?? true,
  };

  // fetch data once
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/data/sensors.json").then((r) => r.json()),
      fetch("/data/gct.geojson").then((r) => r.json()),
      fetch("/data/landmarks.geojson").then((r) => r.json()),
    ])
      .then(([s, g, l]) => {
        if (!alive) return;
        setSensors(s);
        setGct(g);
        setLandmarks(l);
      })
      .catch((e) => console.error("[simulator] data load failed", e));
    return () => {
      alive = false;
    };
  }, []);

  // attach overlay + render loop
  useEffect(() => {
    if (!map || !sensors.length || !gct || !landmarks) return;

    const overlay = new MapboxOverlay({ layers: [] });
    map.addControl(overlay as unknown as IControl);
    overlayRef.current = overlay;

    const tick = () => {
      tRef.current += 0.04;
      overlay.setProps({
        layers: [
          gctPolygonLayer(gct, v.gct),
          plumeLayer(sensors, plumeIntensity, v.plume),
          sensorsGlowLayer(sensors, tRef.current, v.sensors),
          sensorsLayer(sensors, tRef.current, v.sensors),
          gctStacksLayer(gct, tRef.current, v.gct),
          landmarksLayer(landmarks, v.landmarks),
        ],
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      try {
        map.removeControl(overlay as unknown as IControl);
      } catch {
        /* map already gone */
      }
      overlayRef.current = null;
    };
  }, [map, sensors, gct, landmarks, plumeIntensity, v.plume, v.sensors, v.gct, v.landmarks]);

  return null;
}
