/**
 * Shared module-level pub/sub for the Cesium viewer instance.
 *
 * CesiumMap and CesiumScene are mounted via `next/dynamic` as separate islands,
 * so a React ref won't cross between them cleanly. Instead, CesiumMap publishes
 * the viewer here on creation, and CesiumScene subscribes.
 */
import type { Viewer } from "cesium";

let current: Viewer | null = null;
const listeners = new Set<(v: Viewer | null) => void>();

export function setViewer(v: Viewer | null) {
  current = v;
  for (const fn of listeners) fn(v);
}

export function getViewer(): Viewer | null {
  return current;
}

export function onViewer(fn: (v: Viewer | null) => void): () => void {
  listeners.add(fn);
  // fire once immediately if already available
  if (current) fn(current);
  return () => listeners.delete(fn);
}
