"use client";

import { ENTITY_CONFIGS, type EntitySlug } from "@/lib/app/objets";
import { EntityPage } from "./EntityPage";

/**
 * Thin client-side wrapper that resolves the entity config from a slug.
 *
 * The configs contain non-serializable values (zod schemas, `focusUrl`
 * functions, potential column `render` callbacks) which cannot cross the
 * RSC → Client boundary. Passing only the slug keeps the config fully
 * inside the client bundle.
 */
export function ObjetsRoute({ entity }: { entity: EntitySlug }) {
  const config = ENTITY_CONFIGS[entity];
  return <EntityPage config={config as unknown as Parameters<typeof EntityPage>[0]["config"]} />;
}
