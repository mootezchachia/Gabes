import { z } from "zod";
import type { Sensor } from "@/lib/supabase/types";
import type { EntityConfig } from "@/lib/app/entity";

export const capteurSchema = z.object({
  type: z.enum(["so2", "no2", "pm25", "pm10", "ph", "turbidity", "chlorophyll_a", "temperature"]),
  unit: z.string().min(1, "Unité requise"),
  active: z.boolean().default(true),
  source: z.string().default("simulated"),
  device_id: z.string().optional().nullable(),
  panel_id: z.string().uuid().optional().nullable(),
  location_lng: z.number().min(-180).max(180),
  location_lat: z.number().min(-90).max(90),
  threshold_warning: z.number().optional().nullable(),
  threshold_critical: z.number().optional().nullable(),
});

export type CapteurFormValues = z.infer<typeof capteurSchema>;

const TYPE_DEFAULTS: Record<string, string> = {
  so2: "µg/m³",
  no2: "µg/m³",
  pm25: "µg/m³",
  pm10: "µg/m³",
  ph: "pH",
  turbidity: "NTU",
  chlorophyll_a: "mg/m³",
  temperature: "°C",
};

export { TYPE_DEFAULTS as capteurUnitDefaults };

export const capteursConfig: EntityConfig<Sensor> = {
  slug: "capteurs",
  table: "sensors",
  label: "Capteurs",
  labelSingular: "Capteur",
  icon: "Radio",
  accent: "var(--nafas-cyan)",
  columns: [
    {
      key: "type",
      label: "Type",
      filter: "select",
      filterOptions: [
        { value: "so2", label: "SO₂" },
        { value: "no2", label: "NO₂" },
        { value: "pm25", label: "PM2.5" },
        { value: "pm10", label: "PM10" },
        { value: "ph", label: "pH" },
        { value: "turbidity", label: "Turbidité" },
        { value: "chlorophyll_a", label: "Chlorophylle-a" },
        { value: "temperature", label: "Température" },
      ],
    },
    { key: "unit", label: "Unité", mono: true },
    { key: "device_id", label: "Identifiant", mono: true },
    { key: "location", label: "Position", mono: true },
    { key: "active", label: "Actif" },
    {
      key: "source",
      label: "Source",
      filter: "select",
      filterOptions: [
        { value: "simulated", label: "Simulé" },
        { value: "hardware", label: "Matériel" },
      ],
    },
  ],
  fields: [
    { name: "location_lng", label: "Longitude", kind: "number", required: true, step: 0.000001 },
    { name: "location_lat", label: "Latitude", kind: "number", required: true, step: 0.000001 },
    {
      name: "type",
      label: "Type",
      kind: "select",
      required: true,
      options: [
        { value: "so2", label: "SO₂ — dioxyde de soufre" },
        { value: "no2", label: "NO₂ — dioxyde d'azote" },
        { value: "pm25", label: "PM2.5 — particules fines" },
        { value: "pm10", label: "PM10 — particules" },
        { value: "ph", label: "pH — acidité" },
        { value: "turbidity", label: "Turbidité" },
        { value: "chlorophyll_a", label: "Chlorophylle-a" },
        { value: "temperature", label: "Température" },
      ],
    },
    { name: "unit", label: "Unité", kind: "text", required: true, placeholder: "µg/m³" },
    { name: "device_id", label: "Identifiant appareil", kind: "text", placeholder: "NAFAS-CAP-001" },
    { name: "panel_id", label: "Panneau associé (UUID)", kind: "text", help: "Laissez vide si capteur autonome." },
    {
      name: "source",
      label: "Source",
      kind: "select",
      defaultValue: "simulated",
      options: [
        { value: "simulated", label: "Simulé" },
        { value: "hardware", label: "Matériel" },
      ],
    },
    { name: "active", label: "Actif", kind: "toggle", defaultValue: true },
    { name: "threshold_warning", label: "Seuil d'alerte", kind: "number" },
    { name: "threshold_critical", label: "Seuil critique", kind: "number" },
  ],
  schema: capteurSchema,
  emptyState: {
    title: "Aucun capteur installé",
    hint: "Placez votre premier capteur sur la carte — air ou eau. Il commence à émettre des lectures dès son activation.",
    cta: { label: "Ouvrir la carte", href: "/app/carte" },
  },
  focusUrl: (row) => `/app/carte?focus=sensor:${row.id}`,
};
