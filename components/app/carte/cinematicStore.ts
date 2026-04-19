"use client";

import { create } from "zustand";
import type { Strategy } from "@/lib/sim/impact";

export interface CinematicProjection {
  year: number;
  co2_kg: number;
  nox_g: number;
  occupants_k: number;
  thermal_c: number;
  cumulative_co2_kg: number;
  cumulative_occupants_k_years: number;
  cumulative_nox_g: number;
}

export interface CinematicOpenPayload {
  placementId: string;
  building: { id: string; name: string; type: string; surface_m2: number; occupants: number } | null;
  strategy: Strategy;
  accent: string;
  components: Record<string, number>;
  location: { lon: number; lat: number };
  /** 1-based placement index (Zone 01…) for chrome consistency. */
  index: number;
}

export interface CinematicState {
  open: CinematicOpenPayload | null;
  loading: boolean;
  error: string | null;
  brief_md: string | null;
  projections: CinematicProjection[];
  model_name: string | null;
  show: (p: CinematicOpenPayload) => void;
  setResult: (r: { brief_md: string | null; projections: CinematicProjection[]; model_name: string | null }) => void;
  setError: (msg: string) => void;
  close: () => void;
}

export const useCinematicStore = create<CinematicState>((set) => ({
  open: null,
  loading: false,
  error: null,
  brief_md: null,
  projections: [],
  model_name: null,
  show: (p) =>
    set({
      open: p,
      loading: true,
      error: null,
      brief_md: null,
      projections: [],
      model_name: null,
    }),
  setResult: (r) =>
    set({
      loading: false,
      brief_md: r.brief_md,
      projections: r.projections,
      model_name: r.model_name,
      error: null,
    }),
  setError: (msg) => set({ loading: false, error: msg }),
  close: () =>
    set({
      open: null,
      loading: false,
      error: null,
      brief_md: null,
      projections: [],
      model_name: null,
    }),
}));
