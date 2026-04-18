"use client";

import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Eyebrow } from "@/components/app/ui/Primitives";
import { cn } from "@/lib/utils";

type Kpi = {
  key: string;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "accent" | "amber" | "danger" | "blue" | "neutral";
};

async function loadKpis(): Promise<Kpi[]> {
  const supabase = createSupabaseBrowserClient();
  const [panels, sensors, placements, events] = await Promise.all([
    supabase.from("algae_panels").select("status, area_m2, actual_p_uptake_kg_per_year"),
    supabase.from("sensors").select("active"),
    supabase.from("ai_placements").select("status"),
    supabase
      .from("news_events")
      .select("severity, happened_at")
      .order("happened_at", { ascending: false })
      .limit(50),
  ]);

  const panelRows = (panels.data ?? []) as Array<{ status: string; area_m2: number | null; actual_p_uptake_kg_per_year: number | null }>;
  const active = panelRows.filter((p) => p.status === "active");
  const totalArea = active.reduce((s, p) => s + (p.area_m2 ?? 0), 0);
  const totalP = active.reduce((s, p) => s + (p.actual_p_uptake_kg_per_year ?? 0), 0);
  const sensorRows = (sensors.data ?? []) as Array<{ active: boolean }>;
  const activeSensors = sensorRows.filter((s) => s.active).length;
  const pendingPlacements = ((placements.data ?? []) as Array<{ status: string }>).filter(
    (p) => p.status === "draft",
  ).length;
  const eventRows = (events.data ?? []) as Array<{ severity: string; happened_at: string }>;
  const lastCrit = eventRows.find((e) => e.severity === "critical")?.happened_at;

  return [
    {
      key: "panels-active",
      label: "Panneaux actifs",
      value: active.length.toString(),
      unit: "",
      sub: `${panelRows.length} total`,
      tone: "accent",
    },
    {
      key: "area",
      label: "Surface algale",
      value: (totalArea / 10000).toFixed(2),
      unit: "ha",
      sub: `${totalArea.toLocaleString("fr-FR")} m²`,
      tone: "accent",
    },
    {
      key: "p-uptake",
      label: "P retiré (annuel)",
      value: totalP.toFixed(1),
      unit: "kg",
      tone: "accent",
    },
    {
      key: "sensors",
      label: "Capteurs actifs",
      value: activeSensors.toString(),
      unit: "",
      sub: `${sensorRows.length} total`,
      tone: "blue",
    },
    {
      key: "pending-ai",
      label: "Placements en attente",
      value: pendingPlacements.toString(),
      unit: "",
      tone: pendingPlacements > 0 ? "amber" : "neutral",
    },
    {
      key: "last-crit",
      label: "Dernier événement critique",
      value: lastCrit ? new Date(lastCrit).toLocaleDateString("fr-FR") : "—",
      sub: lastCrit ? new Date(lastCrit).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : undefined,
      tone: lastCrit ? "danger" : "neutral",
    },
  ];
}

export function KpiStrip() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytique", "kpis"],
    staleTime: 30_000,
    queryFn: loadKpis,
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {(data ?? Array.from({ length: 6 }, (_, i) => ({ key: `sk-${i}`, label: "", value: isLoading ? "…" : "—" } as Kpi))).map((k) => (
        <div
          key={k.key}
          className="rounded-lg border border-white/5 bg-[color:var(--nafas-bg2)]/60 p-4 min-h-[110px] flex flex-col justify-between"
        >
          <Eyebrow>{k.label}</Eyebrow>
          <div className="mt-2">
            <div
              className={cn(
                "font-[family-name:var(--font-fraunces)] text-[30px] leading-none tracking-[-0.02em]",
                k.tone === "accent" && "text-[color:var(--nafas-accent2)]",
                k.tone === "amber" && "text-[color:var(--nafas-amber)]",
                k.tone === "danger" && "text-[color:var(--nafas-danger)]",
                k.tone === "blue" && "text-[color:var(--nafas-blue)]",
              )}
            >
              {k.value}
              {k.unit ? (
                <span className="ml-1 text-[14px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
                  {k.unit}
                </span>
              ) : null}
            </div>
            {k.sub ? (
              <div className="mt-1 text-[11px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
                {k.sub}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
