"use client";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { X, Siren, Radio, Bell, ExternalLink, Wind, MapPin, Zap } from "lucide-react";
import { useAlertStore } from "./alertStore";
import { getViewer } from "@/lib/cesium-bus";

const TYPE_LABEL: Record<string, string> = {
  so2: "SO₂ · Dioxyde de soufre",
  no2: "NO₂ · Dioxyde d'azote",
  pm25: "PM2.5 · Particules fines",
  pm10: "PM10 · Particules",
  ph: "pH · acidité",
  turbidity: "Turbidité",
  chlorophyll_a: "Chlorophylle-a",
  temperature: "Température",
};

const TYPE_UNIT: Record<string, string> = {
  so2: "µg/m³", no2: "µg/m³", pm25: "µg/m³", pm10: "µg/m³",
  ph: "", turbidity: "NTU", chlorophyll_a: "µg/L", temperature: "°C",
};

/**
 * ORACLE · DEFENSE · Alert cinematic.
 *
 * Red-mode full-viewport dossier that fires the moment the DefenseTicker
 * detects a new ntfy alert (real crossing OR demo simulation).
 *
 * Sequence:
 *   1. Cesium camera flies to the affected sensor (if coords available).
 *   2. A pulsing red halo is drawn at the sensor location for the life of
 *      the overlay — visible through the semi-transparent backdrop.
 *   3. Overlay fades in: SIRENE · DÉTECTION · NOTIFICATION timeline.
 *   4. Counters animate, phone mockup shows the ntfy notification as it
 *      would land on a citizen's lock screen.
 *
 * Demo-grade: designed to make a jury feel the full detection → alert
 * pipeline in ~6 seconds.
 */
