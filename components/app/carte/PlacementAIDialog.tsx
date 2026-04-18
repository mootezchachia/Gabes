"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { AppDialog, Button, FormLabel, SelectField } from "@/components/app/ui/Primitives";
import { useToolStore } from "./toolStore";

type StreamEvent =
  | { type: "progress"; stage: string; detail?: string }
  | { type: "placement"; index: number; rationale: string; score: number }
  | { type: "done"; run_id: string }
  | { type: "error"; message: string };

/**
 * Placement IA dialog — posts to /api/ai/placement and renders streamed
 * SSE events. When all 5 placements are in, we close the dialog and rely
 * on the Cesium scene's own subscription (polling or Realtime) to animate
 * them onto the map.
 */
export function PlacementAIDialog() {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);
  const open = tool === "ai";

  const [strategy, setStrategy] = useState("phosphate_recovery");
  const [targetCount, setTargetCount] = useState(5);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Clear state when dialog closes.
  useEffect(() => {
    if (!open) {
      setEvents([]);
      setErr(null);
      setRunning(false);
      abortRef.current?.abort();
    }
  }, [open]);

  async function run() {
    setRunning(true);
    setEvents([]);
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

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const event = JSON.parse(payload) as StreamEvent;
            setEvents((prev) => [...prev, event]);
            if (event.type === "done") {
              // Close dialog after a short beat so users see the final card.
              setTimeout(() => setTool("select"), 600);
            }
            if (event.type === "error") setErr(event.message);
          } catch {
            // Ignore malformed lines.
          }
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

  const progress = events.filter((e) => e.type === "progress");
  const placements = events.filter((e): e is Extract<StreamEvent, { type: "placement" }> => e.type === "placement");

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

        {(progress.length > 0 || placements.length > 0 || err) && (
          <div className="rounded-md border border-white/5 bg-white/[0.02] p-3 max-h-[320px] overflow-y-auto space-y-3">
            {progress.map((p, i) => (
              <div key={`p-${i}`} className="text-[12.5px] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)]">
                <span className="text-[color:var(--nafas-cyan)]">◦</span> {p.stage}
                {p.detail ? <span className="text-[color:var(--nafas-ink3)]/70"> — {p.detail}</span> : null}
              </div>
            ))}
            {placements.map((p) => (
              <div
                key={`r-${p.index}`}
                className="rounded-md border border-[color:var(--nafas-accent)]/20 bg-[color:var(--nafas-accent)]/5 p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-accent2)]">
                    Placement #{p.index + 1}
                  </div>
                  <div className="ml-auto text-[11px] font-[family-name:var(--font-jetbrains)] tabular-nums text-[color:var(--nafas-ink3)]">
                    score · {p.score.toFixed(2)}
                  </div>
                </div>
                <p className="text-[13px] leading-[1.55] text-[color:var(--nafas-surface)]">{p.rationale}</p>
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
