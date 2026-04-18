"use client";

import { create } from "zustand";

/**
 * Cinematic intro state.
 *
 *  - `stage` — 0 at the first frame of the fly-in, 1 at the final pose.
 *    Driven by a requestAnimationFrame loop in CesiumMap; consumed by
 *    the boot overlay and IntroGate-wrapped HUD panels to stagger reveals.
 *  - `active` — true while the intro is running; flips to false when the
 *    user skips or the drive completes. localStorage-backed so repeat
 *    visitors skip the intro entirely.
 */

export const INTRO_STORAGE_KEY = "nafas_intro_seen_v1";
export const INTRO_DURATION_MS = 10_000;

interface IntroState {
  stage: number;
  active: boolean;
  durationMs: number;
  setStage: (s: number) => void;
  skip: () => void;
  reset: () => void;
}

function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INTRO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export const useIntro = create<IntroState>((set) => ({
  stage: hasSeenIntro() ? 1 : 0,
  active: !hasSeenIntro(),
  durationMs: INTRO_DURATION_MS,
  setStage: (s) => set({ stage: Math.max(0, Math.min(1, s)) }),
  skip: () => {
    try {
      window.localStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {
      /* localStorage disabled — still skip in-memory */
    }
    set({ stage: 1, active: false });
  },
  reset: () => {
    try {
      window.localStorage.removeItem(INTRO_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    set({ stage: 0, active: true });
  },
}));
