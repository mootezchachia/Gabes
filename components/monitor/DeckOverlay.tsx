"use client";

import { useEffect, useRef, useState } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { IControl, Map as MapboxMap } from "mapbox-gl";
import type { FeatureCollection } from "geojson";
import {
  emittersLayer,
  gctPolygonLayer,
  gctStacksLayer,
  incidentsLayer,
  infraLayer,
  landmarksLayer,
  plumeLayer,
  sensorsGlowLayer,
  sensorsLayer,
  type Sensor,
} from "@/lib/monitor/layers";
import {
  buildPlumeField,
  criticalHaloLayer,
  stepWindField,
  volumetricPlumeLayer,
  windHeadLayer,
  windStreakLayer,
  windVectorForHour,
  type WindParticle,
} from "@/lib/monitor/atmosphere";
import { GABES } from "@/lib/tokens";
import { useMonitor } from "@/lib/monitor/store";

interface Props {
  map: MapboxMap | null;
}

// Tight bbox around Gabès city + coastline for particle flow.
const WIND_BBOX = {
  minLon: 9.95,
  maxLon: 10.26,
  minLat: 33.78,
  maxLat: 33.99,
};

export function DeckOverlay({ map }: Props) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [gct, setGct] = useState<FeatureCollection | null>(null);
  const [landmarks, setLandmarks] = useState<FeatureCollection | null>(null);
  const [emitters, setEmitters] = useState<FeatureCollection | null>(null);
  const [incidents, setIncidents] = useState<FeatureCollection | null>(null);
  const [infra, setInfra] = useState<FeatureCollection | null>(null);

  const overlayRef = useRef<MapboxOverlay | null>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);
  const lastTsRef = useRef<number>(0);
  const particlesRef = useRef<WindParticle[]>([]);

  const layers = useMonitor((s) => s.activeLayers);
  const scope = useMonitor((s) => s.scope);
  const hourOfDay = useMonitor((s) => s.hourOfDay);
  const setSelectedEvent = useMonitor((s) => s.setSelectedEvent);
  const flyTo = useMonitor((s) => s.flyTo);

  // Load all data once
  useEffect(() => {
    let alive = true;
    const fetchJson = async (url: string) => {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    };
    Promise.all([
      fetchJson("/data/sensors.json"),
      fetchJson("/data/gct.geojson"),
      fetchJson("/data/landmarks.geojson"),
      fetchJson("/data/emitters.geojson"),
      fetchJson("/data/incidents.geojson"),
      fetchJson("/data/infra.geojson"),
    ]).then(([s, g, l, em, inc, inf]) => {
      if (!alive) return;
      if (s) setSensors(s);
      if (g) setGct(g);
      if (l) setLandmarks(l);
      if (em) setEmitters(em);
      if (inc) setIncidents(inc);
      if (inf) setInfra(inf);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!map) return;

    const overlay = new MapboxOverlay({
      layers: [],
      onClick: (info) => {
        if (!info.object) return;
        const props = info.object.properties as
          | { id?: string; title?: string; name?: string; body?: string; note?: string; date?: string; severity?: string; source_url?: string }
          | undefined;
        if (!props || !info.coordinate) return;
        const lon = info.coordinate[0] ?? 0;
        const lat = info.coordinate[1] ?? 0;
        const sev: "high" | "medium" | "low" =
          props.severity === "medium" || props.severity === "low" ? props.severity : "high";
        setSelectedEvent({
          id: props.id ?? `pt-${lon.toFixed(3)}-${lat.toFixed(3)}`,
          lon,
          lat,
          title: props.title ?? props.name ?? "Point sélectionné",
          body: props.body ?? props.note ?? "",
          date: props.date ?? new Date().toISOString(),
          severity: sev,
          sourceUrl: props.source_url,
        });
        flyTo();
      },
    });
    map.addControl(overlay as unknown as IControl);
    overlayRef.current = overlay;

    const tick = (now: number) => {
      const prev = lastTsRef.current || now;
      const dt = Math.min(0.05, (now - prev) / 1000); // cap at 50ms to avoid jumps
      lastTsRef.current = now;
      tRef.current += 0.04;
      const t = tRef.current;

      const sensorsVisible = layers.sensors && scope === "gabes";
      const gctVisible = layers.emitters && scope === "gabes";
      const plumeVisible = layers.plume && scope === "gabes";
      const windVisible = layers.wind && scope === "gabes";

      const wv = windVectorForHour(hourOfDay);

      // Step wind particles only if visible (saves work otherwise)
      if (windVisible) {
        particlesRef.current = stepWindField(
          particlesRef.current,
          wv.u,
          wv.v,
          dt,
          WIND_BBOX,
        );
      }

      // Rebuild plume columns each frame (cheap — ~80 cells)
      const plumeCells = plumeVisible
        ? buildPlumeField({
            source: [GABES.gct[0], GABES.gct[1]],
            u: wv.u,
            v: wv.v,
            pulse: t,
          })
        : [];

      overlay.setProps({
        layers: [
          gctVisible && gct ? gctPolygonLayer(gct, true) : null,
          plumeVisible ? plumeLayer(sensors, 1, true) : null,
          plumeVisible ? volumetricPlumeLayer(plumeCells, true) : null,
          layers.emitters && emitters ? emittersLayer(emitters, t, true) : null,
          layers.incidents && incidents ? incidentsLayer(incidents, t, true) : null,
          layers.infra && infra ? infraLayer(infra, true) : null,
          windVisible ? windStreakLayer(particlesRef.current, wv.u, wv.v, true) : null,
          windVisible ? windHeadLayer(particlesRef.current, true) : null,
          sensorsVisible ? criticalHaloLayer(sensors, t, true) : null,
          sensorsVisible ? sensorsGlowLayer(sensors, t, true) : null,
          sensorsVisible ? sensorsLayer(sensors, t, true) : null,
          gctVisible && gct ? gctStacksLayer(gct, t, true) : null,
          layers.infra && scope === "gabes" && landmarks ? landmarksLayer(landmarks, true) : null,
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
  }, [map, sensors, gct, landmarks, emitters, incidents, infra, layers, scope, hourOfDay, setSelectedEvent, flyTo]);

  return null;
}
