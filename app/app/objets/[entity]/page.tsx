import { notFound } from "next/navigation";
import { ENTITY_CONFIGS, type EntitySlug } from "@/lib/app/objets";
import { EntityPage } from "@/components/app/EntityPage";

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
  const config = ENTITY_CONFIGS[entity as EntitySlug];
  // Cast to `never` because EntityPage is generic on `Row extends RowWithId`
  // and each config narrows to a concrete row type at the use site.
  return <EntityPage config={config as unknown as Parameters<typeof EntityPage>[0]["config"]} />;
}
