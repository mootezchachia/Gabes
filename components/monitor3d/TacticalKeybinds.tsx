"use client";

import { useEffect } from "react";
import * as Cesium from "cesium";
import { getViewer } from "@/lib/cesium-bus";
import { useMonitor } from "@/lib/monitor/store";
import { GABES } from "@/lib/tokens";
import { isTypingTarget } from "@/lib/app/inputTarget";

/**
 * Registers tactical keybinds:
 *   R — reset camera to Gabès default view
 *   G — fly to GCT
 *   T — top-down plan
 *   P — screenshot
 *   L — toggle plume
 *   V — toggle wind
 *   C — toggle sensors
 *   SPACE — toggle play/pause on the timeline
 *   M — toggle mute
 * Also renders a faint legend strip bottom-center (above the timeline).
 */
export function TacticalKeybinds() {
  const setPlaying = useMonitor((s) => s.setTimePlaying);
  const toggleLayer = useMonitor((s) => s.toggleLayer);
  const setMuted = useMonitor((s) => s.setAudioMuted);

  useEffect(() => {
    const screenshot = () => {
      const v = getViewer();
      if (!v) return;
      v.render();
      const dataUrl = v.scene.canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `nafas-gabes-${Date.now()}.png`;
      a.click();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const v = getViewer();
      switch (e.key.toLowerCase()) {
        case " ": {
          e.preventDefault();
          setPlaying(!useMonitor.getState().timePlaying);
          break;
        }
        case "r": {
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
          break;
        }
        case "g": {
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
          break;
        }
        case "t": {
          if (!v) return;
          v.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(GABES.center[0], GABES.center[1] - 0.02, 8000),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
            duration: 1.6,
          });
          break;
        }
        case "p":
          screenshot();
          break;
        case "l":
          toggleLayer("plume");
          break;
        case "v":
          toggleLayer("wind");
          break;
        case "c":
          toggleLayer("sensors");
          break;
        case "m":
          setMuted(!useMonitor.getState().audioMuted);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPlaying, toggleLayer, setMuted]);

  return (
    <div className="absolute bottom-[96px] right-4 z-30 pointer-events-none">
      <div className="tac-label text-[8px] text-[color:var(--nafas-ink3)]/45 tracking-[0.28em] text-right leading-[1.8]">
        <div>[1-5] AUDIENCE</div>
        <div>[SPACE] PLAY/PAUSE</div>
        <div>[L] PLUME · [V] VENT · [C] CAPTEURS</div>
        <div>[R] RESET · [G] GCT · [T] TOP · [P] CAPTURE</div>
        <div>[M] MUTE</div>
      </div>
    </div>
  );
}
