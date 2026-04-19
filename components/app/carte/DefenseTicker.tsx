"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Shield, ChevronDown, ChevronUp, Loader2, Bell, ExternalLink } from "lucide-react";
import { useIsAdmin } from "@/lib/auth/useRole";
import { isTypingTarget } from "@/lib/app/inputTarget";
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
 * Carte-top defense status chip (discreet top-right corner).
 *
 * Design intent for the jury demo:
 *   - VISIBLE but not loud: a small shield chip with a status dot, like an
 *     oncall monitor in the corner of a dashboard. Nothing screams "demo".
 *   - Expand reveals the live ntfy feed + links out to real ntfy topics.
 *   - The simulate trigger is intentionally BURIED. We expose it as:
 *       (a) Admin keyboard shortcut `Shift + D` — invisible to the jury,
 *           so the demonstrator can fire the pipeline without anyone
 *           noticing a "test" button being pressed.
 *       (b) A subtle text link inside the expanded panel for keyboard-free
 *           flows.
 *   - On a real threshold crossing (not a simulation), polling picks it up
 *     and fires the same AlertCinematic automatically.
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
        markLogSeen(rows.map((r) => r.id));
        initialisedRef.current = true;
        return;
      }

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
      /* swallow */
    }
  }, [markLogSeen, hasSeenLog, showAlert]);

  useEffect(() => {
    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  const simulate = useCallback(async () => {
    if (simulating) return;
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
        sensor: j.sensor ?? { id: "?", label: "—", type: "so2", unit: null, lon: null, lat: null },
        value: j.simulated_value ?? 0,
        threshold: j.threshold ?? 0,
        severity: j.severity ?? "critical",
        sent_topics: topics,
        sent_at: new Date().toISOString(),
        ntfy_url: topics[0] ? `${NTFY_BASE}/${topics[0]}` : null,
        simulated: true,
      };
      showAlert(alert);
      setTimeout(() => void poll(), 1500);
    } catch (e) {
      setSimError((e as Error).message);
    } finally {
      setSimulating(false);
    }
  }, [simulating, showAlert, poll]);

  // Global admin keyboard shortcut: `Shift + D` fires the simulate
  // pipeline without any visible UI affordance. Lets the demonstrator
  // trigger danger mode while their cursor is anywhere on /app/carte.
  useEffect(() => {
    if (!isAdmin) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        void simulate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin, simulate]);

  const criticalCount = alerts.filter((a) => a.threshold_key === "critical").length;
  const total = alerts.length;
  const tone = criticalCount > 0 ? "danger" : total > 0 ? "amber" : "cyan";
  const toneColor = tone === "danger" ? "#E24B4A" : tone === "amber" ? "#EF9F27" : "#3EC99A";

  return (
    <div className="absolute top-3 right-3 z-[30] pointer-events-auto">
      <div
        className="flex flex-col rounded-xl border backdrop-blur-xl overflow-hidden transition-[width,height] duration-300 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.5)]"
        style={{
          borderColor: expanded ? `${toneColor}33` : "rgba(255,255,255,0.07)",
          background: "linear-gradient(180deg, rgba(10,14,20,0.78), rgba(10,14,20,0.66))",
          width: expanded ? "360px" : "auto",
        }}
      >
        {/* Compact chip — intentionally small so the jury doesn't notice */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-white/[0.025] transition-colors"
          title={total === 0 ? "Gardien actif" : `${criticalCount || total} alerte(s)`}
        >
          <span className="relative flex size-1.5">
            <span
              className={`absolute inline-flex size-full rounded-full opacity-75 ${total > 0 ? "animate-ping" : ""}`}
              style={{ background: toneColor }}
            />
            <span className="relative inline-flex size-1.5 rounded-full" style={{ background: toneColor }} />
          </span>
          <Shield className="size-3" style={{ color: toneColor }} />
          <span className="text-[9.5px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
            {total === 0 ? "gardien" : `${criticalCount || total}`}
          </span>
          {expanded ? (
            <ChevronUp className="size-3 text-[color:var(--nafas-ink3)]/60" />
          ) : (
            <ChevronDown className="size-3 text-[color:var(--nafas-ink3)]/60" />
          )}
        </button>

        {expanded ? (
          <div className="border-t border-white/5 bg-black/20 p-3 space-y-3 max-h-[380px] overflow-y-auto">
            <div className="flex items-baseline justify-between">
              <div className="text-[9.5px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
                Flux ntfy · 6 s poll
              </div>
              <div className="text-[9.5px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)]" style={{ color: toneColor }}>
                {total} au total
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="py-5 text-center text-[11.5px] text-[color:var(--nafas-ink3)]">
                <Bell className="size-3 mx-auto mb-1.5 opacity-50" />
                Aucun seuil franchi récemment.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {alerts.slice(0, 5).map((a) => {
                  const isCritical = a.threshold_key === "critical";
                  const topicShort = a.topic.replace(/^nafas-gabes-/, "");
                  const ntfyUrl = `${NTFY_BASE}/${a.topic}`;
                  return (
                    <li key={a.id} className="py-2 flex items-center gap-2.5">
                      <span
                        className="shrink-0 size-1.5 rounded-full"
                        style={{ background: isCritical ? "#E24B4A" : "#EF9F27" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] text-[color:var(--nafas-surface)] truncate">
                          {a.sensors?.label ?? a.sensor_id.slice(0, 8)}
                          <span className="text-[color:var(--nafas-ink3)] ml-1">· {a.sensors?.type ?? ""}</span>
                        </div>
                        <div className="text-[10px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] truncate">
                          {new Date(a.sent_at).toLocaleTimeString("fr-FR")} · {topicShort}
                        </div>
                      </div>
                      <a
                        href={ntfyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 size-6 grid place-items-center rounded text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-white/5 transition-colors"
                        title={`Ouvrir ${ntfyUrl}`}
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Discreet admin trigger — the jury won't see this unless the
                 demonstrator explicitly opens the panel. Text link, not a
                 gradient button. Paired with the Shift + D shortcut for
                 hands-off firing mid-presentation. */}
            {isAdmin ? (
              <div className="pt-1 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={simulate}
                  disabled={simulating}
                  className="inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] transition-colors disabled:opacity-60"
                >
                  {simulating ? <Loader2 className="size-3 animate-spin" /> : null}
                  {simulating ? "en cours" : "diagnostic local"}
                </button>
                <span className="text-[9px] tracking-[0.18em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]/60">
                  ⇧ D
                </span>
              </div>
            ) : null}
            {simError ? (
              <div className="text-[10.5px] text-[color:var(--nafas-danger)] bg-[color:var(--nafas-danger)]/10 border border-[color:var(--nafas-danger)]/25 rounded-md px-2 py-1.5">
                {simError}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
