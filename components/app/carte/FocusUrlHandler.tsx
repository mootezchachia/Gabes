"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useToolStore } from "./toolStore";

/** Reads `?focus=<kind>:<id>` and opens the corresponding entity drawer.
 *  Flying to the entity's location is delegated to the Cesium scene (which
 *  subscribes to the selected entity and re-centers when a selection is
 *  recognized). Kept dumb so the shell doesn't need Cesium imports. */
export function FocusUrlHandler() {
  const params = useSearchParams();
  const selectEntity = useToolStore((s) => s.selectEntity);

  useEffect(() => {
    const focus = params.get("focus");
    if (!focus) return;
    const [kind, id] = focus.split(":");
    if (!kind || !id) return;
    if (!["panel", "sensor", "zone", "placement"].includes(kind)) return;
    selectEntity({ kind: kind as "panel" | "sensor" | "zone" | "placement", id });
  }, [params, selectEntity]);

  return null;
}
