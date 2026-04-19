"use client";

// Must be first — sets window.CESIUM_BASE_URL before Cesium is imported.
import "@/lib/cesium-env";

import { useEffect } from "react";
import * as Cesium from "cesium";
import { onViewer } from "@/lib/cesium-bus";
import { useToolStore } from "./toolStore";

/**
 * Subscribes to the shared Cesium viewer and wires click events to the
 * active tool. The viewer publishes itself into `lib/cesium-bus.ts`; we
 * read it here and route each click to the active tool's handler.
 *
 * This file imports `cesium` at module level — the CarteScene wrapper
 * dynamic-imports us with `ssr: false` so the whole module graph (including
 * the KML `@zip.js/zip.js` leaf) is excluded from the server bundle and
 * matched with the existing monitor3d configuration.
 */
export function CesiumClickBridge() {
  const tool = useToolStore((s) => s.tool);
  const setPendingPoint = useToolStore((s) => s.setPendingPoint);
  const addPolygonVertex = useToolStore((s) => s.addPolygonVertex);
  const closePolygon = useToolStore((s) => s.closePolygon);
  const selectEntity = useToolStore((s) => s.selectEntity);

  useEffect(() => {
    let unsubscribeBus: (() => void) | null = null;
    let handler: Cesium.ScreenSpaceEventHandler | null = null;

    unsubscribeBus = onViewer((viewer) => {
      if (!viewer) return;

      if (handler) handler.destroy();

      const h = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler = h;

      const pick = (screen: Cesium.Cartesian2): [number, number] | null => {
        const ray = viewer.camera.getPickRay(screen);
        if (!ray) return null;
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        if (!cartesian) return null;
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        return [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)];
      };

      h.setInputAction((event: { position: Cesium.Cartesian2 }) => {
        const current = useToolStore.getState().tool;

        const picked = viewer.scene.pick(event.position) as
          | { id?: { _nafas_kind?: string; _nafas_id?: string } }
          | undefined;
        if (picked?.id && typeof picked.id === "object") {
          const meta = picked.id;
          if (meta._nafas_kind && meta._nafas_id) {
            selectEntity({
              kind: meta._nafas_kind as "panel" | "sensor" | "zone" | "placement",
              id: meta._nafas_id,
            });
            return;
          }
        }

        const ll = pick(event.position);
        if (!ll) return;

        if (current === "panel" || current === "sensor") {
          setPendingPoint(ll);
        } else if (current === "zone") {
          addPolygonVertex(ll);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      h.setInputAction(() => {
        const current = useToolStore.getState().tool;
        if (current === "zone") {
          const verts = useToolStore.getState().pendingPolygon;
          if (verts.length >= 3) closePolygon();
        }
      }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    });

    return () => {
      unsubscribeBus?.();
      if (handler) handler.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const container = document.querySelector(".cesium-widget canvas") as HTMLElement | null;
    if (!container) return;
    container.style.cursor =
      tool === "panel" || tool === "sensor" || tool === "zone" ? "crosshair" : "";
    return () => {
      if (container) container.style.cursor = "";
    };
  }, [tool]);

  return null;
}
