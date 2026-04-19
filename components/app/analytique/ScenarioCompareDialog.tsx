"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AppDialog, Eyebrow, SelectField } from "@/components/app/ui/Primitives";
import type { AiForecast } from "@/lib/supabase/types";

/**
 * Side-by-side forecast compare. The design doc describes mini-maps with a
 * synced year scrubber; for V2 we keep it to two line charts + year slider
 * + projected values table. Map integration is deferred to V2.1 once the
 * backend shapes are stable.
 */
export function ScenarioCompareDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");
  const [year, setYear] = useState<number>(0);

  const { data: forecasts } = useQuery<AiForecast[]>({
    queryKey: ["ai", "forecasts"],
    staleTime: 30_000,
    enabled: open,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("ai_forecasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as AiForecast[]) ?? [];
    },
  });

  const options = useMemo(
    () =>
      (forecasts ?? []).map((f) => ({
        value: f.id,
        label: `${new Date(f.created_at).toLocaleDateString("fr-FR")} · ${f.target_kind} ${f.target_id.slice(0, 6)} · ${f.horizon_years}a`,
      })),
    [forecasts],
  );

  const A = (forecasts ?? []).find((f) => f.id === aId);
  const B = (forecasts ?? []).find((f) => f.id === bId);

  const maxYear = Math.max(A?.horizon_years ?? 0, B?.horizon_years ?? 0);

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Comparer deux scénarios"
      description="Superposez deux prévisions pour visualiser l'écart cumulatif."
      widthClassName="w-[min(960px,calc(100vw-2rem))]"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Eyebrow>Scénario A</Eyebrow>
            <div className="mt-1">
              <SelectField
                value={aId}
                onValueChange={setAId}
                options={options}
                placeholder="Choisir une prévision…"
              />
            </div>
          </div>
          <div>
            <Eyebrow>Scénario B</Eyebrow>
            <div className="mt-1">
              <SelectField
                value={bId}
                onValueChange={setBId}
                options={options}
                placeholder="Choisir une prévision…"
              />
            </div>
          </div>
        </div>

        {A && B ? (
          <>
            <ScenarioChart a={A} b={B} />
            <div>
              <div className="flex items-center justify-between mb-1">
                <Eyebrow>Année</Eyebrow>
                <div className="text-[12px] font-[family-name:var(--font-jetbrains)] tabular-nums">
                  An {year} / {maxYear}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={maxYear}
                step={1}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full accent-[color:var(--nafas-accent)]"
                aria-label="Année de lecture"
              />
              <YearSnapshot a={A} b={B} year={year} />
            </div>
          </>
        ) : (
          <div className="text-[13px] text-[color:var(--nafas-ink3)] py-10 text-center">
            Sélectionnez deux prévisions pour démarrer la comparaison.
          </div>
        )}
      </div>
    </AppDialog>
  );
}

function ScenarioChart({ a, b }: { a: AiForecast; b: AiForecast }) {
  // Assume each projection is { year: number, p_removed_kg: number, ... }
  const data = useMemo(() => {
    const horizon = Math.max(a.horizon_years, b.horizon_years);
    const rows: Array<Record<string, number>> = [];
    for (let y = 0; y <= horizon; y++) {
      const ap = (a.projections ?? []).find((p) => (p.year as number) === y);
      const bp = (b.projections ?? []).find((p) => (p.year as number) === y);
      rows.push({
        year: y,
        A: ap ? Number((ap.p_removed_kg as number) ?? 0) : 0,
        B: bp ? Number((bp.p_removed_kg as number) ?? 0) : 0,
      });
    }
    return rows;
  }, [a, b]);

  return (
    <div className="h-[260px] rounded-md border border-white/5 bg-white/[0.02] p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="year"
            tick={{ fill: "#9A998F", fontSize: 10, fontFamily: "var(--font-jetbrains), monospace" }}
            stroke="rgba(255,255,255,0.15)"
          />
          <YAxis
            tick={{ fill: "#9A998F", fontSize: 10, fontFamily: "var(--font-jetbrains), monospace" }}
            stroke="rgba(255,255,255,0.15)"
          />
          <RTooltip
            contentStyle={{
              background: "#111821",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line dataKey="A" stroke="#3EC99A" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line dataKey="B" stroke="#EF9F27" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function YearSnapshot({ a, b, year }: { a: AiForecast; b: AiForecast; year: number }) {
  const ap = (a.projections ?? []).find((p) => (p.year as number) === year);
  const bp = (b.projections ?? []).find((p) => (p.year as number) === year);
  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      <ScenarioBlock title="A" point={ap} color="text-[color:var(--nafas-accent2)]" />
      <ScenarioBlock title="B" point={bp} color="text-[color:var(--nafas-amber)]" />
    </div>
  );
}

function ScenarioBlock({
  title,
  point,
  color,
}: {
  title: string;
  point: Record<string, number> | undefined;
  color: string;
}) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] p-3">
      <div className={`text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase ${color}`}>
        Scénario {title}
      </div>
      {point ? (
        <ul className="mt-2 space-y-1 text-[12.5px] font-[family-name:var(--font-jetbrains)] tabular-nums">
          {Object.entries(point)
            .filter(([k]) => k !== "year")
            .map(([k, v]) => (
              <li key={k} className="flex justify-between gap-2">
                <span className="text-[color:var(--nafas-ink3)]">{k}</span>
                <span>{Number(v).toFixed(2)}</span>
              </li>
            ))}
        </ul>
      ) : (
        <div className="text-[12px] text-[color:var(--nafas-ink3)] italic mt-1">Aucune donnée pour cette année.</div>
      )}
    </div>
  );
}
