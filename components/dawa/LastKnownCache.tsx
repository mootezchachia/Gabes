"use client";

import { useEffect } from "react";
import type { Reading, Severity } from "@/lib/dawa/types";

/**
 * Writes the current status snapshot to localStorage on every update so the
 * offline page can show a meaningful "dernière lecture il y a X" message
 * without touching the network.
 */
export function LastKnownCache({
  severity,
  driver,
}: {
  severity: Severity;
  driver: Reading | null;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        severity,
        driver,
        at: new Date().toISOString(),
      };
      localStorage.setItem("dawa.lastKnown", JSON.stringify(payload));
    } catch {
      /* quota or privacy mode — ignore */
    }
  }, [severity, driver]);
  return null;
}
