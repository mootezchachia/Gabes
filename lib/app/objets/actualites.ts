import { z } from "zod";
import type { NewsEvent } from "@/lib/supabase/types";
import type { EntityConfig } from "@/lib/app/entity";

export const actualiteSchema = z.object({
  title: z.string().min(1, "Titre requis").max(200),
  body_md: z.string().optional().nullable(),
  happened_at: z.string().min(1, "Date requise"),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  link: z.string().url("URL invalide").optional().or(z.literal("")).nullable(),
  location_lng: z.number().optional().nullable(),
  location_lat: z.number().optional().nullable(),
});

export type ActualiteFormValues = z.infer<typeof actualiteSchema>;

export const actualitesConfig: EntityConfig<NewsEvent> = {
  slug: "actualites",
  table: "news_events",
  label: "Actualités",
  labelSingular: "Actualité",
  icon: "Newspaper",
  accent: "var(--nafas-blue)",
  columns: [
    { key: "title", label: "Titre" },
    {
      key: "severity",
      label: "Gravité",
      filter: "select",
      filterOptions: [
        { value: "info", label: "Info" },
        { value: "warning", label: "Avertissement" },
        { value: "critical", label: "Critique" },
      ],
    },
    { key: "happened_at", label: "Survenue", mono: true },
    { key: "link", label: "Lien" },
  ],
  fields: [
    { name: "title", label: "Titre", kind: "text", required: true },
    { name: "happened_at", label: "Date/heure", kind: "date", required: true },
    {
      name: "severity",
      label: "Gravité",
      kind: "select",
      defaultValue: "info",
      options: [
        { value: "info", label: "Info" },
        { value: "warning", label: "Avertissement" },
        { value: "critical", label: "Critique" },
      ],
    },
    { name: "body_md", label: "Corps (Markdown)", kind: "textarea" },
    { name: "link", label: "Lien externe", kind: "text", placeholder: "https://…" },
    { name: "location_lng", label: "Longitude (optionnel)", kind: "number", step: 0.000001 },
    { name: "location_lat", label: "Latitude (optionnel)", kind: "number", step: 0.000001 },
  ],
  schema: actualiteSchema,
  emptyState: {
    title: "Rien à signaler",
    hint: "Aucune actualité publiée. Ajoutez un événement — incident, communiqué, mesure — pour en garder la trace.",
  },
  focusUrl: (row) => `/app/objets/actualites?focus=${row.id}`,
};
