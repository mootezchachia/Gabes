"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AppSheet,
  Button,
  FormLabel,
  FormMessage,
  Input,
  SelectField,
  ToggleField,
} from "@/components/app/ui/Primitives";
import { useToolStore } from "./toolStore";
import { capteurSchema, capteurUnitDefaults } from "@/lib/app/objets/capteurs";
import { formatLngLat, haversine, lngLatToGeoJson, pointToLngLat } from "@/lib/app/geo";
import { useProfile } from "@/lib/auth/useProfile";
import type { AlgaePanel } from "@/lib/supabase/types";

export function PlaceSensorFlow() {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);
  const pendingPoint = useToolStore((s) => s.pendingPoint);
  const setPendingPoint = useToolStore((s) => s.setPendingPoint);
  const { data: profile } = useProfile();
  const open = tool === "sensor" && pendingPoint !== null;

  return (
    <AppSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPendingPoint(null);
          setTool("select");
        }
      }}
      title="Placer un capteur"
      description={pendingPoint ? formatLngLat(pendingPoint, 5) : "Cliquez sur la carte"}
    >
      {pendingPoint && profile?.orgId ? (
        <SensorFormBody
          point={pendingPoint}
          orgId={profile.orgId}
          onDone={() => {
            setPendingPoint(null);
            setTool("select");
          }}
          onRepick={() => setPendingPoint(null)}
        />
      ) : null}
    </AppSheet>
  );
}

function SensorFormBody({
  point,
  orgId,
  onDone,
  onRepick,
}: {
  point: [number, number];
  orgId: string;
  onDone: () => void;
  onRepick: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<keyof typeof capteurUnitDefaults>("so2");
  const [unit, setUnit] = useState<string>(capteurUnitDefaults["so2"]!);
  const [active, setActive] = useState(true);
  const [source, setSource] = useState("simulated");
  const [deviceId, setDeviceId] = useState("");
  const [panelId, setPanelId] = useState<string | null>(null);
  const [warn, setWarn] = useState<string>("");
  const [crit, setCrit] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  // Auto-unit when type changes
  useEffect(() => {
    setUnit(capteurUnitDefaults[type] ?? "");
  }, [type]);

  // Auto-attach to nearby panel (< 50m).
  const { data: nearbyPanel } = useQuery<Pick<AlgaePanel, "id" | "location"> | null>({
    queryKey: ["sensor-flow", "nearby-panel", point.join(",")],
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("algae_panels").select("id, location").limit(500);
      if (!data) return null;
      let best: { id: string; dist: number; loc: [number, number] } | null = null;
      for (const row of data as Array<Pick<AlgaePanel, "id" | "location">>) {
        const ll = pointToLngLat(row.location);
        if (!ll) continue;
        const d = haversine(point, ll);
        if (d < 50 && (!best || d < best.dist)) {
          best = { id: row.id, dist: d, loc: ll };
        }
      }
      return best ? { id: best.id, location: lngLatToGeoJson(best.loc) } : null;
    },
  });
  useEffect(() => {
    if (nearbyPanel && !panelId) setPanelId(nearbyPanel.id);
  }, [nearbyPanel, panelId]);

  const insert = useMutation({
    mutationFn: async () => {
      setErr(null);
      const parsed = capteurSchema.safeParse({
        type,
        unit,
        active,
        source,
        device_id: deviceId || null,
        panel_id: panelId || null,
        location_lng: point[0],
        location_lat: point[1],
        threshold_warning: warn ? parseFloat(warn) : null,
        threshold_critical: crit ? parseFloat(crit) : null,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalide");

      const thresholds: Record<string, number> = {};
      if (parsed.data.threshold_warning != null) thresholds.warning = parsed.data.threshold_warning;
      if (parsed.data.threshold_critical != null) thresholds.critical = parsed.data.threshold_critical;

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("sensors").insert({
        org_id: orgId,
        location: lngLatToGeoJson(point),
        panel_id: parsed.data.panel_id ?? null,
        type: parsed.data.type,
        unit: parsed.data.unit,
        thresholds,
        active: parsed.data.active,
        source: parsed.data.source,
        device_id: parsed.data.device_id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sensors"] });
      qc.invalidateQueries({ queryKey: ["palette", "corpus"] });
      onDone();
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        insert.mutate();
      }}
      className="px-5 py-5 space-y-4"
      noValidate
    >
      <div className="rounded-md border border-white/5 bg-white/[0.02] p-3">
        <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)] mb-1">
          Position
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-[family-name:var(--font-jetbrains)] tabular-nums">
            {formatLngLat(point, 5)}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onRepick}>
            Modifier
          </Button>
        </div>
      </div>

      {nearbyPanel ? (
        <div className="rounded-md border border-[color:var(--nafas-accent)]/25 bg-[color:var(--nafas-accent)]/8 px-3 py-2 text-[12.5px] text-[color:var(--nafas-accent2)]">
          Panneau proche détecté — associé automatiquement.
        </div>
      ) : null}

      <div>
        <FormLabel>Type</FormLabel>
        <SelectField
          value={type}
          onValueChange={(v) => setType(v as keyof typeof capteurUnitDefaults)}
          options={[
            { value: "so2", label: "SO₂ — dioxyde de soufre" },
            { value: "no2", label: "NO₂ — dioxyde d'azote" },
            { value: "pm25", label: "PM2.5" },
            { value: "pm10", label: "PM10" },
            { value: "ph", label: "pH" },
            { value: "turbidity", label: "Turbidité" },
            { value: "chlorophyll_a", label: "Chlorophylle-a" },
            { value: "temperature", label: "Température" },
          ]}
        />
      </div>

      <div>
        <FormLabel htmlFor="unit">Unité</FormLabel>
        <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} required />
      </div>

      <div>
        <FormLabel htmlFor="device_id">Identifiant appareil</FormLabel>
        <Input id="device_id" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="NAFAS-CAP-001" />
      </div>

      <div>
        <FormLabel>Source</FormLabel>
        <SelectField
          value={source}
          onValueChange={setSource}
          options={[
            { value: "simulated", label: "Simulé" },
            { value: "hardware", label: "Matériel" },
          ]}
        />
      </div>

      <div>
        <ToggleField checked={active} onCheckedChange={setActive} label="Capteur actif" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormLabel htmlFor="warn">Seuil d&apos;alerte</FormLabel>
          <Input id="warn" type="number" step="any" value={warn} onChange={(e) => setWarn(e.target.value)} />
        </div>
        <div>
          <FormLabel htmlFor="crit">Seuil critique</FormLabel>
          <Input id="crit" type="number" step="any" value={crit} onChange={(e) => setCrit(e.target.value)} />
        </div>
      </div>

      {err ? (
        <div className="rounded-md border border-[color:var(--nafas-danger)]/30 bg-[color:var(--nafas-danger)]/10 px-3 py-2 text-[12.5px] text-[color:var(--nafas-danger)]">
          {err}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone} disabled={insert.isPending}>
          Annuler
        </Button>
        <Button type="submit" disabled={insert.isPending}>
          {insert.isPending ? "Création…" : "Créer le capteur"}
        </Button>
      </div>
    </form>
  );
}
