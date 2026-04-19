"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef, EntityConfig } from "@/lib/app/entity";
import { Button, Input, SelectField, StatusBadge } from "./ui/Primitives";
import { formatLngLat, pointToLngLat } from "@/lib/app/geo";
import type { GeoPoint } from "@/lib/supabase/types";

/**
 * Generic data table rendered inside every Objets page. Shadcn's DataTable
 * isn't installed, so we roll a minimal one with: search, per-column
 * select-filter, single-column sort, pagination-by-scroll (everything
 * renders — entities are under 200 rows in V2).
 */
export function EntityDataTable<Row extends { id: string }>({
  config,
  rows,
  onEdit,
  onDelete,
  isAdmin,
}: {
  config: EntityConfig<Row>;
  rows: Row[];
  onEdit?: (row: Row) => void;
  onDelete?: (row: Row) => void;
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let out = rows;
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        config.columns.some((c) => {
          const v = (r as unknown as Record<string, unknown>)[c.key];
          return v != null && String(v).toLowerCase().includes(q);
        }),
      );
    }
    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue;
      out = out.filter(
        (r) => String((r as unknown as Record<string, unknown>)[key] ?? "") === val,
      );
    }
    if (sortKey) {
      out = [...out].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sortKey];
        const bv = (b as unknown as Record<string, unknown>)[sortKey];
        const an = typeof av === "number" ? av : 0;
        const bn = typeof bv === "number" ? bv : 0;
        if (typeof av === "number" && typeof bv === "number")
          return sortDir === "asc" ? an - bn : bn - an;
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
      });
    }
    return out;
  }, [rows, query, filters, sortKey, sortDir, config.columns]);

  function toggleSort(col: ColumnDef<Row>) {
    if (col.sortable === false) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search + filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] max-w-md">
          <Input
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher"
          />
        </div>
        {config.columns
          .filter((c) => c.filter === "select" && c.filterOptions)
          .map((c) => (
            <div key={c.key} className="min-w-[160px]">
              <SelectField
                value={filters[c.key] ?? ""}
                onValueChange={(v) => setFilters((f) => ({ ...f, [c.key]: v === "__all__" ? "" : v }))}
                options={[{ value: "__all__", label: `Toutes · ${c.label}` }, ...(c.filterOptions ?? [])]}
                placeholder={c.label}
              />
            </div>
          ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/5 overflow-hidden bg-[color:var(--nafas-bg2)]/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                {config.columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    onClick={() => toggleSort(c)}
                    className={`px-3 py-2.5 text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)] ${
                      c.sortable === false ? "" : "cursor-pointer hover:text-[color:var(--nafas-surface)]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {c.label}
                      {sortKey === c.key ? (
                        <span className="text-[9px] text-[color:var(--nafas-accent2)]">
                          {sortDir === "asc" ? "▲" : "▼"}
                        </span>
                      ) : null}
                    </span>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="px-4 py-12 text-center text-[13px] text-[color:var(--nafas-ink3)]"
                  >
                    Aucun résultat.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    {config.columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-3 py-2.5 align-middle text-[13px] ${
                          c.mono ? "font-[family-name:var(--font-jetbrains)] tabular-nums" : ""
                        }`}
                      >
                        <CellValue col={c} row={row} />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={config.focusUrl(row)}
                          className="inline-flex items-center h-7 px-2.5 rounded-md text-[12px] text-[color:var(--nafas-accent2)] hover:bg-[color:var(--nafas-accent)]/10 transition-colors"
                        >
                          Carte
                        </Link>
                        {isAdmin && onEdit ? (
                          <Button size="sm" variant="secondary" onClick={() => onEdit(row)}>
                            Modifier
                          </Button>
                        ) : null}
                        {isAdmin && onDelete ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (confirm("Confirmer la suppression ?")) onDelete(row);
                            }}
                          >
                            Retirer
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
        {filtered.length} / {rows.length} · {config.label}
      </div>
    </div>
  );
}

function CellValue<Row>({ col, row }: { col: ColumnDef<Row>; row: Row }) {
  const raw = (row as unknown as Record<string, unknown>)[col.key];
  if (col.render) return <>{col.render(raw, row)}</>;

  if (raw == null || raw === "") return <span className="text-[color:var(--nafas-ink3)]">—</span>;

  // Specialised renderers by key for the common cases.
  if (col.key === "location" || col.key === "proposed_location" || col.key === "home_location" || col.key === "school_location") {
    const ll = pointToLngLat(raw as GeoPoint);
    return <>{formatLngLat(ll, 4)}</>;
  }
  if (col.key === "status") {
    const v = String(raw);
    const tone =
      v === "active" || v === "approved" || v === "deployed"
        ? "accent"
        : v === "deploying" || v === "draft"
          ? "amber"
          : v === "removed" || v === "rejected"
            ? "danger"
            : "neutral";
    return <StatusBadge tone={tone as "accent" | "amber" | "danger" | "neutral"}>{v}</StatusBadge>;
  }
  if (col.key === "severity") {
    const v = String(raw);
    const tone = v === "critical" ? "danger" : v === "warning" ? "amber" : "blue";
    return <StatusBadge tone={tone as "danger" | "amber" | "blue"}>{v}</StatusBadge>;
  }
  if (col.key === "active") {
    return (
      <StatusBadge tone={raw ? "accent" : "neutral"}>{raw ? "actif" : "inactif"}</StatusBadge>
    );
  }
  if (col.key === "kind" || col.key === "type") {
    return <StatusBadge tone="blue">{String(raw)}</StatusBadge>;
  }
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return <>{new Date(raw).toLocaleDateString("fr-FR")}</>;
  }
  if (typeof raw === "boolean") return <>{raw ? "Oui" : "Non"}</>;
  if (typeof raw === "number") return <>{raw.toLocaleString("fr-FR")}</>;
  return <>{String(raw)}</>;
}
