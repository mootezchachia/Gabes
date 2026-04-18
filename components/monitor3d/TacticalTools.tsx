"use client";

import { useCallback } from "react";
import * as Cesium from "cesium";
import { Target, Maximize, Layers, Camera, Compass } from "lucide-react";
import { getViewer } from "@/lib/cesium-bus";
import { GABES } from "@/lib/tokens";

/**
 * Bottom-right tactical tool dock — camera controls + terrain/imagery
 * toggle + screenshot. All buttons share the tac-btn style.
 */
export function TacticalTools() {
  const flyToGabes = useCallback(() => {
    const v = getViewer();
    if (!v) return;
    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        GABES.center[0] - 0.015,
        GABES.center[1] - 0.055,
        3200,
      ),
      orientation: {
        heading: Cesium.Math.toRadians(18),
        pitch: Cesium.Math.toRadians(-38),
        roll: 0,
      },
      duration: 1.6,
    });
  }, []);

  const flyToGCT = useCallback(() => {
    const v = getViewer();
    if (!v) return;
    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(GABES.gct[0] - 0.004, GABES.gct[1] - 0.012, 900),
      orientation: {
        heading: Cesium.Math.toRadians(30),
        pitch: Cesium.Math.toRadians(-32),
        roll: 0,
      },
      duration: 1.8,
    });
  }, []);

  const topDown = useCallback(() => {
    const v = getViewer();
    if (!v) return;
    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(GABES.center[0], GABES.center[1] - 0.02, 8000),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration: 1.6,
    });
  }, []);

  const screenshot = useCallback(() => {
    const v = getViewer();
    if (!v) return;
    v.render();
    const dataUrl = v.scene.canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `nafas-gabes-${Date.now()}.png`;
    a.click();
  }, []);

  return (
    <div className="tac-panel w-full h-full flex items-center overflow-auto">
      <ToolBtn onClick={flyToGabes} label="Vue Gabès" hotkey="R">
        <Compass className="size-[12px]" strokeWidth={1.7} />
      </ToolBtn>
      <div className="tac-divider-v" />
      <ToolBtn onClick={flyToGCT} label="Zoom GCT" hotkey="G">
        <Target className="size-[12px]" strokeWidth={1.7} />
      </ToolBtn>
      <div className="tac-divider-v" />
      <ToolBtn onClick={topDown} label="Plan vertical" hotkey="T">
        <Layers className="size-[12px]" strokeWidth={1.7} />
      </ToolBtn>
      <div className="tac-divider-v" />
      <ToolBtn onClick={screenshot} label="Capture" hotkey="P">
        <Camera className="size-[12px]" strokeWidth={1.7} />
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  onClick,
  label,
  hotkey,
  children,
}: {
  onClick: () => void;
  label: string;
  hotkey: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group flex flex-col items-center gap-1 px-3 py-2 min-w-[64px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-cyan)] hover:bg-[color:var(--nafas-cyan)]/6 transition-colors cursor-pointer"
    >
      {children}
      <span className="tac-label text-[8px] tracking-[0.22em]">
        {label}
      </span>
      <span className="tac-label text-[7.5px] tracking-[0.22em] text-[color:var(--nafas-ink3)]/50">
        [{hotkey}]
      </span>
    </button>
  );
}
