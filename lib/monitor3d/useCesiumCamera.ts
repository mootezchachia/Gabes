"use client";

import { useEffect, useState } from "react";
import * as Cesium from "cesium";
import { onViewer } from "@/lib/cesium-bus";

export interface CesiumCameraSnapshot {
  /** Decimal degrees */
  lat: number;
  lon: number;
  /** Metres above ellipsoid */
  alt: number;
  /** Compass heading in degrees (0 = north) */
  heading: number;
  /** Camera pitch in degrees (0 = horizontal, -90 = straight down) */
  pitch: number;
  /** Rough zoom level derived from altitude — keeps the UI readable */
  zoom: number;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function altitudeToZoom(altM: number): number {
  // Derived empirically — good enough for a HUD readout. Low alt = high zoom.
  if (altM <= 0) return 22;
  return Math.max(1, Math.min(22, 22 - Math.log2(altM / 50)));
}

/** Reads camera state from the shared viewer, throttled to ~5fps so
 * readouts stay live without triggering a React re-render every postRender
 * tick (Cesium runs that at ≥60Hz). */
export function useCesiumCamera(): CesiumCameraSnapshot | null {
  const [snap, setSnap] = useState<CesiumCameraSnapshot | null>(null);

  useEffect(() => {
    const MIN_INTERVAL_MS = 200;
    let lastPushed = 0;
    let removeListener: (() => void) | null = null;

    const unsubViewer = onViewer((viewer) => {
      removeListener?.();
      removeListener = null;
      if (!viewer) return;

      const tick = () => {
        const now = performance.now();
        if (now - lastPushed < MIN_INTERVAL_MS) return;
        lastPushed = now;

        const cam = viewer.camera;
        const carto = Cesium.Cartographic.fromCartesian(cam.positionWC);
        setSnap({
          lat: toDeg(carto.latitude),
          lon: toDeg(carto.longitude),
          alt: carto.height,
          heading: ((toDeg(cam.heading) % 360) + 360) % 360,
          pitch: toDeg(cam.pitch),
          zoom: altitudeToZoom(carto.height),
        });
      };
      tick();
      const listener = viewer.scene.postRender.addEventListener(tick);
      removeListener = () => listener();
    });

    return () => {
      unsubViewer();
      removeListener?.();
    };
  }, []);

  return snap;
}

/**
 * Format decimal degrees as D° M′ S″ [N|S|E|W]. Tactical convention.
 */
export function formatDMS(deg: number, axis: "lat" | "lon"): string {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  const hemi = axis === "lat" ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
  return `${d.toString().padStart(2, "0")}° ${m.toString().padStart(2, "0")}′ ${s.toFixed(1).padStart(4, "0")}″ ${hemi}`;
}

export function formatAlt(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} KM`;
  return `${Math.round(m)} M`;
}

export function formatHeading(h: number): string {
  const letters = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(h / 45) % 8;
  return `${h.toFixed(1).padStart(5, "0")}° ${letters[idx]}`;
}
