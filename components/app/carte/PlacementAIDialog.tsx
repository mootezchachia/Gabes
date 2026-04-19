"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, AlertTriangle, Radar, X } from "lucide-react";
import { AppSheet, Button, FormLabel, SelectField } from "@/components/app/ui/Primitives";
import { useToolStore } from "./toolStore";
import { parseSseStream } from "@/lib/sse/parseStream";
import { PlacementCard } from "./PlacementCard";
import { PlacementRunSummary } from "./PlacementRunSummary";
import { deriveImpact, type Components, type Strategy } from "@/lib/sim/impact";
import { getViewer } from "@/lib/cesium-bus";

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
interface RawPlacementEvent {
  id: string;
  location: { lon: number; lat: number };
  score: number;
  components: Record<string, number>;
  rationale_md: string | null;
  model_name: string;
}
interface PlacementEvent extends Omit<RawPlacementEvent, "components"> {
  components: Components;
}

/** Pre-short-key servers (or future schema drift) — remap long names → short. */
const KEY_REMAP: Record<string, keyof Components> = {
  pollution_severity: "ps",
  phosphate_plume: "ps",
  depth_fit: "df",
  meadow_overlap: "mo",
  shipping_lane: "sl",
  school_downwind: "sd",
  population_reached: "pp",
  people_reached: "pp",
};

function normalizeComponents(raw: Record<string, number>): Components {
  const out: Components = {};
  for (const [k, v] of Object.entries(raw)) {
    const short = KEY_REMAP[k] ?? (k as keyof Components);
    // If we've already written a short key (e.g. server already normalized),
    // prefer the higher-quality direct hit over a remap collision.
    if (out[short] == null) out[short] = v;
  }
  return out;
}

const STRATEGY_LABELS: Record<Strategy, string> = {
  phosphate_recovery: "Récupération du phosphate",
  school_protection: "Protection des écoles",
  biodiversity: "Biodiversité marine",
};

/**
 * ORACLE · Placement IA — right-side drawer.
 *
 * Design intent:
 *  - Sheet (not modal) so the 3D globe stays visible on the left, giving the
 *    user a before/after spatial reading while cards stream in.
 *  - `runStrategy` is frozen when the scan starts, so rate-editing the
 *    dropdown doesn't mislabel cards computed under a different strategy.
 *  - Components from the edge fn are normalized via `KEY_REMAP` — cards +
 *    impact deriver use short keys (ps/df/mo/sl/sd/pp) as their single source
 *    of truth, so any server-side schema drift degrades to a client-side fix
 *    rather than a UI full of zeros.
 *  - Click a zone card → Cesium camera flies to it; active card lights up
 *    with the strategy accent.
 */
export function PlacementAIDialog() {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);
  const open = tool === "ai";

  const [strategy, setStrategy] = useState<Strategy>("phosphate_recovery");
  const [runStrategy, setRunStrategy] = useState<Strategy>("phosphate_recovery");
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

  // Auto-focus the highest-scoring zone when a run completes.
  useEffect(() => {
    if (!running && placements.length > 0 && !activeId) {
      const best = [...placements].sort((a, b) => b.score - a.score)[0];
      setActiveId(best.id);
    }
  }, [running, placements, activeId]);

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
            // Keep drawer open on completion so the user can click through
            // zones; they close it explicitly via ✕.
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
    const viewer = getViewer();
    if (!viewer) return;
    try {
      // Lazy require so SSR bundles don't drag cesium in.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Cesium = require("cesium") as typeof import("cesium");
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(p.location.lon, p.location.lat - 0.012, 1400),
        orientation: {
          heading: Cesium.Math.toRadians(12),
          pitch: Cesium.Math.toRadians(-32),
          roll: 0,
        },
        duration: 1.6,
      });
    } catch {
      /* cesium not yet mounted — harmless */
    }
  }

  const aggregate = useMemo(() => {
    if (placements.length === 0) return null;
    const imp = placements.map((p) => deriveImpact(p.components, runStrategy));
    const total_p = imp.reduce((s, i) => s + i.p_year1_kg, 0);
    const total_schools = imp.reduce((s, i) => s + i.schools_sheltered, 0);
    const total_people = imp.reduce((s, i) => s + i.people_reached_k, 0);
    const total_ha = imp.reduce((s, i) => s + i.area_ha, 0);
    const total_capex = imp.reduce((s, i) => s + i.capex_keur, 0);
    const avg_score = placements.reduce((s, p) => s + p.score, 0) / placements.length;
    return { total_p, total_schools, total_people, total_ha, total_capex, avg_score };
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
      description="Proposition spatialisée de panneaux à algues (scorer 6-critères + rationales FR streamées)."
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
                  { value: "phosphate_recovery", label: STRATEGY_LABELS.phosphate_recovery },
                  { value: "school_protection", label: STRATEGY_LABELS.school_protection },
                  { value: "biodiversity", label: STRATEGY_LABELS.biodiversity },
                ]}
              />
            </div>
            <div>
              <FormLabel htmlFor="target-count">Zones</FormLabel>
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
        La baie.{" "}
        <span className="text-[color:var(--nafas-ink3)]/80">169 km² de mer.</span>
        <br />
        <span className="text-[color:var(--nafas-accent2)]">5 zones</span>{" "}
        <span className="text-[color:var(--nafas-ink3)]/80">à choisir.</span>
      </p>

      <div className="space-y-2.5 text-[13px] leading-[1.55] text-[color:var(--nafas-ink3)] max-w-[54ch]">
        <p>
          ORACLE échantillonne ~400 emplacements candidats dans le golfe, les note sur
          6&nbsp;critères (phosphate, bathymétrie, posidonie, dilution, écoles
          sous-le-vent, population), diversifie à ≥&nbsp;500&nbsp;m puis narre chaque
          choix en français via une chaîne de modèles OpenRouter gratuits.
        </p>
        <p className="text-[color:var(--nafas-ink3)]/70">
          Lancez le scan pour voir les 5 zones s&apos;allumer, puis cliquez une carte
          pour laisser la caméra s&apos;y poser.
        </p>
      </div>

      <ul className="grid grid-cols-3 gap-px bg-white/5 rounded-md overflow-hidden border border-white/5">
        {[
          { k: "Récupération", v: "phosphate", hint: "optimisé P" },
          { k: "Protection", v: "écoles", hint: "cône sous-vent" },
          { k: "Biodiversité", v: "marine", hint: "Posidonia" },
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
        {candidatesMsg ?? "Sondage du golfe · pondération multi-critères…"}
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
            {e.for ? ` — ${e.for.lat.toFixed(3)}°N ${e.for.lon.toFixed(3)}°E` : e.detail ? ` — ${e.detail}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
