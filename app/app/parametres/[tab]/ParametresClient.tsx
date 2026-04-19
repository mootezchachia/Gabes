"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/app/ui/Primitives";
import { UsersTab } from "@/components/app/parametres/UsersTab";
import { LayersTab } from "@/components/app/parametres/LayersTab";
import { OrganisationTab } from "@/components/app/parametres/OrganisationTab";
import { MoiTab } from "@/components/app/parametres/MoiTab";

const TABS = [
  { slug: "utilisateurs", label: "Utilisateurs", adminOnly: true },
  { slug: "couches", label: "Couches", adminOnly: true },
  { slug: "organisation", label: "Organisation", adminOnly: true },
  { slug: "moi", label: "Moi", adminOnly: false },
] as const;

export function ParametresClient({ tab }: { tab: "utilisateurs" | "couches" | "organisation" | "moi" }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto p-6 md:p-8">
        <Eyebrow className="mb-2">Paramètres</Eyebrow>
        <h1 className="font-[family-name:var(--font-fraunces)] text-[34px] leading-[1.05] tracking-[-0.02em] mb-6">
          Configuration
        </h1>

        <nav aria-label="Sous-sections paramètres" className="flex flex-wrap items-center gap-1 border-b border-white/5 mb-6">
          {TABS.map((t) => (
            <Link
              key={t.slug}
              href={`/app/parametres/${t.slug}`}
              className={cn(
                "-mb-px px-3 py-2 text-[13px] border-b-2 transition-colors",
                tab === t.slug
                  ? "border-[color:var(--nafas-accent)] text-[color:var(--nafas-surface)]"
                  : "border-transparent text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {tab === "utilisateurs" ? <UsersTab /> : null}
        {tab === "couches" ? <LayersTab /> : null}
        {tab === "organisation" ? <OrganisationTab /> : null}
        {tab === "moi" ? <MoiTab /> : null}
      </div>
    </div>
  );
}
