"use client";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { onViewer } from "@/lib/cesium-bus";
import { useMonitor } from "@/lib/monitor/store";
import { GABES } from "@/lib/tokens";

/**
 * Target-anchored reticle.
 *
 * Reprojects a world-space target (selected event, or GCT as default) to
 * window coordinates every postRender tick and translates a DOM element
 * over it. Hidden when the target is behind the horizon, outside the
 * viewport, or when the Cesium projection returns undefined (near the
 * ellipsoid center).
 *
 * Why DOM + postRender instead of a Cesium billboard:
 *   • tactical bracket / dashed ring aesthetic is hard to do with Cesium
 *     primitives without multiple textures
 *   • we want type / label tight to the reticle — CSS controls that
 *   • postRender reprojection is <0.1ms and stays perfectly in sync
 *     with camera moves, including inertia and flyTo easings
 *
 * Uses Cesium 1.129 `SceneTransforms.worldToWindowCoordinates`
 * (the `wgs84To*` variant was removed in 1.121).
 */
export function TacticalReticle() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const [targetTitle, setTargetTitle] = useState("Tgt · GCT Ghannouch");
  const [targetTone, setTargetTone] = useState<"cyan" | "danger" | "amber">(
    "cyan",
  );

  // Subscribe once — selectedEvent is read via getState to avoid
  // re-subscribing the postRender loop every selection.
  useEffect(() => {
    const unsub = useMonitor.subscribe((s) => {
      if (s.selectedEvent) {
        setTargetTitle(s.selectedEvent.title);
        setTargetTone(
          s.selectedEvent.severity === "high"
            ? "danger"
            : s.selectedEvent.severity === "medium"
              ? "amber"
              : "cyan",
        );
      } else {
        setTargetTitle("Tgt · GCT Ghannouch");
        setTargetTone("danger");
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const WIN = new Cesium.Cartesian2();
    const GCT_POS = Cesium.Cartesian3.fromDegrees(
      GABES.gct[0],
      GABES.gct[1],
      50,
    );
    // Horizon-visibility test via dot-product: target is occluded by the
    // Earth when the angle between (camera → Earth center) and
    // (camera → target) is large enough that the ray grazes the ellipsoid.
    // EllipsoidalOccluder isn't on Cesium's public TS surface in 1.129, so
    // we compute the equivalent scaled-space horizon test inline.
    const SCRATCH_TO_TARGET = new Cesium.Cartesian3();
    const SCRATCH_TO_CENTER = new Cesium.Cartesian3();
    const EARTH_RADIUS_SQ = 6371000 * 6371000;

    let removeListener: (() => void) | null = null;

    const unsub = onViewer((viewer) => {
      removeListener?.();
      if (!viewer) return;

      const tick = () => {
        const root = rootRef.current;
        if (!root) return;

        // Resolve current target from store each frame (cheap — zustand read)
        const sel = useMonitor.getState().selectedEvent;
        const targetPos = sel
          ? Cesium.Cartesian3.fromDegrees(sel.lon, sel.lat, 20)
          : GCT_POS;

        // Horizon check — is the camera–target segment blocked by the Earth?
        const cam = viewer.camera.positionWC;
        Cesium.Cartesian3.subtract(targetPos, cam, SCRATCH_TO_TARGET);
        Cesium.Cartesian3.negate(cam, SCRATCH_TO_CENTER);
        const camDistSq = Cesium.Cartesian3.magnitudeSquared(cam);
        // If camera is inside the Earth, bail
        if (camDistSq < EARTH_RADIUS_SQ) {
          root.style.opacity = "0";
          return;
        }
        const dot = Cesium.Cartesian3.dot(SCRATCH_TO_TARGET, SCRATCH_TO_CENTER);
        const targetLenSq = Cesium.Cartesian3.magnitudeSquared(SCRATCH_TO_TARGET);
        // t = projection parameter of the Earth-center onto the ray cam→target
        const t = dot / targetLenSq;
        if (t > 0 && t < 1) {
          // closest-approach point to Earth center sits ON the segment
          const closestSq =
            camDistSq - (dot * dot) / targetLenSq;
          if (closestSq < EARTH_RADIUS_SQ) {
            // ray is interrupted by the ellipsoid → target occluded
            root.style.opacity = "0";
            return;
          }
        }

        const win = Cesium.SceneTransforms.worldToWindowCoordinates(
          viewer.scene,
          targetPos,
          WIN,
        );
        if (!Cesium.defined(win)) {
          root.style.opacity = "0";
          return;
        }

        const canvas = viewer.scene.canvas;
        const vw = canvas.clientWidth;
        const vh = canvas.clientHeight;
        // Allow a small margin so the reticle doesn't pop at edges
        const margin = 56;
        const offscreen =
          win.x < -margin ||
          win.y < -margin ||
          win.x > vw + margin ||
          win.y > vh + margin;

        root.style.opacity = offscreen ? "0.25" : "1";
        // translate3d → GPU-accelerated, avoids layout thrash
        root.style.transform = `translate3d(${win.x}px, ${win.y}px, 0) translate(-50%, -50%)`;
      };

      tick();
      const remove = viewer.scene.postRender.addEventListener(tick);
      removeListener = () => remove();
    });

    return () => {
      unsub();
      removeListener?.();
    };
  }, []);

  const toneColor =
    targetTone === "danger"
      ? "var(--nafas-danger)"
      : targetTone === "amber"
        ? "var(--nafas-amber)"
        : "var(--nafas-cyan)";

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[28]"
      style={{
        // Hidden until the first tick lands — prevents a 1-frame flash at 0,0
        opacity: 0,
        transform: "translate3d(-9999px, -9999px, 0)",
        transition: "opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform, opacity",
      }}
    >
      {/* dashed target ring */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        style={{ display: "block", color: toneColor }}
      >
        <circle
          cx="40"
          cy="40"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.75"
          strokeDasharray="3 4"
        />
        <circle
          cx="40"
          cy="40"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeOpacity="0.45"
        />
        {/* tiny center dot */}
        <circle cx="40" cy="40" r="1.5" fill="currentColor" />
        {/* tick marks at 0/90/180/270 */}
        <path
          d="M 40 6 L 40 14 M 40 66 L 40 74 M 6 40 L 14 40 M 66 40 L 74 40"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.85"
          strokeLinecap="square"
        />
      </svg>

      {/* bracket corners, slightly outside the ring */}
      <span
        className="absolute top-0 left-0"
        style={{
          width: "10px",
          height: "10px",
          borderColor: toneColor,
          borderStyle: "solid",
          borderWidth: "1px 0 0 1px",
          opacity: 0.8,
        }}
      />
      <span
        className="absolute top-0 right-0"
        style={{
          width: "10px",
          height: "10px",
          borderColor: toneColor,
          borderStyle: "solid",
          borderWidth: "1px 1px 0 0",
          opacity: 0.8,
        }}
      />
      <span
        className="absolute bottom-0 left-0"
        style={{
          width: "10px",
          height: "10px",
          borderColor: toneColor,
          borderStyle: "solid",
          borderWidth: "0 0 1px 1px",
          opacity: 0.8,
        }}
      />
      <span
        className="absolute bottom-0 right-0"
        style={{
          width: "10px",
          height: "10px",
          borderColor: toneColor,
          borderStyle: "solid",
          borderWidth: "0 1px 1px 0",
          opacity: 0.8,
        }}
      />

      {/* label — right-aligned off the reticle */}
      <div
        ref={labelRef}
        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap font-[family-name:var(--font-jetbrains)] text-[9px] tracking-[0.26em] uppercase"
        style={{ color: toneColor }}
      >
        {targetTitle}
      </div>
    </div>
  );
}
