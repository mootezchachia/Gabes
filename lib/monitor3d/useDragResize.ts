"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  EDGE_SNAP,
  PANEL_CONSTRAINTS,
  PANEL_GRID,
  PanelId,
  usePanelLayout,
} from "./panelLayout";

interface DragState {
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

interface ResizeState {
  startX: number;
  startY: number;
  origW: number;
  origH: number;
}

function snapGrid(v: number): number {
  return Math.round(v / PANEL_GRID) * PANEL_GRID;
}

function magneticEdge(v: number, min: number, max: number): number {
  if (v - min < EDGE_SNAP) return min;
  if (max - v < EDGE_SNAP) return max;
  return v;
}

/**
 * Wires a panel's drag handle (usually its title strip) to the global layout
 * store. Returns handlers to spread on the handle; the panel itself receives
 * its `left/top/width/height` style from the store separately.
 *
 * - Global `locked` state disables dragging.
 * - 8px grid snap.
 * - Magnetic snap to the four viewport edges within 16px.
 * - Bounds-clamped so panels never drift off-screen.
 */
export function usePanelDrag(id: PanelId) {
  const dragRef = useRef<DragState | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (usePanelLayout.getState().locked) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const b = usePanelLayout.getState().positions[id];
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: b.x,
        origY: b.y,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [id],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      const { positions } = usePanelLayout.getState();
      const b = positions[id];
      const W = window.innerWidth;
      const H = window.innerHeight;

      let x = d.origX + (e.clientX - d.startX);
      let y = d.origY + (e.clientY - d.startY);

      x = snapGrid(x);
      y = snapGrid(y);
      x = magneticEdge(x, 0, W - b.w);
      y = magneticEdge(y, 0, H - b.h);
      x = Math.max(0, Math.min(x, W - b.w));
      y = Math.max(0, Math.min(y, H - b.h));

      usePanelLayout.getState().setBounds(id, { x, y });
    },
    [id],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    dragRef.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  // No-op cleanup; pointer capture handles stray moves.
  useEffect(() => () => { dragRef.current = null; }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };
}

/**
 * SE-corner resize handle. Same snap/magnet rules as drag.
 */
export function usePanelResize(id: PanelId) {
  const resizeRef = useRef<ResizeState | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (usePanelLayout.getState().locked) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const b = usePanelLayout.getState().positions[id];
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: b.w,
        origH: b.h,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [id],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const r = resizeRef.current;
      if (!r) return;
      e.preventDefault();
      const { positions } = usePanelLayout.getState();
      const b = positions[id];
      const con = PANEL_CONSTRAINTS[id];
      const W = window.innerWidth;
      const H = window.innerHeight;

      let w = r.origW + (e.clientX - r.startX);
      let h = r.origH + (e.clientY - r.startY);

      w = snapGrid(w);
      h = snapGrid(h);
      w = Math.max(con.minW, con.maxW ? Math.min(w, con.maxW) : w);
      h = Math.max(con.minH, con.maxH ? Math.min(h, con.maxH) : h);
      w = Math.min(w, W - b.x - 4);
      h = Math.min(h, H - b.y - 4);

      usePanelLayout.getState().setBounds(id, { w, h });
    },
    [id],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    resizeRef.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  useEffect(() => () => { resizeRef.current = null; }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };
}
