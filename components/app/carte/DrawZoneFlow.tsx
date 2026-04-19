"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AppSheet,
  Button,
  FormLabel,
  FormMessage,
  Input,
  SelectField,
  Textarea,
} from "@/components/app/ui/Primitives";
import { useToolStore } from "./toolStore";
import { zoneSchema } from "@/lib/app/objets/zones";
import { useProfile } from "@/lib/auth/useProfile";

function verticesToWkt(vertices: Array<[number, number]>): string {
  const closed =
    vertices.length >= 3 && vertices[0]![0] === vertices[vertices.length - 1]![0] && vertices[0]![1] === vertices[vertices.length - 1]![1]
      ? vertices
      : [...vertices, vertices[0]!];
  const ring = closed.map(([lng, lat]) => `${lng} ${lat}`).join(", ");
  return `SRID=4326;POLYGON((${ring}))`;
}

export function DrawZoneFlow() {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);
  const polygon = useToolStore((s) => s.pendingPolygon);
  const closed = useToolStore((s) => s.polygonClosed);
  const clearPolygon = useToolStore((s) => s.clearPolygon);
  const { data: profile } = useProfile();

  const open = tool === "zone" && closed && polygon.length >= 3;

  return (
    <>
      {/* In-map hint while drawing */}
      {tool === "zone" && !closed ? (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-md border border-white/10 bg-[color:var(--nafas-bg2)]/90 backdrop-blur-xl px-3 py-2 text-[12px] text-[color:var(--nafas-surface)]">
          <span className="text-[color:var(--nafas-accent2)] font-medium">Tracé en cours · </span>
          {polygon.length} sommet{polygon.length > 1 ? "s" : ""} — double-cliquez pour fermer
          {polygon.length > 0 ? (
            <button
              type="button"
              onClick={clearPolygon}
              className="ml-3 text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] underline"
            >
              effacer
            </button>
          ) : null}
        </div>
      ) : null}

      <AppSheet
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            clearPolygon();
            setTool("select");
          }
        }}
        title="Nouvelle zone"
        description={`${polygon.length} sommets`}
      >
        {open && profile?.orgId ? (
          <ZoneFormBody
            wkt={verticesToWkt(polygon)}
            orgId={profile.orgId}
            onDone={() => {
              clearPolygon();
              setTool("select");
            }}
          />
        ) : null}
      </AppSheet>
    </>
  );
}

function ZoneFormBody({ wkt, orgId, onDone }: { wkt: string; orgId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("school");
  const [metadata, setMetadata] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const insert = useMutation({
    mutationFn: async () => {
      setErr(null);
      const parsed = zoneSchema.safeParse({
        name,
        kind: kind as "school" | "hospital" | "residential" | "industrial" | "marine_protected" | "coastal" | "oasis",
        geometry_wkt: wkt,
        metadata: metadata || null,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalide");

      let metaJson: Record<string, unknown> = {};
      if (metadata) {
        try {
          metaJson = JSON.parse(metadata);
        } catch {
          throw new Error("Métadonnées : JSON invalide.");
        }
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("zones").insert({
        org_id: orgId,
        kind: parsed.data.kind,
        name: parsed.data.name,
        geometry: wkt,
        metadata: metaJson,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zones"] });
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
      <div>
        <FormLabel htmlFor="zone-name">Nom</FormLabel>
        <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <FormLabel>Type</FormLabel>
        <SelectField
          value={kind}
          onValueChange={setKind}
          options={[
            { value: "school", label: "École" },
            { value: "hospital", label: "Hôpital" },
            { value: "residential", label: "Résidentiel" },
            { value: "industrial", label: "Industriel" },
            { value: "marine_protected", label: "Marin protégé" },
            { value: "coastal", label: "Littoral" },
            { value: "oasis", label: "Oasis" },
          ]}
        />
      </div>

      <div>
        <FormLabel htmlFor="zone-metadata">Métadonnées (JSON optionnel)</FormLabel>
        <Textarea
          id="zone-metadata"
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          placeholder='{"capacity": 420}'
        />
        <FormMessage help="Laisser vide si aucune métadonnée." />
      </div>

      <details className="rounded-md border border-white/5 p-3 bg-white/[0.02]">
        <summary className="cursor-pointer text-[12px] text-[color:var(--nafas-ink3)]">
          Aperçu WKT
        </summary>
        <pre className="mt-2 text-[11px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] whitespace-pre-wrap break-all">
          {wkt}
        </pre>
      </details>

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
          {insert.isPending ? "Création…" : "Créer la zone"}
        </Button>
      </div>
    </form>
  );
}
