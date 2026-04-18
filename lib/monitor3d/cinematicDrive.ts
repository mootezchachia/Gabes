import * as Cesium from "cesium";
import { GABES } from "@/lib/tokens";
import { useIntro } from "./introStore";

/**
 * Drives a 10s cinematic "from-space to Gabès" camera tween using a
 * requestAnimationFrame loop. Publishes the normalized stage (0..1) to
 * `useIntro` each frame so the HUD boot overlay + IntroGate-wrapped
 * panels can reveal in lockstep.
 *
 * The intro is *skippable*: if `useIntro.skip()` is called (Esc or button),
 * the driver cancels, snaps the camera to the final pose, hides stars,
 * and exits cleanly.
 */
export function startCinematicDrive(viewer: Cesium.Viewer): () => void {
  const durationMs = useIntro.getState().durationMs;

  // Start far out, with Gabès roughly under the viewing axis at a
  // near-top-down pitch. End at the production Gabès pose.
  const start = {
    lon: GABES.center[0] - 4.5,
    lat: GABES.center[1] - 12,
    alt: 20_000_000,
    heading: 0,
    pitch: -88,
  };
  const end = {
    lon: GABES.center[0] - 0.015,
    lat: GABES.center[1] - 0.055,
    alt: 3200,
    heading: 18,
    pitch: -38,
  };

  let frameHandle: number | null = null;
  let cancelled = false;
  const t0 = performance.now();

  const snapToEnd = () => {
    try {
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(end.lon, end.lat, end.alt),
        orientation: {
          heading: Cesium.Math.toRadians(end.heading),
          pitch: Cesium.Math.toRadians(end.pitch),
          roll: 0,
        },
      });
      viewer.scene.skyBox.show = false;
    } catch {
      /* viewer destroyed */
    }
  };

  // Watch for external skip — snap + cancel RAF
  const unsubStore = useIntro.subscribe((s, prev) => {
    if (prev.active && !s.active) {
      cancelled = true;
      if (frameHandle !== null) cancelAnimationFrame(frameHandle);
      snapToEnd();
    }
  });

  const tick = (now: number) => {
    if (cancelled) return;
    const raw = Math.min(1, (now - t0) / durationMs);

    const eAlt = easeOutCubic(raw);
    const ePos = easeInOutCubic(raw);
    const ePitch = easeInOutCubic(raw);

    const lon = lerp(start.lon, end.lon, ePos);
    const lat = lerp(start.lat, end.lat, ePos);
    const alt = lerp(start.alt, end.alt, eAlt);
    const heading = lerp(start.heading, end.heading, raw); // linear — planet-spin feel
    const pitch = lerp(start.pitch, end.pitch, ePitch);

    try {
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        orientation: {
          heading: Cesium.Math.toRadians(heading),
          pitch: Cesium.Math.toRadians(pitch),
          roll: 0,
        },
      });
    } catch {
      cancelled = true;
      return;
    }

    useIntro.getState().setStage(raw);

    // Fade stars as we dip into the atmosphere
    if (raw > 0.7 && viewer.scene.skyBox.show) {
      viewer.scene.skyBox.show = false;
    }

    if (raw < 1) {
      frameHandle = requestAnimationFrame(tick);
    } else {
      unsubStore();
      useIntro.getState().skip();
    }
  };

  frameHandle = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);
    unsubStore();
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
