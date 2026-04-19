"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppTabs, AppSheet, Eyebrow, StatusBadge } from "@/components/app/ui/Primitives";
import type { AiForecast, AiPlacement } from "@/lib/supabase/types";

type Selected =
  | { kind: "placement"; row: AiPlacement }
  | { kind: "forecast"; row: AiForecast }
  | null;

export function AiHistoryPanel({ onCompare }: { onCompare: () => void }) {
  const [tab, setTab] = useState("placements");
  const [selected, setSelected] = useState<Selected>(null);

  const placements = useQuery<AiPlacement[]>({
    queryKey: ["ai", "placements"],
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("ai_placements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data as AiPlacement[]) ?? [];
    },
  });

  const forecasts = useQuery<AiForecast[]>({
    queryKey: ["ai", "forecasts"],
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("ai_forecasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data as AiForecast[]) ?? [];
    },
  });

  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--nafas-bg2)]/40 p-5">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <Eyebrow>Historique IA · ORACLE</Eyebrow>
          <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-[20px] leading-tight">
            Scans et prévisions
          </h3>
        </div>
        <button
          type="button"
          onClick={onCompare}
          className="h-8 px-3 rounded-md border border-white/10 text-[12px] text-[color:var(--nafas-surface)] hover:bg-white/5 transition-colors"
        >
          Comparer des scénarios
        </button>
      </div>

      <AppTabs
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: "placements",
            label: `Scans (${placements.data?.length ?? 0})`,
            content: (
              <PlacementsList
                rows={placements.data ?? []}
                loading={placements.isLoading}
                onSelect={(row) => setSelected({ kind: "placement", row })}
              />
            ),
          },
          {
            value: "forecasts",
            label: `Prévisions (${forecasts.data?.length ?? 0})`,
            content: (
              <ForecastsList
                rows={forecasts.data ?? []}
                loading={forecasts.isLoading}
                onSelect={(row) => setSelected({ kind: "forecast", row })}
              />
            ),
          },
        ]}
      />

      <AppSheet
        open={Boolean(selected)}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.kind === "placement" ? "Placement · détails" : "Prévision · détails"}
        description={selected ? new Date(selected.row.created_at).toLocaleString("fr-FR") : undefined}
      >
        <div className="p-5 space-y-3">
          {selected?.kind === "placement" ? <PlacementDetail row={selected.row} /> : null}
          {selected?.kind === "forecast" ? <ForecastDetail row={selected.row} /> : null}
        </div>
      </AppSheet>
    </div>
  );
}

function PlacementsList({
  rows,
  loading,
  onSelect,
}: {
  rows: AiPlacement[];
  loading: boolean;
  onSelect: (row: AiPlacement) => void;
}) {
  if (loading) return <div className="text-[13px] text-[color:var(--nafas-ink3)] py-10 text-center">Chargement…</div>;
  if (!rows.length)
    return <div className="text-[13px] text-[color:var(--nafas-ink3)] py-10 text-center">Aucun scan enregistré. Lancez ORACLE depuis la carte.</div>;
  return (
    <ul className="divide-y divide-white/5 max-h-[360px] overflow-y-auto -mx-5 px-5">
      {rows.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onSelect(r)}
            className="w-full py-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-[color:var(--nafas-surface)] truncate">
                {r.strategy}
              </div>
              <div className="text-[11px] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)]">
                {new Date(r.created_at).toLocaleString("fr-FR")} · score {r.score.toFixed(2)}
              </div>
            </div>
            <StatusBadge
              tone={
                r.status === "approved" || r.status === "deployed"
                  ? "accent"
                  : r.status === "rejected"
                    ? "danger"
                    : "neutral"
              }
            >
              {r.status}
            </StatusBadge>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ForecastsList({
  rows,
  loading,
  onSelect,
}: {
  rows: AiForecast[];
  loading: boolean;
  onSelect: (row: AiForecast) => void;
}) {
  if (loading) return <div className="text-[13px] text-[color:var(--nafas-ink3)] py-10 text-center">Chargement…</div>;
  if (!rows.length)
    return <div className="text-[13px] text-[color:var(--nafas-ink3)] py-10 text-center">Aucune prévision. Lancez un forecast depuis un panneau ou un placement.</div>;
  return (
    <ul className="divide-y divide-white/5 max-h-[360px] overflow-y-auto -mx-5 px-5">
      {rows.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onSelect(r)}
            className="w-full py-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-[color:var(--nafas-surface)] truncate">
                {r.target_kind} · {r.target_id.slice(0, 8)}…
              </div>
              <div className="text-[11px] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)]">
                {new Date(r.created_at).toLocaleString("fr-FR")} · horizon {r.horizon_years} ans
              </div>
            </div>
            <StatusBadge tone="blue">{r.horizon_years}a</StatusBadge>
          </button>
        </li>
      ))}
    </ul>
  );
}

function PlacementDetail({ row }: { row: AiPlacement }) {
  return (
    <>
      <div className="text-[12px] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)]">
        ID · {row.id}
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="blue">{row.strategy}</StatusBadge>
        <StatusBadge tone="accent">score {row.score.toFixed(2)}</StatusBadge>
      </div>
      {row.rationale_md ? (
        <div className="mt-3 text-[13.5px] leading-[1.6] text-[color:var(--nafas-surface)] whitespace-pre-wrap">
          {row.rationale_md}
        </div>
      ) : null}
      {row.score_components ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] text-[color:var(--nafas-ink3)]">
            Composants du score
          </summary>
          <pre className="mt-2 text-[11.5px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] whitespace-pre-wrap">
            {JSON.stringify(row.score_components, null, 2)}
          </pre>
        </details>
      ) : null}
    </>
  );
}

function ForecastDetail({ row }: { row: AiForecast }) {
  return (
    <>
      <div className="text-[12px] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)]">
        {row.target_kind} · {row.target_id}
      </div>
      {row.brief_md ? (
        <div className="mt-3 text-[13.5px] leading-[1.6] text-[color:var(--nafas-surface)] whitespace-pre-wrap">
          {row.brief_md}
        </div>
      ) : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] text-[color:var(--nafas-ink3)]">
          Projections ({row.projections?.length ?? 0})
        </summary>
        <pre className="mt-2 text-[11.5px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] whitespace-pre-wrap">
          {JSON.stringify(row.projections, null, 2)}
        </pre>
      </details>
    </>
  );
}
