"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EntityConfig } from "@/lib/app/entity";
import { Button, Eyebrow, AppDialog } from "./ui/Primitives";
import { EntityForm } from "./EntityForm";
import { EntityDataTable } from "./EntityDataTable";
import { useIsAdmin } from "@/lib/auth/useRole";
import { useProfile } from "@/lib/auth/useProfile";
import { lngLatToGeoJson, pointToLngLat } from "@/lib/app/geo";
import type { GeoPoint } from "@/lib/supabase/types";

/**
 * Generic Objets page. The entity-specific mapping between form values and
 * DB row shape lives inline here — intentionally, because location fields
 * are synthesised across all four entities and the Supabase row shapes are
 * close enough that a lookup table is clearer than a plugin system.
 */
type RowWithId = { id: string };

function rowToFormInitial<Row extends RowWithId>(row: Row): Record<string, unknown> {
  const r = row as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { ...r };
  for (const key of ["location", "proposed_location", "home_location", "school_location"]) {
    const v = r[key];
    if (v) {
      const ll = pointToLngLat(v as GeoPoint);
      if (ll) {
        if (key === "location") {
          out.location_lng = ll[0];
          out.location_lat = ll[1];
        }
      }
    }
  }
  if (r.thresholds && typeof r.thresholds === "object") {
    const t = r.thresholds as Record<string, number>;
    out.threshold_warning = t.warning ?? null;
    out.threshold_critical = t.critical ?? null;
  }
  return out;
}

function formValuesToRow<Row>(
  config: EntityConfig<Row>,
  values: Record<string, string | number | boolean | null>,
  orgId: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = { org_id: orgId };

  // For panneaux, capteurs, actualites, compose location.
  if ((config.slug === "panneaux" || config.slug === "capteurs") && values.location_lng != null && values.location_lat != null) {
    out.location = lngLatToGeoJson([values.location_lng as number, values.location_lat as number]);
  }
  if (config.slug === "actualites" && values.location_lng != null && values.location_lat != null) {
    out.location = lngLatToGeoJson([values.location_lng as number, values.location_lat as number]);
  }
  if (config.slug === "capteurs") {
    const thresholds: Record<string, number> = {};
    if (values.threshold_warning != null) thresholds.warning = values.threshold_warning as number;
    if (values.threshold_critical != null) thresholds.critical = values.threshold_critical as number;
    out.thresholds = thresholds;
  }
  if (config.slug === "zones") {
    out.geometry = values.geometry_wkt;
    if (values.metadata) {
      try {
        out.metadata = JSON.parse(values.metadata as string);
      } catch {
        /* leave as string — Supabase will reject if invalid */
      }
    }
  }

  // Copy flat scalar fields from form (minus synthetic ones).
  const SYNTHETIC = new Set([
    "location_lng",
    "location_lat",
    "threshold_warning",
    "threshold_critical",
    "geometry_wkt",
  ]);
  for (const f of config.fields) {
    if (SYNTHETIC.has(f.name)) continue;
    const v = values[f.name];
    if (v === "" || v === undefined) {
      out[f.name] = null;
    } else {
      out[f.name] = v;
    }
  }
  return out;
}

