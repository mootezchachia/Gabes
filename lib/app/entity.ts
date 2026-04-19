import type { ComponentType, ReactNode } from "react";
import type { z } from "zod";

/** Shared type for the Objets entity pages. One config per entity, rendered
 *  by `components/app/EntityPage.tsx`. Keeps the four entity implementations
 *  (panneaux / capteurs / zones / actualites) 99% declarative. */

export type EntitySlug = "panneaux" | "capteurs" | "zones" | "actualites";

export type FilterKind = "select" | "text" | "none";

export interface ColumnDef<Row> {
  key: string;
  label: string;
  /** Custom render. Receives the raw value + full row. */
  render?: (value: unknown, row: Row) => ReactNode;
  /** Which control to show in the column header for filtering. */
  filter?: FilterKind;
  /** Options for select-filter columns. */
  filterOptions?: Array<{ value: string; label: string }>;
  /** Width hint in px or grid fraction. */
  width?: string;
  /** Whether this column is sortable. Defaults to true. */
  sortable?: boolean;
  /** Render as monospace / tabular-nums. */
  mono?: boolean;
}

export interface FieldDef {
  name: string;
  label: string;
  kind:
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "point"
    | "polygon"
    | "date"
    | "toggle"
    | "slug";
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number | boolean | null;
  min?: number;
  max?: number;
  step?: number;
}

export interface EntityConfig<Row> {
  slug: EntitySlug;
  table: string;
  label: string;
  labelSingular: string;
  icon: string; // lucide-react icon name
  /** Accent color token, e.g. "var(--nafas-accent)". */
  accent: string;
  /** Columns rendered in the DataTable. */
  columns: ReadonlyArray<ColumnDef<Row>>;
  /** Fields rendered in the New/Edit form. Order matters. */
  fields: ReadonlyArray<FieldDef>;
  /** Zod schema used for form validation. */
  schema: z.ZodTypeAny;
  /** Evocative empty-state copy + CTA. */
  emptyState: {
    title: string;
    hint: string;
    cta?: { label: string; href: string };
  };
  /** Build a deep link to /app/carte that focuses the row. */
  focusUrl: (row: Row) => string;
  /** Primary key accessor. Defaults to row.id. */
  idOf?: (row: Row) => string;
}
