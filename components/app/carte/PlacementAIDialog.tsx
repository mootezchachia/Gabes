"use client";

// Must be first — sets window.CESIUM_BASE_URL before Cesium is imported.
import "@/lib/cesium-env";

import { useState, useRef, useEffect, useMemo } from "react";
import * as Cesium from "cesium";
import { Sparkles, AlertTriangle, Radar, X } from "lucide-react";
import { AppSheet, Button, FormLabel, SelectField } from "@/components/app/ui/Primitives";
import { useToolStore } from "./toolStore";
import { parseSseStream } from "@/lib/sse/parseStream";
import { PlacementCard } from "./PlacementCard";
import { PlacementRunSummary } from "./PlacementRunSummary";
import { deriveImpact, type Components, type Strategy } from "@/lib/sim/impact";
import { getViewer, onViewer } from "@/lib/cesium-bus";

const ORACLE_ACCENT_CSS = "#EF9F27";

interface RunEvent {
  run_id: string;
  strategy: string;
  candidates: number;
  picked: number;
}
interface ProgressEvent {
  stage: string;
  for?: { lon: number; lat: number };
  detail?: string;
}
interface PlacementBuilding {
  id: string;
  name: string;
  type: string;
  surface_m2: number;
  occupants: number;
}
interface RawPlacementEvent {
  id: string;
  location: { lon: number; lat: number };
  score: number;
  components: Record<string, number>;
  rationale_md: string | null;
  model_name: string;
  building?: PlacementBuilding;
}
interface PlacementEvent extends Omit<RawPlacementEvent, "components"> {
  components: Components;
}

/** Pre-short-key servers (or future schema drift) — remap long names → short. */
const KEY_REMAP: Record<string, keyof Components> = {
  air_exposure: "ae",
  building_surface: "bs",
  population: "po",
  occupants: "po",
  vulnerability: "vu",
  heat_island: "hi",
  greenery_gap: "gr",
};

function normalizeComponents(raw: Record<string, number>): Components {
  const out: Components = {};
  for (const [k, v] of Object.entries(raw)) {
    const short = KEY_REMAP[k] ?? (k as keyof Components);
    if (out[short] == null) out[short] = v;
  }
  return out;
}

const STRATEGY_LABELS: Record<Strategy, string> = {
  air_quality: "Qualité de l'air urbain",
  vulnerable_pop: "Populations vulnérables",
  heat_resilience: "Résilience thermique",
};

/**
 * ORACLE · Placement IA — right-side drawer (vegetal panels on buildings).
 *
 * Design intent:
 *  - Sheet (not modal) so the 3D globe stays visible on the left, giving the
 *    user a before/after spatial reading while cards stream in.
 *  - `runStrategy` is frozen when the scan starts, so rate-editing the
 *    dropdown doesn't mislabel cards computed under a different strategy.
 *  - Components from the edge fn are normalized via `KEY_REMAP` — cards +
 *    impact deriver use short keys (ae/bs/po/vu/hi/gr) as their single source
 *    of truth.
 *  - Click a zone card → drawer closes, camera flies to the building, loud
 *    on-globe halo + beam light it up so it's impossible to miss.
 */
