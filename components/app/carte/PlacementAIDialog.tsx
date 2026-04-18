"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { AppDialog, Button, FormLabel, SelectField } from "@/components/app/ui/Primitives";
import { useToolStore } from "./toolStore";
import { parseSseStream } from "@/lib/sse/parseStream";

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
interface PlacementEvent {
  id: string;
  location: { lon: number; lat: number };
  score: number;
  components: Record<string, number>;
  rationale_md: string | null;
  model_name: string;
}
/**
 * Placement IA dialog — posts to /api/ai/placement and renders streamed
 * SSE events. The server emits named SSE events (`event: placement\ndata: …`)
 * so we parse via `parseSseStream` and discriminate on the event name.
 *
 * When `done` arrives we close the dialog and rely on the Cesium scene's
 * own subscription (polling or Supabase Realtime) to animate placements
 * onto the map.
 */
export function PlacementAIDialog() {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);
  const open = tool === "ai";

  const [strategy, setStrategy] = useState("phosphate_recovery");
  const [targetCount, setTargetCount] = useState(5);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [placements, setPlacements] = useState<PlacementEvent[]>([]);
  const [runInfo, setRunInfo] = useState<RunEvent | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight stream when the dialog closes. State cleanup is
  // owned by `run()` (it resets all fields at the top of each scan), so
  // there's nothing to setState here — avoids the React 19 "setState in
  // effect" rule while keeping the abort side-effect.
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  async function run() {
    setRunning(true);
    setProgress([]);
    setPlacements([]);
    setRunInfo(null);
    setErr(null);
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
          case "placement":
            setPlacements((prev) => [...prev, ev.data as PlacementEvent]);
            break;
          case "error": {
            const m =
              (ev.data as { message?: string } | null)?.message ?? "Erreur inconnue";
            setErr(m);
            break;
          }
          case "done":
            // Close dialog after a short beat so users see the final card.
            setTimeout(() => setTool("select"), 800);
            break;
          default:
            // Ignore unknown event names (keeps us forward-compatible).
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

  const hasFeed = progress.length > 0 || placements.length > 0 || err !== null || runInfo !== null;

  return (
    <AppDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTool("select");
      }}
      title="ORACLE · Placement IA"
      description="Proposition spatialisée de panneaux à algues (scorer + rationales FR)."
      widthClassName="w-[min(640px,calc(100vw-2rem))]"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel>Stratégie</FormLabel>
            <SelectField
              value={strategy}
              onValueChange={setStrategy}
              options={[
                { value: "phosphate_recovery", label: "Récupération du phosphate" },
                { value: "school_protection", label: "Protection des écoles" },
                { value: "biodiversity", label: "Biodiversité marine" },
              ]}
            />
          </div>
          <div>
            <FormLabel htmlFor="target-count">Nombre de zones</FormLabel>
            <input
              id="target-count"
              type="number"
              min={1}
              max={10}
              value={targetCount}
              onChange={(e) => setTargetCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
              className="w-full h-9 px-3 rounded-md bg-[color:var(--nafas-bg)] border border-white/10 text-[13.5px] focus:outline-none focus:border-[color:var(--nafas-accent)]"
              disabled={running}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[12px] text-[color:var(--nafas-ink3)]">
            Diversification ≥ 500 m · modèles OpenRouter gratuits (fallback chain).
          </div>
          {!running ? (
            <Button onClick={run} disabled={running}>
              <Sparkles className="size-4" strokeWidth={1.6} />
              Lancer le scan
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => abortRef.current?.abort()}>
              Interrompre
            </Button>
          )}
        </div>

        {hasFeed && (
          <div className="rounded-md border border-white/5 bg-white/[0.02] p-3 max-h-[320px] overflow-y-auto space-y-3">
            {runInfo ? (
              <div className="text-[11.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.12em] uppercase text-[color:var(--nafas-cyan)]">
                Run · {runInfo.candidates} candidats → {runInfo.picked} retenus
              </div>
            ) : null}

            {progress.map((p, i) => (
              <div
                key={`p-${i}`}
                className="text-[12.5px] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)]"
              >
                <span className="text-[color:var(--nafas-cyan)]">◦</span> {p.stage}
                {p.for ? (
                  <span className="text-[color:var(--nafas-ink3)]/70">
                    {" "}
                    — {p.for.lat.toFixed(4)}°N {p.for.lon.toFixed(4)}°E
                  </span>
                ) : p.detail ? (
                  <span className="text-[color:var(--nafas-ink3)]/70"> — {p.detail}</span>
                ) : null}
              </div>
            ))}

            {placements.map((p, i) => (
              <div
                key={`r-${p.id}`}
                className="rounded-md border border-[color:var(--nafas-accent)]/20 bg-[color:var(--nafas-accent)]/5 p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-accent2)]">
                    Placement #{i + 1}
                  </div>
                  <div className="ml-auto text-[11px] font-[family-name:var(--font-jetbrains)] tabular-nums text-[color:var(--nafas-ink3)]">
                    score · {p.score.toFixed(2)}
                  </div>
                </div>
                <p className="text-[13px] leading-[1.55] text-[color:var(--nafas-surface)]">
                  {p.rationale_md ?? (
                    <span className="italic text-[color:var(--nafas-ink3)]">
                      Aucune justification LLM (modèle indisponible) — score brut uniquement.
                    </span>
                  )}
                </p>
                <div className="mt-2 text-[11px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]/70">
                  {p.location.lat.toFixed(4)}°N {p.location.lon.toFixed(4)}°E · modèle: {p.model_name}
                </div>
              </div>
            ))}

            {err ? (
              <div className="text-[12.5px] text-[color:var(--nafas-danger)]">Erreur : {err}</div>
            ) : null}
          </div>
        )}
      </div>
    </AppDialog>
  );
}
