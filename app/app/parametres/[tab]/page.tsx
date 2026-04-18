import { notFound } from "next/navigation";
import { ParametresClient } from "./ParametresClient";

const TABS = ["utilisateurs", "couches", "organisation", "moi"] as const;
type TabSlug = (typeof TABS)[number];

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const labels: Record<string, string> = {
    utilisateurs: "Utilisateurs",
    couches: "Couches",
    organisation: "Organisation",
    moi: "Mon profil",
  };
  return { title: labels[tab] ?? "Paramètres" };
}

export default async function ParametresPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!TABS.includes(tab as TabSlug)) notFound();
  return <ParametresClient tab={tab as TabSlug} />;
}
