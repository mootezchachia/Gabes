import { z } from "zod";
import type { AlgaePanel } from "@/lib/supabase/types";
import type { EntityConfig } from "@/lib/app/entity";

export const panneauSchema = z.object({
  area_m2: z.number({ error: "Surface requise" }).positive("Doit être > 0"),
  algae_species: z.string().min(1).default("ulva_lactuca"),
  material_notes: z.string().optional().nullable(),
  status: z.enum(["planned", "deploying", "active", "removed"]).default("planned"),
  expected_p_uptake_kg_per_year: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  location_lng: z.number().min(-180).max(180),
  location_lat: z.number().min(-90).max(90),
});

export type PanneauFormValues = z.infer<typeof panneauSchema>;

export const panneauxConfig: EntityConfig<AlgaePanel> = {
  slug: "panneaux",
  table: "algae_panels",
  label: "Panneaux à algues",
  labelSingular: "Panneau",
  icon: "Leaf",
  accent: "var(--nafas-accent)",
  columns: [
    {
      key: "status",
      label: "État",
      filter: "select",
      filterOptions: [
        { value: "planned", label: "Prévu" },
        { value: "deploying", label: "Déploiement" },
        { value: "active", label: "Actif" },
        { value: "removed", label: "Retiré" },
      ],
    },
    { key: "location", label: "Position", mono: true },
    { key: "area_m2", label: "Surface (m²)", mono: true },
    { key: "algae_species", label: "Espèce" },
    { key: "deployed_at", label: "Déployé" },
    {
      key: "expected_p_uptake_kg_per_year",
      label: "P attendu (kg/an)",
      mono: true,
    },
    {
      key: "actual_p_uptake_kg_per_year",
      label: "P mesuré (kg/an)",
      mono: true,
    },
  ],
  fields: [
    { name: "location_lng", label: "Longitude", kind: "number", required: true, step: 0.000001 },
    { name: "location_lat", label: "Latitude", kind: "number", required: true, step: 0.000001 },
    { name: "area_m2", label: "Surface (m²)", kind: "number", required: true, min: 1, defaultValue: 500 },
    {
      name: "algae_species",
      label: "Espèce d'algue",
      kind: "select",
      defaultValue: "ulva_lactuca",
      options: [
        { value: "ulva_lactuca", label: "Ulva lactuca (laitue de mer)" },
        { value: "caulerpa_prolifera", label: "Caulerpa prolifera" },
        { value: "cystoseira_compressa", label: "Cystoseira compressa" },
      ],
    },
    {
      name: "status",
      label: "État",
      kind: "select",
      defaultValue: "planned",
      options: [
        { value: "planned", label: "Prévu" },
        { value: "deploying", label: "Déploiement" },
        { value: "active", label: "Actif" },
        { value: "removed", label: "Retiré" },
      ],
    },
    {
      name: "expected_p_uptake_kg_per_year",
      label: "P attendu (kg/an)",
      kind: "number",
      help: "Auto-calculé à partir de la surface (45 kg/ha/an). Modifiable.",
    },
    { name: "material_notes", label: "Notes matériaux", kind: "textarea" },
    { name: "notes", label: "Notes internes", kind: "textarea" },
  ],
  schema: panneauSchema,
  emptyState: {
    title: "Aucun panneau déployé",
    hint: "Placez le premier panneau à algues sur la carte. Chaque panneau capte environ 45 kg de phosphate par hectare et par an.",
    cta: { label: "Ouvrir la carte", href: "/app/carte" },
  },
  focusUrl: (row) => `/app/carte?focus=panel:${row.id}`,
};
