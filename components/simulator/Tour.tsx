"use client";

import { useEffect, useRef } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { buildTour } from "@/lib/sim/tour";
import { useSim } from "@/lib/sim/store";

interface Props {
  map: MapboxMap | null;
  /** Fires exactly once per mount, once the tour completes. */
  onEnd?: () => void;
}

/**
 * Mounts a GSAP tour driven by {@link buildTour}. Subscribes to tourPaused:
 * when the user taps Deploy (sets paused=false), we tl.resume() and advance.
 */
export function Tour({ map, onEnd }: Props) {
  const tlRef = useRef<ReturnType<typeof buildTour> | null>(null);
  const startedRef = useRef(false);

  // start the tour when the map becomes available
  useEffect(() => {
    if (!map || startedRef.current) return;
    startedRef.current = true;

    // give the map one frame to settle terrain before moving the camera
    const raf = requestAnimationFrame(() => {
      tlRef.current = buildTour(map, {
        onEnd: () => {
          useSim.getState().setSkipped(false);
          onEnd?.();
        },
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      tlRef.current?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // resume when user un-pauses (Deploy button click)
  useEffect(() => {
    const unsub = useSim.subscribe((s, prev) => {
      if (prev.tourPaused && !s.tourPaused && tlRef.current?.paused()) {
        tlRef.current.resume();
      }
    });
    return unsub;
  }, []);

  // skip (jumps to sandbox state)
  useEffect(() => {
    const unsub = useSim.subscribe((s, prev) => {
      if (!prev.tourSkipped && s.tourSkipped && tlRef.current) {
        tlRef.current.progress(1, false);
        tlRef.current.kill();
        useSim.getState().setBeat("sandbox");
        useSim.getState().setYear(2035);
        useSim.getState().setPlume(0.22);
        useSim.getState().setAlgae(1);
        useSim.getState().setOracleZonesRevealed(5);
        useSim.getState().setAminaNotification("clean");
        onEnd?.();
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
