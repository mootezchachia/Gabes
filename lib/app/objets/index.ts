import type { EntityConfig, EntitySlug } from "@/lib/app/entity";
import { panneauxConfig } from "./panneaux";
import { capteursConfig } from "./capteurs";
import { zonesConfig } from "./zones";
import { actualitesConfig } from "./actualites";

// Intentionally typed as `EntityConfig<any>` so the generic on Row allows
// each config's narrower row type (AlgaePanel, Sensor, …) to satisfy the
// record. The EntityPage consumer casts back to its specific row type.
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type AnyConfig = EntityConfig<any>;

export const ENTITY_CONFIGS: Record<EntitySlug, AnyConfig> = {
  panneaux: panneauxConfig,
  capteurs: capteursConfig,
  zones: zonesConfig,
  actualites: actualitesConfig,
};

export function resolveEntityConfig(slug: string): AnyConfig | null {
  if (slug in ENTITY_CONFIGS) {
    return ENTITY_CONFIGS[slug as EntitySlug];
  }
  return null;
}

export type { EntityConfig, EntitySlug } from "@/lib/app/entity";
