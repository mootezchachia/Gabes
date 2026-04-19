import { User, Stethoscope, Factory, Ruler, Landmark } from "lucide-react";

const AUDIENCES = [
  {
    code: "01",
    icon: User,
    name: "Habitant",
    ar: "مواطن",
    persona: "Amina, Ghannouch",
    quote: "Savoir où respirer, quand courir, quand fermer les fenêtres.",
    body: "PWA géolocalisée et bot WhatsApp. Alertes personnalisées dès qu'un panache approche. Itinéraires scolaires recalculés à la volée selon la direction du vent et l'exposition cumulée des douze dernières heures.",
    chip: "PWA · WhatsApp · Trajets propres",
    accent: "var(--nafas-accent2)",
  },
  {
    code: "02",
    icon: Stethoscope,
    name: "Corps médical",
    ar: "طبّ",
    persona: "Hôpital Habib Bourguiba, Gabès",
    quote: "Une pression pédiatrique prévue, pas subie.",
    body: "Tableau de bord de garde. Prévision 48 h d'admissions respiratoires à partir des panaches modélisés. Profil d'exposition de chaque patient horodaté. Triage par l'IA sous validation du médecin de garde.",
    chip: "Dashboard hospitalier · Triage IA",
    accent: "var(--nafas-blue)",
  },
  {
    code: "03",
    icon: Factory,
    name: "Groupe Chimique",
    ar: "مجمّع",
    persona: "Direction HSE · interface transparence",
    quote: "Transparence mesurée, pas déclarative.",
    body: "Courbes d'émissions en continu croisées avec seuils OMS et comparaisons industrielles (SIAPE Sfax, Ilva Tarente). Traces IPFS horodatées. Mode contradictoire publique — chaque déclaration rencontre une mesure citoyenne.",
    chip: "Portail · IPFS · Parité mesure",
    accent: "var(--nafas-amber)",
  },
  {
    code: "04",
    icon: Ruler,
    name: "Architectes",
    ar: "معمار",
    persona: "Catalogue ORACLE · atelier d'urgence",
    quote: "Une façade, une ceinture, un bassin — cartographiés.",
    body: "Règles génératives pour Mashrabiyya, Hizam Akhdar et Tahallub. Rendus Rhino + Grasshopper paramétrés sur les matériaux locaux (phosphogypse stabilisé, grignons d'olive, roseau). Export direct en fichiers de chantier.",
    chip: "Rhino · Grasshopper · Chantier",
    accent: "var(--nafas-cyan)",
  },
  {
    code: "05",
    icon: Landmark,
    name: "Municipalité",
    ar: "بلديّة",
    persona: "Gouvernorat de Gabès",
    quote: "Décider avec la même carte que ses citoyens.",
    body: "Vue consolidée gouvernorale. Indicateurs agrégés, cartes de priorité, planification budgétaire des interventions urbaines. Une source de vérité partagée avec l'habitant, le médecin, l'industriel — pas cinq silos en désaccord.",
    chip: "Dashboard décisionnel · API publique",
    accent: "var(--nafas-accent)",
  },
];

export function Audiences() {
  return (
    <section id="audiences" className="relative border-t border-white/5">
      {/* atmospheric wash */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(29,158,117,0.06), transparent 60%)",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32">
        {/* section header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 md:mb-20">
          <div className="max-w-[680px]">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-accent2)]">
                04 · Pour qui
              </span>
              <span className="h-px flex-1 max-w-[96px] bg-white/10" />
            </div>
            <h2 className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.02em] leading-[1.02] text-[clamp(34px,4.6vw,56px)]">
              Une donnée,{" "}
              <em className="not-italic italic font-light text-[color:var(--nafas-accent2)]">cinq réponses</em>.
            </h2>
          </div>
          <p className="md:max-w-[420px] text-[15px] leading-[1.6] text-[color:var(--nafas-ink3)]">
            HealiX ne fournit pas un rapport — il fournit cinq interfaces différentes qui regardent toutes les mêmes mesures, chacune taillée pour une décision concrète.
          </p>
        </div>

        {/* cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden border border-white/[0.06]">
          {AUDIENCES.map((a) => {
            const Icon = a.icon;
            return (
              <article
                key={a.code}
                className="relative group p-7 md:p-8 bg-[color:var(--nafas-bg2)]/80 backdrop-blur-sm hover:bg-[color:var(--nafas-bg2)] transition-colors flex flex-col gap-5"
              >
                {/* accent edge on hover */}
                <span
                  aria-hidden
                  className="absolute top-0 inset-x-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${a.accent}, transparent)`,
                  }}
                />

                {/* head row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-10 place-items-center rounded-md border"
                      style={{
                        background: `color-mix(in srgb, ${a.accent} 10%, transparent)`,
                        borderColor: `color-mix(in srgb, ${a.accent} 30%, transparent)`,
                        color: a.accent,
                      }}
                    >
                      <Icon className="size-5" strokeWidth={1.4} />
                    </span>
                    <span
                      className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]"
                    >
                      {a.code}
                    </span>
                  </div>
                  <span
                    className="text-[18px] font-[family-name:var(--font-fraunces)] italic font-light text-[color:var(--nafas-ink3)]/80 leading-none"
                    dir="rtl"
                  >
                    {a.ar}
                  </span>
                </div>

                {/* name + persona */}
                <div>
                  <h3
                    className="text-[22px] leading-[1.15] tracking-[-0.01em] mb-1"
                    style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400 }}
                  >
                    {a.name}
                  </h3>
                  <div className="text-[11.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.04em] text-[color:var(--nafas-ink3)]">
                    {a.persona}
                  </div>
                </div>

                {/* quote */}
                <p
                  className="text-[15px] leading-[1.5] text-[color:var(--nafas-surface)]/95 pl-4 border-l-2"
                  style={{
                    borderLeftColor: a.accent,
                    fontFamily: "var(--font-fraunces)",
                    fontWeight: 300,
                    fontStyle: "italic",
                  }}
                >
                  « {a.quote} »
                </p>

                {/* body */}
                <p className="text-[13.5px] leading-[1.6] text-[color:var(--nafas-ink3)]">
                  {a.body}
                </p>

                {/* chip */}
                <div className="mt-auto pt-4 border-t border-white/[0.05]">
                  <span
                    className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]/80"
                  >
                    {a.chip}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {/* footnote */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.14em] uppercase text-[color:var(--nafas-ink3)]/60">
          <span>Source unique · cinq lectures</span>
          <span className="opacity-40">·</span>
          <span>Pas cinq bases en désaccord</span>
          <span className="opacity-40">·</span>
          <span className="text-[color:var(--nafas-accent2)]">IPFS horodaté</span>
        </div>
      </div>
    </section>
  );
}
