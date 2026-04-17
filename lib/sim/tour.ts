import gsap from "gsap";
import type { Map as MapboxMap } from "mapbox-gl";
import { BEATS, type BeatDef } from "./beats";
import { useSim } from "./store";

interface BuildTourOptions {
  onBeatStart?: (b: BeatDef) => void;
  onEnd?: () => void;
}

/**
 * Build the GSAP timeline that drives the 4-beat tour:
 * - camera.easeTo per beat
 * - beat id + beatT updates in the store
 * - plume intensity fade during b4
 * - algaeProgress ramp during b4
 * - oracleZonesRevealed staggered during b3
 * - amina notification toggles at b1 start + b4 end
 * - tourPaused true at ~85% of b3; resumes when user sets paused=false
 *
 * Always returns a timeline that plays immediately. Call .kill() to stop.
 */
export function buildTour(map: MapboxMap, opts: BuildTourOptions = {}) {
  const tl = gsap.timeline({
    paused: false,
    onComplete: () => {
      useSim.getState().setBeat("sandbox");
      opts.onEnd?.();
    },
  });

  let cursor = 0;

  for (const beat of BEATS) {
    const startSec = cursor / 1000;
    const durSec = beat.durationMs / 1000;

    // kick off beat: move camera, update beat id, fire onBeatStart
    tl.call(
      () => {
        try {
          map.easeTo({
            center: beat.camera.center,
            zoom: beat.camera.zoom,
            pitch: beat.camera.pitch,
            bearing: beat.camera.bearing,
            duration: beat.durationMs,
            essential: true,
          });
        } catch {
          /* map destroyed mid-tour */
        }
        useSim.getState().setBeat(beat.id);
        useSim.getState().setBeatT(0);
        opts.onBeatStart?.(beat);

        // beat-enter side effects
        if (beat.id === "b1") {
          useSim.getState().setAminaNotification("warning");
          useSim.getState().setOracleZonesRevealed(0);
        }
        if (beat.id === "b2") {
          // plume already on; intensify slightly for drama
          useSim.getState().setPlume(1.15);
        }
        if (beat.id === "b3") {
          useSim.getState().setPlume(1);
          useSim.getState().setAminaNotification("none");
        }
        if (beat.id === "b4") {
          useSim.getState().setOracleZonesRevealed(5);
        }
      },
      undefined,
      startSec,
    );

    // progress tween for beatT
    tl.to(
      { x: 0 },
      {
        x: 1,
        duration: durSec,
        ease: "none",
        onUpdate: function () {
          useSim.getState().setBeatT(this.targets()[0].x as number);
        },
      },
      startSec,
    );

    // b3 — reveal 5 zones, staggered across 0.10 → 0.95 of beat
    if (beat.id === "b3") {
      const revealAt = [0.1, 0.28, 0.46, 0.64, 0.82];
      revealAt.forEach((frac, i) => {
        tl.call(
          () => useSim.getState().setOracleZonesRevealed(i + 1),
          undefined,
          startSec + durSec * frac,
        );
      });

      // pause near the end waiting for Deploy
      tl.call(
        () => useSim.getState().setPaused(true),
        undefined,
        startSec + durSec * 0.86,
      );
      tl.addPause(startSec + durSec * 0.86);
    }

    // b4 — plume fade 1 → 0.18, algae 0 → 1, year 2026 → 2035
    if (beat.id === "b4") {
      tl.to(
        { v: 1 },
        {
          v: 0.18,
          duration: durSec * 0.75,
          ease: "power2.out",
          onUpdate: function () {
            useSim.getState().setPlume(this.targets()[0].v as number);
          },
        },
        startSec + durSec * 0.08,
      );
      tl.to(
        { v: 0 },
        {
          v: 1,
          duration: durSec * 0.78,
          ease: "power1.inOut",
          onUpdate: function () {
            useSim.getState().setAlgae(this.targets()[0].v as number);
          },
        },
        startSec + durSec * 0.1,
      );
      tl.to(
        { v: 2026 },
        {
          v: 2035,
          duration: durSec * 0.9,
          ease: "power1.inOut",
          onUpdate: function () {
            useSim.getState().setYear(Math.round(this.targets()[0].v as number));
          },
        },
        startSec + durSec * 0.05,
      );

      // restore Amina notification to clean near end
      tl.call(
        () => useSim.getState().setAminaNotification("clean"),
        undefined,
        startSec + durSec * 0.86,
      );
    }

    cursor += beat.durationMs;
  }

  return tl;
}
