"use client";
import { useEffect, useRef, useState } from "react";
import type * as Cesium from "cesium";
import { onViewer } from "@/lib/cesium-bus";
import { useMonitor } from "@/lib/monitor/store";
import { buildLabels } from "@/lib/monitor3d/buildLabels";

export function TacticalLabels() {
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const resultRef = useRef<{
    entities: Cesium.Entity[];
    dispose: () => void;
  } | null>(null);
  const on = useMonitor((s) => s.activeLayers.labels ?? true);

  useEffect(() => onViewer(setViewer), []);

  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    buildLabels(viewer).then((r) => {
      if (cancelled) {
        r.dispose();
        return;
      }
      resultRef.current = r;
    });
    return () => {
      cancelled = true;
      resultRef.current?.dispose();
      resultRef.current = null;
    };
  }, [viewer]);

  useEffect(() => {
    const r = resultRef.current;
    if (!r) return;
    for (const e of r.entities) e.show = on;
    viewer?.scene.requestRender();
  }, [on, viewer]);

  return null;
}
