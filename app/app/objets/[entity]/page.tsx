import { notFound } from "next/navigation";
import { ENTITY_CONFIGS, type EntitySlug } from "@/lib/app/objets";
import { ObjetsRoute } from "@/components/app/ObjetsRoute";

type Params = Promise<{ entity: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { entity } = await params;
  if (entity in ENTITY_CONFIGS) {
    return { title: ENTITY_CONFIGS[entity as EntitySlug].label };
  }
  return { title: "Objets" };
}

export default async function ObjetsPage({ params }: { params: Params }) {
  const { entity } = await params;
  if (!(entity in ENTITY_CONFIGS)) notFound();
  // Only the slug (a plain string) crosses the RSC → Client boundary.
  // The client wrapper imports ENTITY_CONFIGS directly, keeping zod schemas
  // and function-valued config fields inside the client bundle.
  return <ObjetsRoute entity={entity as EntitySlug} />;
}
