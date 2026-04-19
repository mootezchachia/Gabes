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

/**
 * Planar shoelace signed area on [lon, lat] pairs. Positive = counter-clockwise,
 * negative = clockwise. The ring passed in must be OPEN (last != first).
 *
 * Small enough polygons to treat lon/lat as planar — the Gabès admin flow
 * never draws zones larger than a few km, so this is fine for winding detection.
 */
function shoelaceSignedArea(openRing: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0; i < openRing.length; i++) {
    const [x1, y1] = openRing[i]!;
    const [x2, y2] = openRing[(i + 1) % openRing.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/**
 * Convert click vertices → WKT safe for PostGIS `GEOGRAPHY(POLYGON, 4326)`.
 *
 * Why the CCW dance: GEOGRAPHY is stricter than GEOMETRY — the outer ring
 * MUST be counter-clockwise on the sphere, otherwise PostGIS interprets
 * a small CW loop as "a polygon covering the entire globe except this patch"
 * and rejects it as "Invalid or unclosed GEOGRAPHY" (surfaced to the user
 * as « géographie invalide »). Users draw freely in either direction, so we
 * normalize here.
 *
 * Also strips duplicate consecutive vertices — double-click to close often
 * leaves the closure point at the same spot as the penultimate click.
 */
function verticesToWkt(vertices: Array<[number, number]>): string {
  // Dedupe consecutive identical points
  const unique: Array<[number, number]> = [];
  for (const v of vertices) {
    const last = unique[unique.length - 1];
    if (!last || last[0] !== v[0] || last[1] !== v[1]) unique.push(v);
  }
  if (unique.length < 3) {
    throw new Error("Polygone invalide : au moins 3 sommets distincts sont requis.");
  }

  // Work on the open ring (no duplicated closing point).
  const isClosed =
    unique.length > 3 &&
    unique[0]![0] === unique[unique.length - 1]![0] &&
    unique[0]![1] === unique[unique.length - 1]![1];
  const openRing = isClosed ? unique.slice(0, -1) : unique;

  // Reverse to CCW if the user drew clockwise.
  if (shoelaceSignedArea(openRing) < 0) openRing.reverse();

  // Close the ring for WKT output.
  const ring = [...openRing, openRing[0]!]
    .map(([lng, lat]) => `${lng} ${lat}`)
    .join(", ");
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
        {open && profile?.orgId ? (() => {
          let wkt: string;
          try {
            wkt = verticesToWkt(polygon);
          } catch (e) {
            return (
              <div className="p-5 text-[13px] text-[color:var(--nafas-danger)]">
                {(e as Error).message}
              </div>
            );
          }
          return (
            <ZoneFormBody
              wkt={wkt}
              orgId={profile.orgId}
              onDone={() => {
                clearPolygon();
                setTool("select");
              }}
            />
          );
        })() : null}
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
