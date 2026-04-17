"use client";

import { useEffect, useRef, useState } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { IControl, Map as MapboxMap } from "mapbox-gl";
import type { FeatureCollection } from "geojson";
import {
  gctPolygonLayer,
  gctStacksLayer,
  healingLayer,
  landmarksLayer,
  oracleZonesLayer,
  plumeLayer,
  sensorsGlowLayer,
  sensorsLayer,
  type Sensor,
} from "@/lib/layers";
import { useSim } from "@/lib/sim/store";

interface Props {
  map: MapboxMap | null;
  plumeIntensity?: number;
}

export function DeckOverlay({ map, plumeIntensity = 1 }: Props) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [gct, setGct] = useState<FeatureCollection | null>(null);
  const [landmarks, setLandmarks] = useState<FeatureCollection | null>(null);
  const [oracleZones, setOracleZones] = useState<FeatureCollection | null>(null);

  const overlayRef = useRef<MapboxOverlay | null>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/data/sensors.json").then((r) => r.json()),
      fetch("/data/gct.geojson").then((r) => r.json()),
      fetch("/data/landmarks.geojson").then((r) => r.json()),
      fetch("/data/oracle-zones.json").then((r) => r.json()),
    ])
      .then(([s, g, l, oz]) => {
        if (!alive) return;
        setSensors(s);
        setGct(g);
        setLandmarks(l);
        setOracleZones(oz);
      })
      .catch((e) => console.error("[simulator] data load failed", e));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!map || !sensors.length || !gct || !landmarks || !oracleZones) return;

    const overlay = new MapboxOverlay({ layers: [] });
    map.addControl(overlay as unknown as IControl);
    overlayRef.current = overlay;

    const tick = () => {
      tRef.current += 0.04;

      const s = useSim.getState();
      const algae = s.algaeProgress;
      const revealed = s.oracleZonesRevealed;

      overlay.setProps({
        layers: [
          gctPolygonLayer(gct, true),
          plumeLayer(sensors, plumeIntensity, plumeIntensity > 0.03),
          oracleZonesLayer(oracleZones, revealed, tRef.current, revealed > 0),
          healingLayer(oracleZones, algae, algae > 0.01),
          sensorsGlowLayer(sensors, tRef.current, true),
          sensorsLayer(sensors, tRef.current, true),
          gctStacksLayer(gct, tRef.current, true),
          landmarksLayer(landmarks, true),
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
  }, [map, sensors, gct, landmarks, oracleZones, plumeIntensity]);

  return null;
}
