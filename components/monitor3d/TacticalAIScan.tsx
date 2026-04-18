"use client";

import { useEffect, useRef, useState } from "react";
import type * as Cesium from "cesium";
import { onViewer } from "@/lib/cesium-bus";
import { useMonitor } from "@/lib/monitor/store";
import { buildAIScan } from "@/lib/monitor3d/buildAIScan";

/**
 * TacticalAIScan — mounts the ORACLE AI scan entities onto the Cesium viewer
 * and renders a small top-right HUD badge ("ORACLE · v0.3 / SCAN ACTIF · 5
 * zones / phycoremédiation · végétation · confinement"). Badge fades to 40%
 * opacity + monochrome when the layer is toggled off.
 *
 * The `aiScan` flag on `activeLayers` is expected to be added by the
 * integrator; we defensively read `?? true` so this component is safe to
 * mount before the store update lands.
 */
export function TacticalAIScan() {
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const ref = useRef<Awaited<ReturnType<typeof buildAIScan>> | null>(null);
  const on = useMonitor(
    (s) => (s.activeLayers as unknown as { aiScan?: boolean }).aiScan ?? true,
  );

  useEffect(() => onViewer(setViewer), []);

  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    buildAIScan(viewer).then((r) => {
      if (cancelled) {
        r.dispose();
        return;
      }
      ref.current = r;
    });
    return () => {
      cancelled = true;
      ref.current?.dispose();
      ref.current = null;
    };
  }, [viewer]);

  useEffect(() => {
    ref.current?.setActive(on);
  }, [on]);

  const dotColor = on ? "var(--nafas-amber)" : "var(--nafas-ink3)";
  const line1Color = on ? "var(--nafas-amber)" : "var(--nafas-ink3)";
  const line2Color = on ? "var(--nafas-surface)" : "var(--nafas-ink3)";

  return (
    <div
      className={`tac-panel absolute top-20 right-4 z-40 w-[240px] transition-opacity ${
        on ? "opacity-100" : "opacity-40"
      }`}
    >
      {/* amber accent line */}
      <div className="h-[2px] w-full bg-[color:var(--nafas-amber)]/60" />

      <div className="px-3 pt-2.5 pb-2.5 space-y-1.5">
        {/* Line 1 — ORACLE · v0.3 */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={`inline-block size-[7px] rounded-full ${on ? "animate-pulse" : ""}`}
            style={{
              background: dotColor,
              boxShadow: on
                ? "0 0 6px rgba(239,159,39,0.7)"
                : "none",
            }}
          />
          <span
            className="tac-label text-[10px] tracking-[0.28em] uppercase"
            style={{ color: line1Color }}
          >
            ORACLE · v0.3
          </span>
        </div>

        {/* Line 2 — SCAN ACTIF · 5 zones */}
        <div
          className="text-[13px] italic leading-tight"
          style={{
            color: line2Color,
            fontFamily: "var(--font-fraunces), Georgia, serif",
          }}
        >
          {on ? "SCAN ACTIF" : "SCAN INACTIF"} · 5 zones
        </div>

        {/* Line 3 — category chips */}
        <div
          className="tac-label text-[9.5px] tracking-[0.18em]"
          style={{ color: "var(--nafas-ink3)" }}
        >
          phycoremédiation · végétation · confinement
        </div>
      </div>
    </div>
  );
}
