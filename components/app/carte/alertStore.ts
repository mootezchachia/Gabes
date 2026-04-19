"use client";

import { create } from "zustand";

export interface DangerSensor {
  id: string;
  label: string | null;
  type: string;
  unit: string | null;
  lon: number | null;
  lat: number | null;
}

export interface DangerAlert {
  sensor: DangerSensor;
  value: number;
  threshold: number;
  severity: "warning" | "critical";
  sent_topics: string[];
  /** ISO timestamp. */
  sent_at: string;
  /** Best-effort ntfy topic URL for the first topic. */
  ntfy_url: string | null;
  /** When the alert comes from the simulate endpoint. */
  simulated?: boolean;
}

export interface AlertState {
  current: DangerAlert | null;
  queue: DangerAlert[];
  /** IDs of `ntfy_alert_log` rows already surfaced — polling uses this to
   *  avoid re-firing the cinematic for the same alert on the next tick. */
  seenLogIds: Set<string>;
  show: (a: DangerAlert) => void;
  close: () => void;
  markLogSeen: (ids: string[]) => void;
  hasSeenLog: (id: string) => boolean;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  current: null,
  queue: [],
  seenLogIds: new Set<string>(),
  show: (a) =>
    set((s) => {
      if (s.current) return { queue: [...s.queue, a] };
      return { current: a };
    }),
  close: () =>
    set((s) => {
      if (s.queue.length === 0) return { current: null };
      const [next, ...rest] = s.queue;
      return { current: next, queue: rest };
    }),
  markLogSeen: (ids) =>
    set((s) => {
      const next = new Set(s.seenLogIds);
      for (const id of ids) next.add(id);
      return { seenLogIds: next };
    }),
  hasSeenLog: (id) => get().seenLogIds.has(id),
}));