export function EntityPage<Row extends RowWithId>({ config }: { config: EntityConfig<Row> }) {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const { data: profile } = useProfile();

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const list = useQuery<Row[]>({
    queryKey: [config.slug, profile?.orgId ?? "no-org"],
    enabled: Boolean(profile?.orgId),
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.from(config.table).select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });

  const insertMut = useMutation({
    mutationFn: async (values: Record<string, string | number | boolean | null>) => {
      if (!profile?.orgId) throw new Error("Organisation absente.");
      const row = formValuesToRow(config, values, profile.orgId);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from(config.table).insert(row);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.slug] });
      qc.invalidateQueries({ queryKey: ["palette", "corpus"] });
      setOpenNew(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: async (payload: { id: string; values: Record<string, string | number | boolean | null> }) => {
      if (!profile?.orgId) throw new Error("Organisation absente.");
      const row = formValuesToRow(config, payload.values, profile.orgId);
      // org_id must not be changed.
      delete (row as Record<string, unknown>).org_id;
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from(config.table).update(row).eq("id", payload.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.slug] });
      qc.invalidateQueries({ queryKey: ["palette", "corpus"] });
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (row: Row) => {
      const supabase = createSupabaseBrowserClient();
      // Soft-delete pattern: panels → status=removed, sensors → active=false.
      // News/zones: hard delete (allowed by V2 design).
      if (config.slug === "panneaux") {
        await supabase
          .from("algae_panels")
          .update({ status: "removed", removed_at: new Date().toISOString().slice(0, 10) })
          .eq("id", row.id);
      } else if (config.slug === "capteurs") {
        await supabase.from("sensors").update({ active: false }).eq("id", row.id);
      } else {
        await supabase.from(config.table).delete().eq("id", row.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.slug] });
      qc.invalidateQueries({ queryKey: ["palette", "corpus"] });
    },
  });

  const rows = useMemo(() => list.data ?? [], [list.data]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <Eyebrow className="mb-2">Objets · {config.label}</Eyebrow>
            <h1 className="font-[family-name:var(--font-fraunces)] text-[34px] leading-[1.05] tracking-[-0.02em]">
              {config.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/carte"
              className="inline-flex items-center h-9 px-3.5 rounded-md border border-white/10 text-[13px] text-[color:var(--nafas-surface)] hover:bg-white/5 transition-colors"
            >
              Voir sur carte →
            </Link>
            {isAdmin ? (
              <Button onClick={() => setOpenNew(true)}>+ Nouveau</Button>
            ) : null}
          </div>
        </div>

        {/* Content states */}
        {list.isLoading ? (
          <div className="rounded-lg border border-white/5 bg-[color:var(--nafas-bg2)]/40 py-16 text-center text-[13px] text-[color:var(--nafas-ink3)]">
            Chargement…
          </div>
        ) : list.error ? (
          <div className="rounded-lg border border-[color:var(--nafas-danger)]/30 bg-[color:var(--nafas-danger)]/5 px-4 py-4 text-[13px] text-[color:var(--nafas-danger)]">
            {(list.error as Error).message}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState config={config} onNew={() => setOpenNew(true)} canCreate={isAdmin} />
        ) : (
          <EntityDataTable
            config={config}
            rows={rows}
            isAdmin={isAdmin}
            onEdit={isAdmin ? setEditing : undefined}
            onDelete={isAdmin ? (r) => deleteMut.mutate(r) : undefined}
          />
        )}
      </div>

      {/* New dialog */}
      <AppDialog
        open={openNew}
        onOpenChange={(o) => !o && setOpenNew(false)}
        title={`Nouveau · ${config.labelSingular}`}
        widthClassName="w-[min(640px,calc(100vw-2rem))]"
      >
        <EntityForm
          config={config}
          onCancel={() => setOpenNew(false)}
          onSubmit={(values) => insertMut.mutateAsync(values)}
          submitLabel="Créer"
          pending={insertMut.isPending}
        />
      </AppDialog>

      {/* Edit dialog */}
      <AppDialog
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        title={`Modifier · ${config.labelSingular}`}
        widthClassName="w-[min(640px,calc(100vw-2rem))]"
      >
        {editing ? (
          <EntityForm
            config={config}
            initial={rowToFormInitial(editing)}
            onCancel={() => setEditing(null)}
            onSubmit={(values) => updateMut.mutateAsync({ id: editing.id, values })}
            pending={updateMut.isPending}
          />
        ) : null}
      </AppDialog>
    </div>
  );
}

function EmptyState<Row>({ config, onNew, canCreate }: { config: EntityConfig<Row>; onNew: () => void; canCreate: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[color:var(--nafas-bg2)]/40 py-20 px-6 text-center">
      <h2 className="font-[family-name:var(--font-fraunces)] text-[26px] tracking-[-0.01em] leading-tight">
        {config.emptyState.title}
      </h2>
      <p className="mt-3 max-w-[44ch] mx-auto text-[14px] text-[color:var(--nafas-ink3)]">
        {config.emptyState.hint}
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        {config.emptyState.cta ? (
          <Link
            href={config.emptyState.cta.href}
            className="inline-flex items-center h-9 px-3.5 rounded-md bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black font-medium text-[13px] transition-colors"
          >
            {config.emptyState.cta.label} →
          </Link>
        ) : null}
        {canCreate ? (
          <Button variant="secondary" onClick={onNew}>
            + Nouveau
          </Button>
        ) : null}
      </div>
    </div>
  );
}