export function PlacementAIDialog() {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);
  const open = tool === "ai";

  const [strategy, setStrategy] = useState<Strategy>("air_quality");
  const [runStrategy, setRunStrategy] = useState<Strategy>("air_quality");
  const [targetCount, setTargetCount] = useState(5);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [placements, setPlacements] = useState<PlacementEvent[]>([]);
  const [runInfo, setRunInfo] = useState<RunEvent | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort in-flight stream when drawer closes.
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  // Auto-focus the highest-scoring building when a run completes.
  useEffect(() => {
    if (!running && placements.length > 0 && !activeId) {
      const best = [...placements].sort((a, b) => b.score - a.score)[0];
      setActiveId(best.id);
    }
  }, [running, placements, activeId]);

  // Render every streamed placement as a persistent amber marker on the
  // globe so the user can see where ORACLE is proposing buildings even with
  // the drawer closed. Rebuilt whenever the placement list changes.
  useEffect(() => {
    if (placements.length === 0) return;
    const entities: Cesium.Entity[] = [];
    let disposed = false;

    const unsubscribe = onViewer((viewer) => {
      if (!viewer || disposed) return;
      for (const e of entities) {
        try { viewer.entities.remove(e); } catch { /* viewer destroyed */ }
      }
      entities.length = 0;

      placements.forEach((p, i) => {
        const { lon, lat } = p.location;
        entities.push(viewer.entities.add({
          id: `ai-placement-ring-${p.id}`,
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          ellipse: {
            semiMajorAxis: 90,
            semiMinorAxis: 90,
            material: Cesium.Color.fromCssColorString(ORACLE_ACCENT_CSS).withAlpha(0.22),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(ORACLE_ACCENT_CSS).withAlpha(0.9),
            outlineWidth: 2,
          },
        }));
        entities.push(viewer.entities.add({
          id: `ai-placement-label-${p.id}`,
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          label: {
            text: `${String(i + 1).padStart(2, "0")} · ${p.building?.name ?? ""}`,
            font: "600 12px 'JetBrains Mono', monospace",
            fillColor: Cesium.Color.fromCssColorString(ORACLE_ACCENT_CSS),
            outlineColor: Cesium.Color.fromCssColorString("rgba(10,15,20,0.95)"),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new Cesium.NearFarScalar(1500, 1.2, 60000, 0.6),
          },
        }));
      });
    });

    return () => {
      disposed = true;
      unsubscribe();
      const viewer = getViewer();
      if (!viewer) return;
      for (const e of entities) {
        try { viewer.entities.remove(e); } catch { /* viewer destroyed */ }
      }
      entities.length = 0;
    };
  }, [placements]);

  // Loud highlight for the currently active building: pulsing halo, solid
  // core, vertical glow beam, and an apex dot. Makes the zone impossible to
  // miss even at low altitudes in a dense urban scene.
  useEffect(() => {
    if (!activeId) return;
    const active = placements.find((x) => x.id === activeId);
    if (!active) return;

    const { lon, lat } = active.location;
    const entities: Cesium.Entity[] = [];
    let disposed = false;

    const unsubscribe = onViewer((viewer) => {
      if (!viewer || disposed) return;

      entities.push(viewer.entities.add({
        id: `ai-placement-active-halo-${active.id}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        ellipse: {
          semiMajorAxis: 220,
          semiMinorAxis: 220,
          material: new Cesium.ColorMaterialProperty(
            new Cesium.CallbackProperty(() => {
              const t = Date.now() / 1000;
              const a = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2));
              return Cesium.Color.fromCssColorString(ORACLE_ACCENT_CSS).withAlpha(a);
            }, false),
          ),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(ORACLE_ACCENT_CSS).withAlpha(0.95),
          outlineWidth: 3,
        },
      }));

      entities.push(viewer.entities.add({
        id: `ai-placement-active-core-${active.id}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        ellipse: {
          semiMajorAxis: 55,
          semiMinorAxis: 55,
          material: Cesium.Color.fromCssColorString(ORACLE_ACCENT_CSS).withAlpha(0.85),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      }));

      entities.push(viewer.entities.add({
        id: `ai-placement-active-beam-${active.id}`,
        polyline: {
          positions: [
            Cesium.Cartesian3.fromDegrees(lon, lat, 0),
            Cesium.Cartesian3.fromDegrees(lon, lat, 2000),
          ],
          width: 4,
          material: new Cesium.PolylineGlowMaterialProperty({
            color: Cesium.Color.fromCssColorString(ORACLE_ACCENT_CSS).withAlpha(0.95),
            glowPower: 0.35,
            taperPower: 0.4,
          }),
        },
      }));

      entities.push(viewer.entities.add({
        id: `ai-placement-active-apex-${active.id}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 2000),
        point: {
          pixelSize: 16,
          color: Cesium.Color.fromCssColorString(ORACLE_ACCENT_CSS),
          outlineColor: Cesium.Color.fromCssColorString("rgba(10,15,20,0.9)"),
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: active.building?.name ?? "Bâtiment retenu",
          font: "600 13px 'JetBrains Mono', monospace",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK.withAlpha(0.85),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -22),
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
          backgroundPadding: new Cesium.Cartesian2(8, 4),
        },
      }));
    });

    return () => {
      disposed = true;
      unsubscribe();
      const viewer = getViewer();
      if (!viewer) return;
      for (const e of entities) {
        try { viewer.entities.remove(e); } catch { /* viewer destroyed */ }
      }
      entities.length = 0;
    };
  }, [activeId, placements]);

  async function run() {
    setRunning(true);
    setProgress([]);
    setPlacements([]);
    setRunInfo(null);
    setErr(null);
    setActiveId(null);
    setRunStrategy(strategy);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/placement", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ strategy, target_count: targetCount }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null as null | Record<string, unknown>);
        const msg =
          (data?.error as string | undefined) ||
          (data?.message as string | undefined) ||
          (data?.msg as string | undefined) ||
          res.statusText ||
          `HTTP ${res.status}`;
        throw new Error(`${msg} (HTTP ${res.status})`);
      }

      for await (const ev of parseSseStream(res.body)) {
        switch (ev.event) {
          case "run":
            setRunInfo(ev.data as RunEvent);
            break;
          case "progress":
            setProgress((prev) => [...prev, ev.data as ProgressEvent]);
            break;
          case "placement": {
            const raw = ev.data as RawPlacementEvent;
            const normalized: PlacementEvent = {
              ...raw,
              components: normalizeComponents(raw.components ?? {}),
            };
            setPlacements((prev) => [...prev, normalized]);
            break;
          }
          case "error": {
            const m =
              (ev.data as { message?: string } | null)?.message ?? "Erreur inconnue";
            setErr(m);
            break;
          }
          case "done":
            break;
          default:
            break;
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setErr((e as Error).message);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function handleSelect(p: PlacementEvent) {
    setActiveId(p.id);
    // Close the Oracle drawer first so the 680px sheet doesn't cover the
    // flight target on the right half of the globe. The short delay lets
    // the sheet's slide-out animation finish before the camera moves.
    setTool("select");
    const viewer = getViewer();
    if (!viewer) return;
    window.setTimeout(() => {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(p.location.lon, p.location.lat - 0.006, 900),
        orientation: {
          heading: Cesium.Math.toRadians(12),
          pitch: Cesium.Math.toRadians(-38),
          roll: 0,
        },
        duration: 1.6,
      });
    }, 260);
  }

  const aggregate = useMemo(() => {
    if (placements.length === 0) return null;
    const imp = placements.map((p) => deriveImpact(p.components, runStrategy, p.building?.surface_m2));
    const total_surface_m2 = imp.reduce((s, i) => s + i.surface_m2, 0);
    const total_co2_kg = imp.reduce((s, i) => s + i.co2_kg_yr, 0);
    const total_nox_g = imp.reduce((s, i) => s + i.nox_g_yr, 0);
    const total_occupants_k = imp.reduce((s, i) => s + i.occupants_k, 0);
    const total_capex = imp.reduce((s, i) => s + i.capex_keur, 0);
    const avg_thermal_c =
      imp.reduce((s, i) => s + i.thermal_c, 0) / Math.max(1, imp.length);
    const avg_score = placements.reduce((s, p) => s + p.score, 0) / placements.length;
    return {
      total_surface_m2,
      total_co2_kg,
      total_nox_g,
      total_occupants_k,
      total_capex,
      avg_thermal_c,
      avg_score,
    };
  }, [placements, runStrategy]);

  const llmWarn = progress.filter((p) => p.stage === "llm_warn").slice(-1)[0];
  const hasFeed = progress.length > 0 || placements.length > 0 || err !== null || runInfo !== null;

  return (
    <AppSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setTool("select");
      }}
      title="ORACLE · Placement IA"
      description="Proposition spatialisée de panneaux végétaux sur bâtiments (scorer 6-critères + rationales FR streamées)."
      widthClassName="w-[min(680px,100vw)]"
      side="right"
    >
      <div className="relative flex flex-col h-full">
        {/* top controls */}
        <div className="px-5 pt-5 pb-4 space-y-4 border-b border-white/5 bg-gradient-to-b from-black/20 to-transparent">
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <FormLabel>Stratégie</FormLabel>
              <SelectField
                value={strategy}
                onValueChange={(v) => setStrategy(v as Strategy)}
                options={[
                  { value: "air_quality", label: STRATEGY_LABELS.air_quality },
                  { value: "vulnerable_pop", label: STRATEGY_LABELS.vulnerable_pop },
                  { value: "heat_resilience", label: STRATEGY_LABELS.heat_resilience },
                ]}
              />
            </div>
            <div>
              <FormLabel htmlFor="target-count">Bâtiments</FormLabel>
              <input
                id="target-count"
                type="number"
                min={1}
                max={10}
                value={targetCount}
                onChange={(e) =>
                  setTargetCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))
                }
                className="w-full h-9 px-3 rounded-md bg-[color:var(--nafas-bg)] border border-white/10 text-[13.5px] tabular-nums focus:outline-none focus:border-[color:var(--nafas-accent)]"
                disabled={running}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!running ? (
              <Button onClick={run} disabled={running} className="flex-1 justify-center">
                <Sparkles className="size-4" strokeWidth={1.6} />
                Lancer le scan
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => abortRef.current?.abort()}
                className="flex-1 justify-center"
              >
                <X className="size-4" />
                Interrompre
              </Button>
            )}
            <div className="text-[10.5px] tracking-[0.18em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]/80 hidden sm:block">
              Diversif. ≥ 500 m · Ø
            </div>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto">
          {!hasFeed ? (
            <EmptyState />
          ) : (
            <div className="px-5 py-5 space-y-4">
              {runInfo && aggregate ? (
                <PlacementRunSummary
                  run={runInfo}
                  strategy={runStrategy}
                  aggregate={aggregate}
                  running={running}
                />
              ) : running ? (
                <ScanningBanner progress={progress} />
              ) : null}

              {running && progress.length > 0 ? (
                <LiveTicker events={progress.slice(-2)} />
              ) : null}

              <div className="space-y-3">
                {placements.map((p, i) => (
                  <PlacementCard
                    key={p.id}
                    index={i + 1}
                    location={p.location}
                    score={p.score}
                    components={p.components}
                    rationale_md={p.rationale_md}
                    model_name={p.model_name}
                    strategy={runStrategy}
                    totalZones={runInfo?.picked ?? placements.length}
                    active={activeId === p.id}
                    onSelect={() => handleSelect(p)}
                    building={p.building}
                  />
                ))}
              </div>

              {err ? (
                <div className="rounded-md border border-[color:var(--nafas-danger)]/25 bg-[color:var(--nafas-danger)]/5 px-3 py-2 text-[12.5px] text-[color:var(--nafas-danger)]">
                  Erreur : {err}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer chip: LLM fallback info (demoted from banner) */}
        {llmWarn ? (
          <div className="shrink-0 px-5 py-2.5 border-t border-white/5 bg-black/30 flex items-start gap-2">
            <AlertTriangle className="size-3 text-[color:var(--nafas-amber)] mt-0.5 shrink-0" />
            <div className="text-[10.5px] leading-[1.4] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)]">
              <span className="text-[color:var(--nafas-amber)]">Narration LLM partielle</span>{" "}
              · {llmWarn.detail} · chiffres dérivés des coefficients scientifiques.
            </div>
          </div>
        ) : null}
      </div>
    </AppSheet>
  );
}

/* ---------------------------------- Empty ---------------------------------- */

function EmptyState() {
  return (
    <div className="px-5 py-10 space-y-6">
      <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-cyan)]">
        <Radar className="size-3" />
        ORACLE · prêt
      </div>

      <p className="font-[family-name:var(--font-fraunces)] italic text-[28px] leading-[1.12] tracking-[-0.01em] text-[color:var(--nafas-surface)] max-w-[46ch]">
        La ville.{" "}
        <span className="text-[color:var(--nafas-ink3)]/80">25 bâtiments candidats.</span>
        <br />
        <span className="text-[color:var(--nafas-accent2)]">5 toits</span>{" "}
        <span className="text-[color:var(--nafas-ink3)]/80">à végétaliser.</span>
      </p>

      <div className="space-y-2.5 text-[13px] leading-[1.55] text-[color:var(--nafas-ink3)] max-w-[54ch]">
        <p>
          ORACLE évalue 25 bâtiments-cibles de Gabès (écoles, hôpitaux, logements,
          bureaux, mosquées) sur 6&nbsp;critères (exposition au panache GCT, surface
          disponible, occupants desservis, vulnérabilité, îlot de chaleur, manque de
          végétal), diversifie à ≥&nbsp;500&nbsp;m puis narre chaque choix en français
          via une chaîne de modèles OpenRouter gratuits.
        </p>
        <p className="text-[color:var(--nafas-ink3)]/70">
          Lancez le scan pour voir les bâtiments s&apos;allumer, puis cliquez une carte
          pour laisser la caméra s&apos;y poser.
        </p>
      </div>

      <ul className="grid grid-cols-3 gap-px bg-white/5 rounded-md overflow-hidden border border-white/5">
        {[
          { k: "Qualité", v: "de l'air", hint: "panache GCT" },
          { k: "Protection", v: "vulnérables", hint: "écoles + hôpitaux" },
          { k: "Résilience", v: "thermique", hint: "îlots de chaleur" },
        ].map((s) => (
          <li key={s.k} className="p-3 bg-[color:var(--nafas-bg2)]">
            <div className="text-[10px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
              {s.k}
            </div>
            <div className="text-[14px] font-[family-name:var(--font-fraunces)] italic text-[color:var(--nafas-surface)] mt-1">
              {s.v}
            </div>
            <div className="text-[10px] text-[color:var(--nafas-ink3)]/70 mt-1">{s.hint}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------- Scanning banner --------------------------- */

function ScanningBanner({ progress }: { progress: ProgressEvent[] }) {
  const candidatesMsg = progress.find((p) => p.stage === "candidates")?.detail;
  return (
    <div className="relative rounded-lg border border-[color:var(--nafas-cyan)]/20 bg-gradient-to-br from-[color:var(--nafas-cyan)]/8 to-transparent p-4 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--nafas-cyan)]/80 to-transparent animate-[scan_1.8s_linear_infinite]"
        style={{ animation: "scan 2s linear infinite" }}
      />
      <div className="flex items-center gap-2">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full rounded-full bg-[color:var(--nafas-cyan)] opacity-75 animate-ping" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--nafas-cyan)]" />
        </span>
        <span className="text-[10.5px] tracking-[0.2em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-cyan)]">
          Scan en cours
        </span>
      </div>
      <div className="mt-2 font-[family-name:var(--font-fraunces)] italic text-[20px] leading-tight text-[color:var(--nafas-surface)]">
        {candidatesMsg ?? "Évaluation des bâtiments de Gabès · pondération multi-critères…"}
      </div>
    </div>
  );
}

function LiveTicker({ events }: { events: ProgressEvent[] }) {
  return (
    <div className="rounded-md border border-white/5 bg-black/20 px-3 py-2 font-[family-name:var(--font-jetbrains)]">
      <div className="flex items-center gap-2">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full rounded-full bg-[color:var(--nafas-cyan)] opacity-75 animate-ping" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--nafas-cyan)]" />
        </span>
        <span className="text-[9.5px] tracking-[0.22em] uppercase text-[color:var(--nafas-cyan)]">
          Stream
        </span>
      </div>
      <div className="mt-1 space-y-0.5">
        {events.map((e, i) => (
          <div key={i} className="text-[11px] text-[color:var(--nafas-ink3)] truncate">
            <span className="text-[color:var(--nafas-cyan)]/80">›</span> {e.stage}
            {e.detail ? ` — ${e.detail}` : e.for ? ` — ${e.for.lat.toFixed(3)}°N ${e.for.lon.toFixed(3)}°E` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
