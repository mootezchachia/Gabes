import type { Reading, Severity, Threshold } from "./types";

/**
 * Rank severity ordinally so we can take a "max" across many readings.
 */
const RANK: Record<Severity, number> = { unknown: -1, ok: 0, warning: 1, critical: 2 };

export function severityForReading(value: number, t: Threshold): Severity {
  if (typeof t.critical === "number" && value >= t.critical) return "critical";
  if (typeof t.warning === "number" && value >= t.warning) return "warning";
  return "ok";
}

/**
 * Compute the worst severity across a set of current readings.
 *
 * Each reading carries its own threshold JSON (mirrors sensors.thresholds).
 * An optional thresholds override map lets callers inject sensor-type
 * defaults (e.g. when a particular sensor row didn't define a threshold).
 */
export function computeSeverity(
  readings: Reading[],
  thresholdsByType: Record<string, Threshold> = {},
  opts: { expectedSensors?: number; maxReadingAgeMs?: number } = {},
): Severity {
  const expected = opts.expectedSensors ?? readings.length;
  const maxAge = opts.maxReadingAgeMs ?? 30 * 60 * 1000; // 30 min stale cutoff
  const now = Date.now();

  // Filter to readings fresh enough to trust.
  const fresh = readings.filter((r) => {
    const t = new Date(r.takenAt).getTime();
    return Number.isFinite(t) && now - t <= maxAge;
  });

  // If we expected sensors but none have fresh readings, state is unknown —
  // do NOT default to "ok" (which would show a green ring over a dead network).
  if (expected > 0 && fresh.length === 0) return "unknown";

  // If we weren't expecting any sensors (no home location set), still "ok".
  if (expected === 0 && fresh.length === 0) return "ok";

  let worst: Severity = "ok";
  for (const r of fresh) {
    const t = mergeThresholds(r.thresholds, thresholdsByType[r.type]);
    const sev = severityForReading(r.value, t);
    if (RANK[sev] > RANK[worst]) worst = sev;
  }
  return worst;
}

function mergeThresholds(a: Threshold, b?: Threshold): Threshold {
  if (!b) return a;
  return {
    warning: a.warning ?? b.warning,
    critical: a.critical ?? b.critical,
  };
}

/**
 * WHO-anchored defaults used when a sensor row is missing thresholds.
 * Values in the sensor's native unit (µg/m³ for air, pH units, NTU, etc.).
 */
export const DEFAULT_THRESHOLDS: Record<string, Threshold> = {
  so2: { warning: 40, critical: 200 },
  no2: { warning: 25, critical: 120 },
  pm25: { warning: 15, critical: 55 },
  pm10: { warning: 45, critical: 150 },
  ph: { warning: 8.5, critical: 9.0 },
  turbidity: { warning: 5, critical: 15 },
  chlorophyll_a: { warning: 5, critical: 15 },
  temperature: { warning: 32, critical: 38 },
};

/** Human-readable FR label for a severity. */
export function severityLabel(s: Severity): string {
  if (s === "critical") return "Évite";
  if (s === "warning") return "Attention";
  if (s === "unknown") return "Inconnu";
  return "Respire";
}

/** Short FR sub-label clarifying the status word. */
export function severitySubtitle(s: Severity): string {
  if (s === "critical") return "Reste à l’intérieur";
  if (s === "warning") return "Limite les sorties";
  if (s === "unknown") return "Capteurs sans signal récent";
  return "L’air est sûr";
}

/** NAFAS token colour for a severity. */
export function severityColor(s: Severity): string {
  if (s === "critical") return "var(--nafas-danger)";
  if (s === "warning") return "var(--nafas-amber)";
  if (s === "unknown") return "var(--nafas-ink3)";
  return "var(--nafas-accent2)";
}
