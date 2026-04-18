"use client";

import { create } from "zustand";

/**
 * Layout store for the movable HUD panels.
 *
 *  - `positions` — per-panel x/y/w/h in pixels (top-left origin, viewport coords).
 *  - `visibility` — per-panel show/hide.
 *  - `locked` — global; when true, panels can't be dragged or resized.
 *
 * Defaults are computed from the viewport size on first hydration so a wide
 * screen lays the chrome out sensibly. User positions+sizes persist in
 * localStorage under `nafas_panel_layout_v1`.
 */

export const LAYOUT_STORAGE_KEY = "nafas_panel_layout_v1";
export const PANEL_GRID = 8;
export const EDGE_SNAP = 16;

export type PanelId =
  | "layers"
  | "atmosphere"
  | "legend"
  | "tools"
  | "inspect"
  | "timeline"
  | "audienceRail"
  | "aiScan";

export interface PanelBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PanelConstraints {
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
  resizable?: boolean;
}

export const PANEL_CONSTRAINTS: Record<PanelId, PanelConstraints> = {
  layers:       { minW: 240, minH: 140,               resizable: true },
  atmosphere:   { minW: 220, minH: 150,               resizable: true },
  legend:       { minW: 180, minH: 140,               resizable: true },
  tools:        { minW: 180, minH: 48,  maxH: 96,     resizable: true },
  inspect:      { minW: 240, minH: 140,               resizable: true },
  timeline:     { minW: 560, minH: 84,  maxH: 140,    resizable: true },
  audienceRail: { minW: 160, minH: 140,               resizable: true },
  aiScan:       { minW: 220, minH: 140,               resizable: true },
};

export const PANEL_LABELS: Record<PanelId, string> = {
  layers:       "Couches",
  atmosphere:   "Atmosphère",
  legend:       "Légende",
  tools:        "Outils",
  inspect:      "Inspection",
  timeline:     "Timeline",
  audienceRail: "Publics",
  aiScan:       "Scan IA",
};

interface LayoutState {
  positions: Record<PanelId, PanelBounds>;
  visibility: Record<PanelId, boolean>;
  locked: boolean;
  hydrated: boolean;

  hydrate: () => void;
  setBounds: (id: PanelId, b: Partial<PanelBounds>) => void;
  toggleVisibility: (id: PanelId) => void;
  setVisibility: (id: PanelId, v: boolean) => void;
  toggleLock: () => void;
  reset: () => void;
}

function defaultBounds(w: number, h: number): Record<PanelId, PanelBounds> {
  // Measurements tuned against a 1440×900 baseline; viewport-clamped below.
  const right = (panelW: number, offset: number) => w - panelW - offset;
  const bottom = (panelH: number, offset: number) => h - panelH - offset;
  return {
    audienceRail: { x: 16,               y: 220,                w: 178, h: 230 },
    layers:       { x: 16,               y: bottom(220, 16),    w: 300, h: 220 },
    atmosphere:   { x: right(252, 16),   y: 92,                 w: 252, h: 198 },
    legend:       { x: right(212, 16),   y: 300,                w: 212, h: 240 },
    tools:        { x: right(220, 16),   y: bottom(64, 16),     w: 220, h: 64  },
    inspect:      { x: right(272, 16),   y: 560,                w: 272, h: 180 },
    timeline:     { x: Math.max(280, (w - 720) / 2), y: bottom(108, 16), w: 720, h: 96 },
    aiScan:       { x: 16,               y: 76,                 w: 240, h: 132 },
  };
}

function defaultVisibility(): Record<PanelId, boolean> {
  return {
    layers: true,
    atmosphere: true,
    legend: true,
    tools: true,
    inspect: true,
    timeline: true,
    audienceRail: true,
    aiScan: true,
  };
}

interface PersistedLayout {
  positions: Record<PanelId, PanelBounds>;
  visibility: Record<PanelId, boolean>;
}

function readPersisted(): PersistedLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedLayout;
  } catch {
    return null;
  }
}

function writePersisted(state: PersistedLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

// Server-side render uses 1440×900 defaults. Real bounds are computed on hydrate().
const SSR_W = 1440;
const SSR_H = 900;

export const usePanelLayout = create<LayoutState>((set, get) => ({
  positions: defaultBounds(SSR_W, SSR_H),
  visibility: defaultVisibility(),
  locked: true,
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    if (get().hydrated) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const freshDefaults = defaultBounds(w, h);
    const persisted = readPersisted();
    const positions = persisted?.positions
      ? { ...freshDefaults, ...persisted.positions }
      : freshDefaults;
    const visibility = persisted?.visibility
      ? { ...defaultVisibility(), ...persisted.visibility }
      : defaultVisibility();
    // Clamp any persisted positions to current viewport
    for (const id of Object.keys(positions) as PanelId[]) {
      const b = positions[id];
      const con = PANEL_CONSTRAINTS[id];
      const clampedW = Math.max(con.minW, Math.min(b.w, w - 16));
      const clampedH = Math.max(con.minH, Math.min(b.h, h - 16));
      const clampedX = Math.max(0, Math.min(b.x, w - clampedW));
      const clampedY = Math.max(0, Math.min(b.y, h - clampedH));
      positions[id] = { x: clampedX, y: clampedY, w: clampedW, h: clampedH };
    }
    set({ positions, visibility, hydrated: true });
  },

  setBounds: (id, b) => {
    set((s) => {
      const next = { ...s.positions, [id]: { ...s.positions[id], ...b } };
      writePersisted({ positions: next, visibility: s.visibility });
      return { positions: next };
    });
  },

  toggleVisibility: (id) => {
    set((s) => {
      const next = { ...s.visibility, [id]: !s.visibility[id] };
      writePersisted({ positions: s.positions, visibility: next });
      return { visibility: next };
    });
  },

  setVisibility: (id, v) => {
    set((s) => {
      const next = { ...s.visibility, [id]: v };
      writePersisted({ positions: s.positions, visibility: next });
      return { visibility: next };
    });
  },

  toggleLock: () => set((s) => ({ locked: !s.locked })),

  reset: () => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const fresh = defaultBounds(w, h);
    const vis = defaultVisibility();
    writePersisted({ positions: fresh, visibility: vis });
    set({ positions: fresh, visibility: vis });
  },
}));
