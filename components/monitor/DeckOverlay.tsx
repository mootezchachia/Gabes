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
} from "@/lib/monitor/layers";
import { useMonitor } from "@/lib/monitor/store";

interface Props {
  map: MapboxMap | null;
}

/**
 * Monitor deck.gl overlay. Subscribes to the store's `activeLayers` flags
 * and renders only the enabled data layers. New factories (emitters,
 * incidents, infra, wind, s5p) added by Agent F will be slotted in here.
 */
export function DeckOverlay({ map }: Props) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [gct, setGct] = useState<FeatureCollection | null>(null);
  const [landmarks, setLandmarks] = useState<FeatureCollection | null>(null);

  const overlayRef = useRef<MapboxOverlay | null>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  const layers = useMonitor((s) => s.activeLayers);
  const scope = useMonitor((s) => s.scope);

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
      .catch((e) => console.error("[monitor] data load failed", e));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!map || !sensors.length || !gct || !landmarks) return;

    const overlay = new MapboxOverlay({ layers: [] });
    map.addControl(overlay as unknown as IControl);
    overlayRef.current = overlay;

    const tick = () => {
      tRef.current += 0.04;
      const t = tRef.current;
      // Sensors only visible when scoped to Gabès city — at med zoom they'd be
      // illegible clutter.
      const sensorsVisible = layers.sensors && scope === "gabes";
      const gctVisible = layers.emitters;

      overlay.setProps({
        layers: [
          gctVisible ? gctPolygonLayer(gct, true) : null,
          layers.plume ? plumeLayer(sensors, 1, true) : null,
          sensorsVisible ? sensorsGlowLayer(sensors, t, true) : null,
          sensorsVisible ? sensorsLayer(sensors, t, true) : null,
          gctVisible ? gctStacksLayer(gct, t, true) : null,
          layers.infra ? landmarksLayer(landmarks, true) : null,
        ].filter(Boolean),
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
  }, [map, sensors, gct, landmarks, layers, scope]);

  return null;
}
