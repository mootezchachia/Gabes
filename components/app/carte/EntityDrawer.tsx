"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppSheet, Button, StatusBadge } from "@/components/app/ui/Primitives";
import { useIsAdmin } from "@/lib/auth/useRole";
import { useToolStore } from "./toolStore";
import type { AlgaePanel, Sensor, Zone, AiPlacement } from "@/lib/supabase/types";
import { formatLngLat, pointToLngLat } from "@/lib/app/geo";

type EntityRow = AlgaePanel | Sensor | Zone | AiPlacement;

async function fetchEntity(kind: string, id: string): Promise<EntityRow | null> {
  const supabase = createSupabaseBrowserClient();
  const table =
    kind === "panel"
      ? "algae_panels"
      : kind === "sensor"
        ? "sensors"
        : kind === "zone"
          ? "zones"
          : kind === "placement"
            ? "ai_placements"
            : null;
  if (!table) return null;
  const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  return (data as EntityRow | null) ?? null;
}

export function EntityDrawer() {
  const selected = useToolStore((s) => s.selectedEntity);
  const selectEntity = useToolStore((s) => s.selectEntity);
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();

  const { data: entity, isLoading } = useQuery({
    enabled: Boolean(selected),
    queryKey: ["entity", selected?.kind, selected?.id],
    staleTime: 15_000,
    queryFn: () => (selected ? fetchEntity(selected.kind, selected.id) : null),
  });

  const softDelete = useMutation({
    mutationFn: async () => {
      if (!selected || !isAdmin) return;
      const supabase = createSupabaseBrowserClient();
      if (selected.kind === "panel") {
        await supabase
          .from("algae_panels")
          .update({ status: "removed", removed_at: new Date().toISOString().slice(0, 10) })
          .eq("id", selected.id);
      } else if (selected.kind === "sensor") {
        await supabase.from("sensors").update({ active: false }).eq("id", selected.id);
      }
      // Zones and placements: no soft delete UI in V2.
    },
    onSuccess: () => {
      qc.invalidateQueries();
      selectEntity(null);
    },
  });

  const title =
    selected?.kind === "panel"
      ? "Panneau à algues"
      : selected?.kind === "sensor"
        ? "Capteur"
        : selected?.kind === "zone"
          ? "Zone"
          : selected?.kind === "placement"
            ? "Placement IA"
            : "Entité";

  return (
    <AppSheet
      open={Boolean(selected)}
      onOpenChange={(o) => {
        if (!o) selectEntity(null);
      }}
      title={title}
      description={selected ? `ID · ${selected.id.slice(0, 8)}…` : undefined}
    >
      <div className="px-5 py-5 space-y-4">
        {isLoading ? (
          <div className="text-[13px] text-[color:var(--nafas-ink3)]">Chargement…</div>
        ) : !entity ? (
          <div className="text-[13px] text-[color:var(--nafas-danger)]">Introuvable ou non autorisé.</div>
        ) : (
          <EntityDetailBody entity={entity} kind={selected!.kind} />
        )}

        {isAdmin && entity && (selected!.kind === "panel" || selected!.kind === "sensor") ? (
          <div className="pt-2 border-t border-white/5">
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Confirmer la suppression douce ?")) softDelete.mutate();
              }}
              disabled={softDelete.isPending}
            >
              {selected!.kind === "panel" ? "Marquer comme retiré" : "Désactiver le capteur"}
            </Button>
          </div>
        ) : null}
        {!isAdmin && entity ? (
          <div className="text-[11.5px] text-[color:var(--nafas-ink3)] italic">
            Lecture seule · rôle superviseur.
          </div>
        ) : null}
      </div>
    </AppSheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
        {label}
      </div>
      <div className="text-[13px] text-[color:var(--nafas-surface)] text-right max-w-[60%] break-words">
        {children}
      </div>
    </div>
  );
}

function EntityDetailBody({ entity, kind }: { entity: EntityRow; kind: string }) {
  if (kind === "panel") {
    const p = entity as AlgaePanel;
    const ll = pointToLngLat(p.location);
    return (
      <div className="space-y-1">
        <Row label="État">
          <StatusBadge
            tone={
              p.status === "active"
                ? "accent"
                : p.status === "deploying"
                  ? "amber"
                  : p.status === "removed"
                    ? "danger"
                    : "neutral"
            }
          >
            {p.status}
          </StatusBadge>
        </Row>
        <Row label="Position">{formatLngLat(ll, 5)}</Row>
        <Row label="Surface">{p.area_m2} m²</Row>
        <Row label="Espèce">{p.algae_species ?? "—"}</Row>
        <Row label="P attendu">{p.expected_p_uptake_kg_per_year ?? "—"} kg/an</Row>
        <Row label="P mesuré">{p.actual_p_uptake_kg_per_year ?? "—"} kg/an</Row>
        <Row label="Déployé">{p.deployed_at ?? "—"}</Row>
        {p.notes ? (
          <div className="pt-2 mt-1 border-t border-white/5 text-[12.5px] text-[color:var(--nafas-ink3)]">
            {p.notes}
          </div>
        ) : null}
      </div>
    );
  }
  if (kind === "sensor") {
    const s = entity as Sensor;
    const ll = pointToLngLat(s.location);
    return (
      <div className="space-y-1">
        <Row label="Type">{s.type}</Row>
        <Row label="Unité">{s.unit}</Row>
        <Row label="Actif">{s.active ? "Oui" : "Non"}</Row>
        <Row label="Source">{s.source}</Row>
        <Row label="Identifiant">{s.device_id ?? "—"}</Row>
        <Row label="Position">{formatLngLat(ll, 5)}</Row>
        <Row label="Seuils">
          <span className="font-[family-name:var(--font-jetbrains)] text-[12px] tabular-nums">
            {s.thresholds && Object.keys(s.thresholds).length
              ? Object.entries(s.thresholds)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(" · ")
              : "—"}
          </span>
        </Row>
      </div>
    );
  }
  if (kind === "zone") {
    const z = entity as Zone;
    return (
      <div className="space-y-1">
        <Row label="Nom">{z.name}</Row>
        <Row label="Type">{z.kind}</Row>
        <Row label="Créée">{new Date(z.created_at).toLocaleString("fr-FR")}</Row>
      </div>
    );
  }
  if (kind === "placement") {
    const p = entity as AiPlacement;
    return (
      <div className="space-y-1">
        <Row label="Stratégie">{p.strategy}</Row>
        <Row label="Score">
          <span className="font-[family-name:var(--font-jetbrains)] tabular-nums">
            {p.score.toFixed(2)}
          </span>
        </Row>
        <Row label="Surface proposée">{p.proposed_area_m2} m²</Row>
        <Row label="État">
          <StatusBadge
            tone={
              p.status === "approved" || p.status === "deployed"
                ? "accent"
                : p.status === "rejected"
                  ? "danger"
                  : "neutral"
            }
          >
            {p.status}
          </StatusBadge>
        </Row>
        {p.rationale_md ? (
          <div className="pt-2 mt-1 border-t border-white/5 text-[13px] leading-[1.55] text-[color:var(--nafas-surface)]">
            {p.rationale_md}
          </div>
        ) : null}
      </div>
    );
  }
  return null;
}
