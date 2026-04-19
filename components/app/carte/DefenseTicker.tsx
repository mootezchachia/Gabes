"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Shield, Zap, ChevronDown, ChevronUp, Loader2, Bell, ExternalLink } from "lucide-react";
import { useIsAdmin } from "@/lib/auth/useRole";
import { useAlertStore, type DangerAlert } from "./alertStore";

interface AlertLogRow {
  id: string;
  sensor_id: string;
  threshold_key: "warning" | "critical";
  topic: string;
  sent_at: string;
  sensors: { label: string | null; type: string; org_id: string } | null;
}

const POLL_MS = 6000;
const NTFY_BASE = "https://ntfy.sh";

/**
 * Carte-top defense status ticker.
 *
 * - Always-visible corner pill showing Gardien status + live alert count.
 * - Expand to see the last 5 ntfy alerts, each with a ↗ link to the topic.
 * - Admin-only « Déclencher une alerte · démo » kicks off the simulate
 *   endpoint so the jury watches the pipeline run end-to-end.
 * - Polls /api/notifications/log on POLL_MS. When a row appears whose id
 *   hasn't been seen since mount, it fires the AlertCinematic via the
 *   alertStore so the UI erupts into full-screen danger mode.
 */
export function DefenseTicker() {
  const isAdmin = useIsAdmin();
  const [alerts, setAlerts] = useState<AlertLogRow[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const initialisedRef = useRef(false);
  const showAlert = useAlertStore((s) => s.show);
  const markLogSeen = useAlertStore((s) => s.markLogSeen);
  const hasSeenLog = useAlertStore((s) => s.hasSeenLog);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/log", { cache: "no-store" });
      if (!res.ok) return;
      const { alerts: rows } = (await res.json()) as { alerts: AlertLogRow[] };
      setAlerts(rows);

      if (!initialisedRef.current) {
        // On first load, mark everything as "already seen" — we only want
        // cinematic pops for alerts that land AFTER the user opened carte.
        markLogSeen(rows.map((r) => r.id));
        initialisedRef.current = true;
        return;
      }

      // Find new rows (not in seenLogIds) and fire the cinematic for the
      // most recent one. Mark all fresh ids as seen in the same tick.
      const freshIds: string[] = [];
      let toShow: AlertLogRow | null = null;
      for (const r of rows) {
        if (!hasSeenLog(r.id)) {
          freshIds.push(r.id);
          if (!toShow) toShow = r;
        }
      }
      if (freshIds.length) markLogSeen(freshIds);

      if (toShow) {
        // Ask the server for sensor coordinates for a nicer cinematic flow.
        // Fallback: render without a fly-to if we can't resolve the point.
        let lon: number | null = null;
        let lat: number | null = null;
        try {
          const sensorRes = await fetch(`/api/sensors/${toShow.sensor_id}/location`, { cache: "no-store" });
          if (sensorRes.ok) {
            const j = (await sensorRes.json()) as { lon?: number; lat?: number };
            lon = j.lon ?? null;
            lat = j.lat ?? null;
          }
        } catch {
          /* no-op */
        }
        const alert: DangerAlert = {
          sensor: {
            id: toShow.sensor_id,
            label: toShow.sensors?.label ?? null,
            type: toShow.sensors?.type ?? "",
            unit: null,
            lon,
            lat,
          },
          value: 0,
          threshold: 0,
          severity: toShow.threshold_key,
          sent_topics: [toShow.topic],
          sent_at: toShow.sent_at,
          ntfy_url: `${NTFY_BASE}/${toShow.topic}`,
        };
        showAlert(alert);
      }
    } catch {
      /* swallow — polling retries on the next tick */
    }
  }, [markLogSeen, hasSeenLog, showAlert]);

  useEffect(() => {
    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  async function simulate() {
    setSimulating(true);
    setSimError(null);
    try {
      const res = await fetch("/api/notifications/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sensor_type: "so2", severity: "critical" }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        sensor?: { id: string; label: string | null; type: string; unit: string | null; lon: number | null; lat: number | null };
        simulated_value?: number;
        threshold?: number;
        severity?: "warning" | "critical";
        sent_topics?: string[];
      };
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);

      const topics = j.sent_topics ?? [];
      const alert: DangerAlert = {
        sensor: j.sensor ?? {
          id: "?",
          label: "—",
          type: "so2",
          unit: null,
          lon: null,
          lat: null,
        },
        value: j.simulated_value ?? 0,
        threshold: j.threshold ?? 0,
        severity: j.severity ?? "critical",
        sent_topics: topics,
        sent_at: new Date().toISOString(),
        ntfy_url: topics[0] ? `${NTFY_BASE}/${topics[0]}` : null,
        simulated: true,
      };
      showAlert(alert);

      // Refresh the log so the expanded list immediately picks up the new row.
      // The polling loop would do it in a few seconds anyway, but the demo
      // wants zero lag.
      setTimeout(() => void poll(), 1500);
    } catch (e) {
      setSimError((e as Error).message);
    } finally {
      setSimulating(false);
    }
  }

  const criticalCount = alerts.filter((a) => a.threshold_key === "critical").length;
  const total = alerts.length;
  const tone = criticalCount > 0 ? "danger" : total > 0 ? "amber" : "cyan";
  const toneColor =
    tone === "danger" ? "#E24B4A" : tone === "amber" ? "#EF9F27" : "#3EC99A";

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[30] pointer-events-auto">
      <div
        className="flex flex-col rounded-2xl border backdrop-blur-xl overflow-hidden transition-all duration-300 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)]"
        style={{
          borderColor: `${toneColor}44`,
          background: `linear-gradient(180deg, rgba(10,14,20,0.88), rgba(10,14,20,0.78))`,
          width: expanded ? "min(640px, calc(100vw - 32px))" : "auto",
        }}
      >
        {/* top pill */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
        >
          <span className="relative flex size-2">
            <span
              className={`absolute inline-flex size-full rounded-full opacity-75 ${total > 0 ? "animate-ping" : ""}`}
              style={{ background: toneColor }}
            />
            <span className="relative inline-flex size-2 rounded-full" style={{ background: toneColor }} />
          </span>
          <Shield className="size-3.5" style={{ color: toneColor }} />
          <span className="text-[10.5px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)]" style={{ color: toneColor }}>
            Gardien · {total === 0 ? "surveillance active" : `${criticalCount || total} alerte${(criticalCount || total) > 1 ? "s" : ""}`}
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span className="text-[10px] tracking-[0.18em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
            ntfy.sh · live
          </span>
          {expanded ? (
            <ChevronUp className="size-3.5 text-[color:var(--nafas-ink3)] ml-1" />
          ) : (
            <ChevronDown className="size-3.5 text-[color:var(--nafas-ink3)] ml-1" />
          )}
        </button>

        {expanded ? (
          <div className="border-t border-white/5 bg-black/25 p-4 space-y-3 max-h-[360px] overflow-y-auto">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={simulate}
                  disabled={simulating}
                  className="relative flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg text-black font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.14em] uppercase overflow-hidden transition-transform hover:scale-[1.01] disabled:opacity-70"
                  style={{
                    background: "linear-gradient(90deg, #E24B4A, #EF9F27)",
                  }}
                >
                  {simulating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Zap className="size-4" />
                  )}
                  {simulating
                    ? "Propagation dans le réseau…"
                    : "Déclencher un pic SO₂ · démo jury"}
                </button>
              </div>
            ) : null}
            {simError ? (
              <div className="text-[11.5px] text-[color:var(--nafas-danger)] bg-[color:var(--nafas-danger)]/10 border border-[color:var(--nafas-danger)]/25 rounded-md px-3 py-2">
                {simError}
              </div>
            ) : null}

            <div className="text-[10px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
              Flux temps réel · dernières notifications
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-6 text-[12.5px] text-[color:var(--nafas-ink3)]">
                <Bell className="size-4 mx-auto mb-2 opacity-50" />
                Aucun seuil franchi pour le moment.
                {isAdmin ? (
                  <div className="text-[11px] mt-1 opacity-75">
                    Appuie sur « Déclencher un pic SO₂ » pour tester.
                  </div>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {alerts.slice(0, 5).map((a) => {
                  const isCritical = a.threshold_key === "critical";
                  const topicShort = a.topic.replace(/^nafas-gabes-/, "");
                  const ntfyUrl = `${NTFY_BASE}/${a.topic}`;
                  return (
                    <li key={a.id} className="py-2.5 flex items-center gap-3">
                      <span
                        className="shrink-0 size-1.5 rounded-full"
                        style={{ background: isCritical ? "#E24B4A" : "#EF9F27" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] text-[color:var(--nafas-surface)] truncate">
                          {a.sensors?.label ?? a.sensor_id.slice(0, 8)}{" "}
                          <span className="text-[color:var(--nafas-ink3)]">· {a.sensors?.type ?? ""}</span>
                        </div>
                        <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
                          {new Date(a.sent_at).toLocaleTimeString("fr-FR")} · {topicShort}
                        </div>
                      </div>
                      <span
                        className="text-[9.5px] tracking-[0.14em] uppercase px-1.5 py-0.5 rounded-[3px] font-[family-name:var(--font-jetbrains)]"
                        style={{
                          color: isCritical ? "#E24B4A" : "#EF9F27",
                          background: isCritical ? "rgba(226,75,74,0.1)" : "rgba(239,159,39,0.1)",
                          border: `1px solid ${isCritical ? "rgba(226,75,74,0.3)" : "rgba(239,159,39,0.3)"}`,
                        }}
                      >
                        {isCritical ? "critique" : "alerte"}
                      </span>
                      <a
                        href={ntfyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 size-7 grid place-items-center rounded-md text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-white/5 transition-colors"
                        title={`Ouvrir ${ntfyUrl}`}
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
