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
  ReferenceLine,
} from "recharts";
import { Button, Eyebrow, SelectField } from "@/components/app/ui/Primitives";
import type { Sensor, SensorReading } from "@/lib/supabase/types";

type SensorPick = Pick<Sensor, "id" | "type" | "unit" | "thresholds" | "device_id" | "label">;

const COLORS = ["#3EC99A", "#378ADD", "#EF9F27", "#3EC9D0", "#E24B4A"] as const;

export function SensorTrendsChart() {
  const supabase = createSupabaseBrowserClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("");

  const sensors = useQuery<SensorPick[]>({
    queryKey: ["analytique", "sensors"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sensors")
        .select("id, type, unit, thresholds, device_id, label")
        .eq("active", true)
        .limit(100);
      if (error) throw new Error(error.message);
      return (data as SensorPick[]) ?? [];
    },
  });

  const filteredSensors = useMemo(() => {
    const list = sensors.data ?? [];
    return typeFilter ? list.filter((s) => s.type === typeFilter) : list;
  }, [sensors.data, typeFilter]);

  // Pick the first 3 sensors by default when data loads.
  const activeIds = selectedIds.length
    ? selectedIds
    : filteredSensors.slice(0, 3).map((s) => s.id);

  const readings = useQuery({
    queryKey: ["analytique", "readings", activeIds.join(",")],
    enabled: activeIds.length > 0,
    staleTime: 30_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sensor_readings")
        .select("sensor_id, value, taken_at")
        .in("sensor_id", activeIds)
        .order("taken_at", { ascending: true })
        .limit(2000);
      if (error) throw new Error(error.message);
      return (data as Pick<SensorReading, "sensor_id" | "value" | "taken_at">[]) ?? [];
    },
  });

  const chartData = useMemo(() => {
    // Pivot by timestamp bucket.
    const bySlot = new Map<string, Record<string, number | string>>();
    for (const r of readings.data ?? []) {
      const slot = new Date(r.taken_at).toISOString().slice(0, 16); // minute res
      if (!bySlot.has(slot)) bySlot.set(slot, { t: slot });
      bySlot.get(slot)![`s_${r.sensor_id}`] = r.value;
    }
    return Array.from(bySlot.values()).sort((a, b) => (a.t as string).localeCompare(b.t as string));
  }, [readings.data]);

  const types = Array.from(new Set((sensors.data ?? []).map((s) => s.type)));

  function exportCsv() {
    if (!readings.data?.length) return;
    const header = ["sensor_id", "value", "taken_at"].join(",");
    const body = readings.data
      .map((r) => [r.sensor_id, r.value, r.taken_at].join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sensor-readings-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--nafas-bg2)]/40 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <Eyebrow>Tendances capteurs</Eyebrow>
          <h3 className="mt-1 font-[family-name:var(--font-fraunces)] text-[20px] leading-tight">
            Lectures des 7 derniers jours
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-40">
            <SelectField
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v === "__all__" ? "" : v);
                setSelectedIds([]);
              }}
              placeholder="Tous les types"
              options={[
                { value: "__all__", label: "Tous les types" },
                ...types.map((t) => ({ value: t, label: t })),
              ]}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!readings.data?.length}>
            CSV
          </Button>
        </div>
      </div>

      {/* Legend with toggles */}
      <div className="flex flex-wrap gap-2 mb-3">
        {filteredSensors.slice(0, 8).map((s, idx) => {
          const on = activeIds.includes(s.id);
          const color = COLORS[idx % COLORS.length];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                setSelectedIds((prev) =>
                  prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                )
              }
              className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[11.5px] transition-colors ${
                on
                  ? "bg-white/5 text-[color:var(--nafas-surface)] border border-white/15"
                  : "text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] border border-transparent"
              }`}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-[family-name:var(--font-jetbrains)]">
                {s.label ?? s.device_id ?? s.id.slice(0, 6)}
              </span>
              <span className="text-[10px] opacity-70">
                {s.type}
              </span>
            </button>
          );
        })}
      </div>

      <div className="h-[320px]">
        {chartData.length === 0 ? (
          <div className="h-full grid place-items-center text-[13px] text-[color:var(--nafas-ink3)]">
            Aucune lecture disponible. Le simulateur s&apos;active toutes les 2 minutes dès que des capteurs existent.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="t"
                tick={{ fill: "#9A998F", fontSize: 10, fontFamily: "var(--font-jetbrains), monospace" }}
                tickFormatter={(v: string) => v.slice(5, 16).replace("T", " ")}
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
                labelStyle={{ color: "#9A998F" }}
              />
              {filteredSensors.slice(0, 8).map((s, idx) => {
                if (!activeIds.includes(s.id)) return null;
                return (
                  <Line
                    key={s.id}
                    dataKey={`s_${s.id}`}
                    type="monotone"
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                );
              })}
              {filteredSensors
                .filter((s) => activeIds.includes(s.id))
                .flatMap((s) => {
                  const t = s.thresholds ?? {};
                  const lines: React.ReactNode[] = [];
                  if (typeof t.warning === "number")
                    lines.push(
                      <ReferenceLine
                        key={`w-${s.id}`}
                        y={t.warning}
                        stroke="#EF9F27"
                        strokeDasharray="4 4"
                        strokeOpacity={0.6}
                      />,
                    );
                  if (typeof t.critical === "number")
                    lines.push(
                      <ReferenceLine
                        key={`c-${s.id}`}
                        y={t.critical}
                        stroke="#E24B4A"
                        strokeDasharray="4 4"
                        strokeOpacity={0.7}
                      />,
                    );
                  return lines;
                })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