export function AlertCinematic() {
  const current = useAlertStore((s) => s.current);
  const close = useAlertStore((s) => s.close);

  // Red halo entity on the Cesium globe — lives as long as this cinematic.
  useEffect(() => {
    if (!current) return;
    const viewer = getViewer();
    if (!viewer || current.sensor.lon == null || current.sensor.lat == null) return;

    const lon = current.sensor.lon;
    const lat = current.sensor.lat;
    const t0 = performance.now();

    // Camera fly-to — pitched down, close for urgency.
    try {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.004, 700),
        orientation: {
          heading: Cesium.Math.toRadians(8),
          pitch: Cesium.Math.toRadians(-42),
          roll: 0,
        },
        duration: 1.8,
      });
    } catch {
      /* camera busy — ignore */
    }

    const entities: Cesium.Entity[] = [];

    // Pulsing expanding halo
    const haloRadius = new Cesium.CallbackProperty(() => {
      const t = ((performance.now() - t0) % 1600) / 1600;
      return 60 + t * 340;
    }, false);
    const haloMaterial = new Cesium.ColorMaterialProperty(
      new Cesium.CallbackProperty(() => {
        const t = ((performance.now() - t0) % 1600) / 1600;
        return Cesium.Color.fromCssColorString("#E24B4A").withAlpha(0.5 * (1 - t));
      }, false),
    );
    entities.push(viewer.entities.add({
      id: `alert-halo-${current.sensor.id}`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      ellipse: {
        semiMajorAxis: haloRadius,
        semiMinorAxis: haloRadius,
        material: haloMaterial,
        height: 0.2,
        zIndex: 15,
      },
    }));

    // Core ring — solid, always on
    entities.push(viewer.entities.add({
      id: `alert-core-${current.sensor.id}`,
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      ellipse: {
        semiMajorAxis: 50,
        semiMinorAxis: 50,
        material: Cesium.Color.fromCssColorString("#E24B4A").withAlpha(0.75),
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
        outlineWidth: 2,
        height: 0.5,
        zIndex: 20,
      },
    }));

    // Vertical warning beam
    entities.push(viewer.entities.add({
      id: `alert-beam-${current.sensor.id}`,
      polyline: {
        positions: [
          Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          Cesium.Cartesian3.fromDegrees(lon, lat, 2400),
        ],
        width: 6,
        material: new Cesium.PolylineGlowMaterialProperty({
          color: Cesium.Color.fromCssColorString("#E24B4A"),
          glowPower: 0.5,
          taperPower: 0.6,
        }),
      },
    }));

    return () => {
      for (const e of entities) {
        try {
          viewer.entities.remove(e);
        } catch {
          /* viewer gone */
        }
      }
    };
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, close]);

  if (!current) return null;

  const typeLbl = TYPE_LABEL[current.sensor.type] ?? current.sensor.type.toUpperCase();
  const unit = current.sensor.unit ?? TYPE_UNIT[current.sensor.type] ?? "";
  const sensorLabel = current.sensor.label ?? current.sensor.id.slice(0, 8);
  const severityLabel = current.severity === "critical" ? "CRITIQUE" : "ALERTE";
  const accent = "#E24B4A";

  return (
    <div className="fixed inset-0 z-[65] pointer-events-auto">
      {/* Red-tinted backdrop */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 40%, ${accent}33, transparent 65%),
            radial-gradient(circle at 100% 0%, ${accent}24, transparent 50%),
            linear-gradient(180deg, rgba(10,4,6,0.82), rgba(10,4,6,0.94) 50%, rgba(10,4,6,0.82))
          `,
          backdropFilter: "blur(4px) saturate(130%)",
          animation: "alert-fadein 400ms cubic-bezier(0.22,1,0.36,1) both",
        }}
      />

      {/* Red edge bars — pulse in and out to signal alarm without screaming */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent, ${accent}, transparent)`,
          animation: "alert-pulse 1.2s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-1 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent, ${accent}, transparent)`,
          animation: "alert-pulse 1.2s ease-in-out infinite",
          animationDelay: "0.15s",
        }}
      />

      {/* Grain */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Close */}
      <button
        type="button"
        onClick={close}
        className="absolute top-5 right-5 size-10 grid place-items-center rounded-full border border-white/10 bg-black/35 text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-black/55 backdrop-blur-sm transition-colors z-[3]"
        title="Fermer (Esc)"
      >
        <X className="size-4" />
      </button>

      <div
        className="relative z-[1] h-full max-h-screen overflow-y-auto"
        style={{
          animation: "alert-scalein 550ms cubic-bezier(0.22,1,0.36,1) both",
          transformOrigin: "center 38%",
        }}
      >
        <div className="max-w-[960px] mx-auto px-8 py-10 md:py-14">
          <div className="space-y-8">
            <div
              className="flex items-center gap-2.5 text-[11px] tracking-[0.34em] uppercase font-[family-name:var(--font-jetbrains)]"
              style={{ color: accent, animation: "alert-rise 450ms cubic-bezier(0.22,1,0.36,1) 80ms both" }}
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full opacity-70 animate-ping" style={{ background: accent }} />
                <span className="relative inline-flex size-2 rounded-full" style={{ background: accent }} />
              </span>
              <Siren className="size-3.5" />
              Détection · Gardien ORACLE
              <span className="mx-3 h-px flex-1 max-w-[240px]" style={{ background: `linear-gradient(90deg, ${accent}aa, transparent)` }} />
              <span className="text-[color:var(--nafas-ink3)] shrink-0">
                {new Date(current.sent_at).toLocaleTimeString("fr-FR")}
              </span>
            </div>

            <div
              className="flex items-start gap-5"
              style={{ animation: "alert-rise 650ms cubic-bezier(0.22,1,0.36,1) 180ms both" }}
            >
              <div
                aria-hidden
                className="shrink-0 size-20 rounded-2xl grid place-items-center border"
                style={{
                  borderColor: `${accent}55`,
                  background: `linear-gradient(180deg, ${accent}33, transparent)`,
                  boxShadow: `0 24px 48px -24px ${accent}aa, inset 0 0 0 1px ${accent}22`,
                }}
              >
                <Zap className="size-10" style={{ color: accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] tracking-[0.28em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] mb-1.5">
                  {severityLabel} · {typeLbl}
                </div>
                <h1 className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(30px,5vw,56px)] leading-[1.02] tracking-[-0.02em] text-[color:var(--nafas-surface)]">
                  {sensorLabel}
                </h1>
                {current.sensor.lon != null && current.sensor.lat != null ? (
                  <div className="mt-2 text-[11.5px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] tabular-nums flex items-center gap-1.5">
                    <MapPin className="size-3" />
                    {current.sensor.lat.toFixed(4)}°N · {current.sensor.lon.toFixed(4)}°E
                  </div>
                ) : null}
              </div>
            </div>

            {/* Reading vs threshold — the "what happened" */}
            {current.threshold > 0 ? (
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  borderColor: `${accent}33`,
                  background: `linear-gradient(180deg, ${accent}14, rgba(0,0,0,0.25))`,
                  animation: "alert-rise 650ms cubic-bezier(0.22,1,0.36,1) 320ms both",
                  boxShadow: `0 40px 80px -30px ${accent}66`,
                }}
              >
                <div className="grid grid-cols-2 gap-px bg-white/5">
                  <AlertStat
                    accent={accent}
                    value={current.value}
                    unit={unit}
                    label="Mesure"
                    emphasize
                  />
                  <AlertStat
                    accent={accent}
                    value={current.threshold}
                    unit={unit}
                    label={current.severity === "critical" ? "Seuil critique" : "Seuil d'alerte"}
                    emphasize={false}
                  />
                </div>
                <div className="px-5 py-3 flex items-center gap-2 text-[11.5px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
                  <Wind className="size-3" style={{ color: accent }} />
                  Dépassement de{" "}
                  <span className="text-[color:var(--nafas-surface)] tabular-nums">
                    +{((current.value / current.threshold - 1) * 100).toFixed(0)} %
                  </span>
                  {" "}au-dessus du seuil·population automatiquement prévenue.
                </div>
              </div>
            ) : null}

            {/* Sent topics + ntfy CTA */}
            {current.sent_topics.length > 0 ? (
              <div
                className="space-y-3"
                style={{ animation: "alert-rise 650ms cubic-bezier(0.22,1,0.36,1) 460ms both" }}
              >
                <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)]" style={{ color: accent }}>
                  <Radio className="size-3" />
                  Notifications diffusées · {current.sent_topics.length} topic{current.sent_topics.length > 1 ? "s" : ""}
                </div>
                <div className="flex flex-wrap gap-2">
                  {current.sent_topics.map((t) => (
                    <a
                      key={t}
                      href={`https://ntfy.sh/${t}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[11px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-surface)] hover:bg-white/[0.04] transition-colors"
                      style={{
                        borderColor: `${accent}44`,
                        background: "rgba(0,0,0,0.25)",
                      }}
                    >
                      <Bell className="size-3" style={{ color: accent }} />
                      {t}
                      <ExternalLink className="size-2.5 opacity-70" />
                    </a>
                  ))}
                </div>
                <p className="text-[12.5px] text-[color:var(--nafas-ink3)] max-w-[52ch] leading-[1.55]">
                  Chaque topic est une liste d&apos;abonnés (parents d&apos;écoles, personnel
                  soignant, oncall Municipalité). ntfy.sh pousse la notification push
                  sur iOS, Android et navigateur en moins de 2 s.
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl border border-[color:var(--nafas-amber)]/30 bg-[color:var(--nafas-amber)]/8 px-4 py-3 text-[12.5px] text-[color:var(--nafas-amber)]"
                style={{ animation: "alert-rise 650ms cubic-bezier(0.22,1,0.36,1) 460ms both" }}
              >
                Aucun topic n&apos;a été diffusé — le capteur n&apos;est rattaché à aucune
                zone publique ou la fenêtre anti-spam est active.
              </div>
            )}

            <div
              className="flex items-center justify-between pt-2"
              style={{ animation: "alert-rise 650ms cubic-bezier(0.22,1,0.36,1) 600ms both" }}
            >
              <div className="text-[10px] tracking-[0.24em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
                Esc · fermer
              </div>
              <button
                type="button"
                onClick={close}
                className="text-[11px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] px-6 py-2.5 rounded-md text-white transition-transform hover:scale-[1.02]"
                style={{
                  background: accent,
                  boxShadow: `0 14px 32px -10px ${accent}99`,
                }}
              >
                Retour au terrain →
              </button>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        @keyframes alert-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes alert-scalein {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes alert-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes alert-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function AlertStat({
  value, unit, label, accent, emphasize,
}: {
  value: number; unit: string; label: string; accent: string; emphasize: boolean;
}) {
  return (
    <div className="p-6 bg-[color:var(--nafas-bg2)]/80 backdrop-blur-sm" style={emphasize ? { background: `linear-gradient(180deg, ${accent}24, transparent 82%)` } : undefined}>
      <div
        className="font-[family-name:var(--font-fraunces)] font-light tracking-[-0.03em] leading-none tabular-nums text-[clamp(38px,5.5vw,64px)]"
        style={{ color: emphasize ? accent : "var(--nafas-surface)" }}
      >
        {value.toFixed(1)}
        <span className="text-[clamp(13px,1.5vw,17px)] tracking-normal opacity-70 font-[family-name:var(--font-jetbrains)] ml-1.5">
          {unit}
        </span>
      </div>
      <div className="mt-2.5 text-[10px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
        {label}
      </div>
    </div>
  );
}
