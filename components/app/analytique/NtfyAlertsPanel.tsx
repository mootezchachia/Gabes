"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, ExternalLink, RotateCw } from "lucide-react";
import { Eyebrow, StatusBadge } from "@/components/app/ui/Primitives";

interface NtfyAlertRow {
  id: string;
  sensor_id: string;
  threshold_key: "warning" | "critical";
  topic: string;
  sent_at: string;
  sensors: {
    label: string | null;
    type: string;
    org_id: string;
  } | null;
}

/**
 * Recent ntfy.sh notifications published by the `notify_threshold_cross`
 * edge function for the caller's org. Closes the visibility gap between
 * "a threshold crossed" and "the public got alerted".
 *
 * Source: /api/notifications/log (server-side read of ntfy_alert_log with
 * service role, filtered by session org_id).
 */
export function NtfyAlertsPanel() {
  const query = useQuery<{ alerts: NtfyAlertRow[] }>({
    queryKey: ["ntfy", "log"],
    staleTime: 15_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await fetch("/api/notifications/log", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      return res.json();
    },
  });

  const alerts = query.data?.alerts ?? [];

  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--nafas-bg2)]/40 p-5">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <Eyebrow>Notifications · ntfy.sh</Eyebrow>
          <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-[20px] leading-tight">
            Alertes envoyées au public
          </h3>
          <p className="mt-1 text-[12px] text-[color:var(--nafas-ink3)] max-w-[52ch]">
            Chaque mesure hors seuil déclenche un webhook Supabase → edge function → ntfy.sh.
            Anti-spam 30 min par capteur × topic.
          </p>
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-white/10 text-[11px] tracking-[0.1em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] hover:bg-white/5 disabled:opacity-60 transition-colors"
        >
          <RotateCw className={`size-3 ${query.isFetching ? "animate-spin" : ""}`} />
          Rafraîchir
        </button>
      </div>

      {query.isLoading ? (
        <div className="py-10 text-center text-[13px] text-[color:var(--nafas-ink3)]">Chargement…</div>
      ) : query.isError ? (
        <div className="py-6 text-[13px] text-[color:var(--nafas-danger)]">
          {(query.error as Error).message}
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[color:var(--nafas-ink3)]">
          <Bell className="size-4 mx-auto mb-2 opacity-50" />
          Aucune alerte envoyée pour l&apos;instant. Une mesure capteur franchissant son seuil
          <br className="hidden md:block" />
          déclenchera automatiquement une notification.
        </div>
      ) : (
        <ul className="divide-y divide-white/5 max-h-[360px] overflow-y-auto -mx-5 px-5">
          {alerts.map((a) => {
            const sentAt = new Date(a.sent_at);
            const label = a.sensors?.label ?? a.sensor_id.slice(0, 8);
            const type = a.sensors?.type ?? "";
            const topicShort = a.topic.replace(/^nafas-gabes-/, "");
            const ntfyUrl = `https://ntfy.sh/${a.topic}`;
            return (
              <li key={a.id} className="py-3 flex items-center gap-3">
                <Bell
                  className="size-3.5 shrink-0"
                  style={{
                    color:
                      a.threshold_key === "critical"
                        ? "var(--nafas-danger)"
                        : "var(--nafas-amber)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[color:var(--nafas-surface)] truncate">
                    {label} · <span className="font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">{type}</span>
                  </div>
                  <div className="text-[11px] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)]">
                    {sentAt.toLocaleString("fr-FR")} · topic <span className="text-[color:var(--nafas-surface)]">{topicShort}</span>
                  </div>
                </div>
                <StatusBadge tone={a.threshold_key === "critical" ? "danger" : "accent"}>
                  {a.threshold_key === "critical" ? "critique" : "alerte"}
                </StatusBadge>
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
  );
}
