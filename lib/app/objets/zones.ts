import { z } from "zod";
import type { Zone } from "@/lib/supabase/types";
import type { EntityConfig } from "@/lib/app/entity";

export const zoneSchema = z.object({
  kind: z.enum([
    "school",
    "hospital",
    "residential",
    "industrial",
    "marine_protected",
    "coastal",
    "oasis",
  ]),
  name: z.string().min(1, "Nom requis").max(120),
  geometry_wkt: z.string().min(1, "Polygone requis"),
  metadata: z.string().optional().nullable(),
});

export type ZoneFormValues = z.infer<typeof zoneSchema>;

export const zonesConfig: EntityConfig<Zone> = {
  slug: "zones",
  table: "zones",
  label: "Zones",
  labelSingular: "Zone",
  icon: "Hexagon",
  accent: "var(--nafas-amber)",
  columns: [
    { key: "name", label: "Nom" },
    {
      key: "kind",
      label: "Type",
      filter: "select",
      filterOptions: [
        { value: "school", label: "École" },
        { value: "hospital", label: "Hôpital" },
        { value: "residential", label: "Résidentiel" },
        { value: "industrial", label: "Industriel" },
        { value: "marine_protected", label: "Marin protégé" },
        { value: "coastal", label: "Littoral" },
        { value: "oasis", label: "Oasis" },
      ],
    },
    { key: "created_at", label: "Créée le", mono: true },
  ],
  fields: [
    { name: "name", label: "Nom", kind: "text", required: true },
    {
      name: "kind",
      label: "Type",
      kind: "select",
      required: true,
      options: [
        { value: "school", label: "École" },
        { value: "hospital", label: "Hôpital" },
        { value: "residential", label: "Résidentiel" },
        { value: "industrial", label: "Industriel" },
        { value: "marine_protected", label: "Marin protégé" },
        { value: "coastal", label: "Littoral" },
        { value: "oasis", label: "Oasis" },
      ],
    },
    {
      name: "geometry_wkt",
      label: "Polygone (WKT)",
      kind: "textarea",
      required: true,
      help: "Tracez plutôt la zone depuis la carte (outil Z). Champ modifiable en mode expert.",
      placeholder: "POLYGON((lng lat, lng lat, ...))",
    },
    { name: "metadata", label: "Métadonnées (JSON)", kind: "textarea" },
  ],
  schema: zoneSchema,
  emptyState: {
    title: "Aucune zone définie",
    hint: "Tracez une zone sur la carte pour délimiter une école, un hôpital ou un littoral protégé.",
    cta: { label: "Ouvrir la carte", href: "/app/carte" },
  },
  focusUrl: (row) => `/app/carte?focus=zone:${row.id}`,
};
