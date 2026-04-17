import { create } from "zustand";

export type Scenario = "continuation" | "oracle" | "custom";
export type BeatId = "b1" | "b2" | "b3" | "b4" | "sandbox";

interface SimState {
  beat: BeatId;
  beatT: number; // 0..1 within current beat
  year: number; // 2026..2050
  scenario: Scenario;
  plumeIntensity: number; // 0..1+
  algaeProgress: number; // 0..1 during b4
  oracleZonesRevealed: number; // 0..5 during b3
  tourPaused: boolean;
  tourSkipped: boolean;
  audioMuted: boolean;
  aminaNotification: "none" | "warning" | "clean";

  setBeat: (b: BeatId) => void;
  setBeatT: (t: number) => void;
  setYear: (y: number) => void;
  setScenario: (s: Scenario) => void;
  setPlume: (p: number) => void;
  setAlgae: (a: number) => void;
  setOracleZonesRevealed: (n: number) => void;
  setPaused: (p: boolean) => void;
  setSkipped: (s: boolean) => void;
  setAudioMuted: (m: boolean) => void;
  setAminaNotification: (n: "none" | "warning" | "clean") => void;
  resetTour: () => void;
}

export const useSim = create<SimState>((set) => ({
  beat: "b1",
  beatT: 0,
  year: 2026,
  scenario: "oracle",
  plumeIntensity: 1,
  algaeProgress: 0,
  oracleZonesRevealed: 0,
  tourPaused: false,
  tourSkipped: false,
  audioMuted: true,
  aminaNotification: "none",

  setBeat: (b) => set({ beat: b }),
  setBeatT: (t) => set({ beatT: t }),
  setYear: (y) => set({ year: y }),
  setScenario: (s) => set({ scenario: s }),
  setPlume: (p) => set({ plumeIntensity: p }),
  setAlgae: (a) => set({ algaeProgress: a }),
  setOracleZonesRevealed: (n) => set({ oracleZonesRevealed: n }),
  setPaused: (p) => set({ tourPaused: p }),
  setSkipped: (s) => set({ tourSkipped: s }),
  setAudioMuted: (m) => set({ audioMuted: m }),
  setAminaNotification: (n) => set({ aminaNotification: n }),
  resetTour: () =>
    set({
      beat: "b1",
      beatT: 0,
      year: 2026,
      plumeIntensity: 1,
      algaeProgress: 0,
      oracleZonesRevealed: 0,
      tourPaused: false,
      tourSkipped: false,
      aminaNotification: "none",
    }),
}));
