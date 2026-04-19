"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { isTypingTarget } from "@/lib/app/inputTarget";

/**
 * Active admin tool on /app/carte. Stored in Zustand so the Tool Rail, the
 * individual Flow components, and the Cesium click-handler all share
 * the same state without prop-drilling.
 */
export type Tool = "select" | "panel" | "sensor" | "zone" | "ai";

interface ToolState {
  tool: Tool;
  setTool: (t: Tool) => void;
  // Convenience: pending point captured by the Cesium click handler.
  pendingPoint: [number, number] | null;
  setPendingPoint: (p: [number, number] | null) => void;
  // Polygon vertices (draw-zone flow).
  pendingPolygon: Array<[number, number]>;
  addPolygonVertex: (p: [number, number]) => void;
  clearPolygon: () => void;
  closePolygon: () => void;
  polygonClosed: boolean;
  // Entity drawer (click on existing).
  selectedEntity:
    | { kind: "panel" | "sensor" | "zone" | "placement"; id: string }
    | null;
  selectEntity: (e: ToolState["selectedEntity"]) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  tool: "select",
  setTool: (t) => set({ tool: t, pendingPoint: null, pendingPolygon: [], polygonClosed: false }),
  pendingPoint: null,
  setPendingPoint: (p) => set({ pendingPoint: p }),
  pendingPolygon: [],
  addPolygonVertex: (p) =>
    set((s) => ({ pendingPolygon: [...s.pendingPolygon, p] })),
  clearPolygon: () => set({ pendingPolygon: [], polygonClosed: false }),
  closePolygon: () => set({ polygonClosed: true }),
  polygonClosed: false,
  selectedEntity: null,
  selectEntity: (e) => set({ selectedEntity: e }),
}));

/** Keyboard shortcuts for the tool rail (V / P / S / Z / I, Esc). */
export function useToolKeybinds(enabled: boolean) {
  const setTool = useToolStore((s) => s.setTool);
  const selectEntity = useToolStore((s) => s.selectEntity);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      // Bail early for inputs, textareas, Base UI Select comboboxes, dialogs,
      // and any role='textbox' — centralised so every shortcut handler in
      // the app agrees on what "typing" means.
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select");
          break;
        case "p":
          setTool("panel");
          break;
        case "s":
          setTool("sensor");
          break;
        case "z":
          setTool("zone");
          break;
        case "i":
          setTool("ai");
          break;
        case "escape":
          setTool("select");
          selectEntity(null);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, setTool, selectEntity]);
}
