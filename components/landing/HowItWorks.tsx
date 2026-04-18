const STEPS = [
  {
    n: "01",
    tag: "Capter",
    title: "42 capteurs, maillage continu.",
    body: "Un réseau de 42 stations ESP32 + cellules SPEC SO₂/NO₂, déployé en trois couronnes autour des complexes industriels de Ghannouch. Dispersion modélisée en temps réel (Pasquill-Gifford), fusionnée avec Sentinel-5P TROPOMI pour la couverture large.",
    chip: "Hardware + Sentinel-5P",
    tint: "accent",
  },
  {
    n: "02",
    tag: "Comprendre",
    title: "ORACLE croise les signaux.",
    body: "Une IA recoupe pollution mesurée, trajectoires de panaches, météo (ECMWF), densité résidentielle, proximité d'écoles et d'hôpitaux. En sortie : zones critiques, horizons de prévision 48h, corrélations épisodes ↔ admissions hospitalières.",
    chip: "Claude + ECMWF + ORACLE",
    tint: "blue",
  },
  {
    n: "03",
    tag: "Agir",
    title: "Une donnée, cinq réponses.",
    body: "Amina voit un trajet. Le médecin voit un profil symptomatique. GCT voit ses seuils. L'architecte voit où planter la Hizam Akhdar. Le gouvernorat voit une carte de décision. Une seule source de vérité, cinq interfaces dédiées.",
    chip: "PWA · Dashboard · API publique",
    tint: "amber",
  },
];

const TINT: Record<string, string> = {
  accent: "text-[color:var(--nafas-accent2)]",
  blue: "text-[color:var(--nafas-blue)]",
  amber: "text-[color:var(--nafas-amber)]",
};

export function HowItWorks() {
  return (
    <section id="comment" className="relative border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32">
        {/* section header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 md:mb-20">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)] mb-6">
              <span className="h-px w-8 bg-[color:var(--nafas-ink3)]/50" />
              Chapitre 02 · Comment ça marche
            </div>
            <h2 className="font-[family-name:var(--font-fraunces)] font-light tracking-[-0.015em] leading-[1.02] text-[clamp(36px,5vw,60px)] max-w-[16ch]">
              De la molécule au geste,{" "}
              <em className="font-[family-name:var(--font-fraunces)] italic font-light text-[color:var(--nafas-accent2)]">
                sans rupture.
              </em>
            </h2>
          </div>
          <p className="max-w-[40ch] text-[15px] leading-[1.6] text-[color:var(--nafas-ink3)] md:text-right">
            Trois couches techniques, une seule promesse : transformer les données Sentinel en décisions exécutables pour les habitants, soignants et élus de Gabès.
          </p>
        </div>

        {/* steps — horizontal rail on desktop, stacked on mobile */}
        <div className="relative grid md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.08]">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative bg-[color:var(--nafas-bg2)]/60 backdrop-blur-sm p-7 md:p-9 group hover:bg-[color:var(--nafas-bg2)] transition-colors">
              {/* number + tag */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-baseline gap-3">
                  <div className="font-[family-name:var(--font-fraunces)] italic font-light text-[56px] md:text-[68px] leading-none tracking-[-0.02em] text-[color:var(--nafas-ink3)]/40 group-hover:text-[color:var(--nafas-ink3)]/70 transition-colors">
                    {s.n}
                  </div>
                  <div className={`text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.2em] uppercase ${TINT[s.tint]}`}>
                    {s.tag}
                  </div>
                </div>
                <div className={`size-2 rounded-full bg-current ${TINT[s.tint]} animate-pulse opacity-70`} />
              </div>

              {/* title */}
              <h3 className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.015em] leading-[1.15] text-[22px] md:text-[24px] mb-4 text-[color:var(--nafas-surface)]">
                {s.title}
              </h3>

              {/* body */}
              <p className="text-[14.5px] leading-[1.65] text-[color:var(--nafas-ink3)] mb-6">
                {s.body}
              </p>

              {/* chip */}
              <div className="flex items-center gap-2 text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]/80">
                <span className="h-px w-6 bg-[color:var(--nafas-ink3)]/30" />
                {s.chip}
              </div>

              {/* next arrow (desktop, between items) */}
              {i < STEPS.length - 1 && (
                <div aria-hidden className="hidden md:flex absolute top-1/2 -right-4 size-8 rounded-full bg-[color:var(--nafas-bg)] border border-white/10 items-center justify-center z-10 text-[color:var(--nafas-ink3)]">
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        {/* footer strip */}
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]/80">
          <div className="flex items-center gap-3">
            <span className="size-1.5 rounded-full bg-[color:var(--nafas-accent2)] animate-pulse" />
            Architecture open-source · API publique · GPL-3
          </div>
          <div>
            Sentinel-5P · Open-Meteo · OpenStreetMap · Anthropic
          </div>
        </div>
      </div>
    </section>
  );
}
