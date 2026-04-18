import { create } from "zustand";

export type Scope = "med" | "tunisia" | "gabes";
export type Timeframe = "1H" | "6H" | "24H" | "48H" | "7J" | "30J" | "1A" | "TOUT";
export type Severity = "CRIT" | "ALERTE" | "SURV" | "STABLE";

export interface LayerFlags {
  plume: boolean;       // Sentinel-5P SO₂ raster
  emitters: boolean;    // Industrial sites dots
  sensors: boolean;     // NAFAS 42 sensors (only visible >z10)
  incidents: boolean;   // Historical events
  infra: boolean;       // Schools + hospitals
  wind: boolean;        // Wind field
}

export interface SelectedEvent {
  id: string;
  lon: number;
  lat: number;
  title: string;
  body: string;
  date: string;
  severity: "high" | "medium" | "low";
  sourceUrl?: string;
}

interface MonitorState {
  scope: Scope;
  timeframe: Timeframe;
  activeLayers: LayerFlags;

  crisisMessage: string | null;  // Top-bar ribbon text
  hoveredCity: string | null;    // Posture row hover → map highlight
  selectedEvent: SelectedEvent | null;
  flyToToken: number;            // Monotonic counter; bump to trigger a map.flyTo

  audioMuted: boolean;
  aminaModalOpen: boolean;

  /** 0.0–24.0 float, local Gabès time. Drives TimeStrip scrubber + plume tinting. */
  hourOfDay: number;
  timePlaying: boolean;
  audience: "habitant" | "medecin" | "gct" | "architecte" | "municipalite";
  /** Which on-demand glass drawer is open, if any */
  drawer: "sensors" | "events" | "brief" | null;
  /** Whether the cold-open intro has played this visit */
  introPlayed: boolean;

  setScope: (s: Scope) => void;
  setTimeframe: (t: Timeframe) => void;
  toggleLayer: (k: keyof LayerFlags) => void;
  setCrisisMessage: (m: string | null) => void;
  setHoveredCity: (c: string | null) => void;
  setSelectedEvent: (e: SelectedEvent | null) => void;
  flyTo: () => void;
  setAudioMuted: (m: boolean) => void;
  setAminaModalOpen: (o: boolean) => void;
  setHourOfDay: (h: number) => void;
  setTimePlaying: (p: boolean) => void;
  setAudience: (a: MonitorState["audience"]) => void;
  setDrawer: (d: MonitorState["drawer"]) => void;
  setIntroPlayed: (p: boolean) => void;
}

export const useMonitor = create<MonitorState>((set) => ({
  scope: "med",
  timeframe: "48H",
  activeLayers: {
    plume: true,
    emitters: true,
    sensors: true,
    incidents: true,
    infra: false,
    wind: true,
  },
  crisisMessage: "GCT Ghannouch · plume SO₂ actif · 340 µg/m³",
  hoveredCity: null,
  selectedEvent: null,
  flyToToken: 0,
  audioMuted: true,
  aminaModalOpen: false,

  hourOfDay: 14.5,
  timePlaying: false,
  audience: "habitant",
  drawer: null,
  introPlayed: false,

  setScope: (s) => set({ scope: s }),
  setTimeframe: (t) => set({ timeframe: t }),
  toggleLayer: (k) =>
    set((s) => ({ activeLayers: { ...s.activeLayers, [k]: !s.activeLayers[k] } })),
  setCrisisMessage: (m) => set({ crisisMessage: m }),
  setHoveredCity: (c) => set({ hoveredCity: c }),
  setSelectedEvent: (e) => set({ selectedEvent: e }),
  flyTo: () => set((s) => ({ flyToToken: s.flyToToken + 1 })),
  setAudioMuted: (m) => set({ audioMuted: m }),
  setAminaModalOpen: (o) => set({ aminaModalOpen: o }),
  setHourOfDay: (h) => set({ hourOfDay: Math.max(0, Math.min(24, h)) }),
  setTimePlaying: (p) => set({ timePlaying: p }),
  setAudience: (a) => set({ audience: a }),
  setDrawer: (d) => set({ drawer: d }),
  setIntroPlayed: (p) => set({ introPlayed: p }),
}));

// Camera presets per scope
export const SCOPE_CAMERA: Record<
  Scope,
  { center: [number, number]; zoom: number; pitch: number; bearing: number }
> = {
  med: { center: [13, 36], zoom: 5.2, pitch: 0, bearing: 0 },
  tunisia: { center: [9.8, 34.2], zoom: 6.4, pitch: 0, bearing: 0 },
  gabes: { center: [10.09, 33.88], zoom: 10.6, pitch: 42, bearing: -18 },
};
