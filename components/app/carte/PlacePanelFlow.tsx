"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppSheet, Button, FormLabel, FormMessage, Input, SelectField, Textarea } from "@/components/app/ui/Primitives";
import { useToolStore } from "./toolStore";
import { panneauSchema } from "@/lib/app/objets/panneaux";
import { lngLatToGeoJson, formatLngLat } from "@/lib/app/geo";
import { useProfile } from "@/lib/auth/useProfile";

/**
 * Admin flow: click Placer un panneau → click map → form opens in a right
 * drawer. Submit inserts into `algae_panels` and relies on the Cesium
 * scene's own subscription to pick up the new row.
 */
export function PlacePanelFlow() {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);
  const pendingPoint = useToolStore((s) => s.pendingPoint);
  const setPendingPoint = useToolStore((s) => s.setPendingPoint);
  const { data: profile } = useProfile();
  const open = tool === "panel" && pendingPoint !== null;

  return (
    <AppSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPendingPoint(null);
          setTool("select");
        }
      }}
      title="Placer un panneau"
      description={pendingPoint ? formatLngLat(pendingPoint, 5) : "Cliquez sur la carte"}
    >
      {pendingPoint && profile?.orgId ? (
        <PanelFormBody
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

function PanelFormBody({
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
  const [area, setArea] = useState<number>(500);
  const [species, setSpecies] = useState("ulva_lactuca");
  const [status, setStatus] = useState("planned");
  const [expected, setExpected] = useState<number | null>(null);
  const [materialNotes, setMaterialNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Auto-compute expected phosphate uptake: 45 kg/ha/yr = 0.0045 kg/m²/yr
  const autoExpected = useMemo(() => +(area * 0.0045).toFixed(2), [area]);
  useEffect(() => {
    if (expected === null) {
      // keep as null — we'll send the auto value at submit
    }
  }, [expected, autoExpected]);

  const insert = useMutation({
    mutationFn: async () => {
      setErr(null);
      const parsed = panneauSchema.safeParse({
        area_m2: area,
        algae_species: species,
        status: status as "planned" | "deploying" | "active" | "removed",
        expected_p_uptake_kg_per_year: expected ?? autoExpected,
        material_notes: materialNotes || null,
        notes: notes || null,
        location_lng: point[0],
        location_lat: point[1],
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      }
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("algae_panels").insert({
        org_id: orgId,
        location: lngLatToGeoJson(point),
        area_m2: parsed.data.area_m2,
        algae_species: parsed.data.algae_species,
        status: parsed.data.status,
        expected_p_uptake_kg_per_year: parsed.data.expected_p_uptake_kg_per_year ?? null,
        material_notes: parsed.data.material_notes ?? null,
        notes: parsed.data.notes ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["panels"] });
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

      <div>
        <FormLabel htmlFor="area">Surface (m²)</FormLabel>
        <Input
          id="area"
          type="number"
          min={1}
          value={area}
          onChange={(e) => setArea(parseFloat(e.target.value))}
          required
        />
        <FormMessage help={`≈ ${autoExpected} kg P/an attendus (45 kg/ha/an).`} />
      </div>

      <div>
        <FormLabel>Espèce</FormLabel>
        <SelectField
          value={species}
          onValueChange={setSpecies}
          options={[
            { value: "ulva_lactuca", label: "Ulva lactuca (laitue de mer)" },
            { value: "caulerpa_prolifera", label: "Caulerpa prolifera" },
            { value: "cystoseira_compressa", label: "Cystoseira compressa" },
          ]}
        />
      </div>

      <div>
        <FormLabel>État</FormLabel>
        <SelectField
          value={status}
          onValueChange={setStatus}
          options={[
            { value: "planned", label: "Prévu" },
            { value: "deploying", label: "Déploiement" },
            { value: "active", label: "Actif" },
            { value: "removed", label: "Retiré" },
          ]}
        />
      </div>

      <div>
        <FormLabel htmlFor="expected">P attendu (kg/an)</FormLabel>
        <Input
          id="expected"
          type="number"
          min={0}
          value={expected ?? ""}
          placeholder={autoExpected.toString()}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setExpected(Number.isNaN(v) ? null : v);
          }}
        />
        <FormMessage help="Laisser vide pour utiliser la valeur auto-calculée." />
      </div>

      <div>
        <FormLabel htmlFor="material_notes">Notes matériaux</FormLabel>
        <Textarea
          id="material_notes"
          value={materialNotes}
          onChange={(e) => setMaterialNotes(e.target.value)}
          placeholder="Structure en Fosfo, flottabilité…"
        />
      </div>

      <div>
        <FormLabel htmlFor="notes">Notes internes</FormLabel>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
          {insert.isPending ? "Création…" : "Créer le panneau"}
        </Button>
      </div>
    </form>
  );
}
