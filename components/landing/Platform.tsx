import { Radio, Smartphone, Grid2x2Check, Trees, Waves, Recycle } from "lucide-react";

const AXES = [
  {
    icon: Radio,
    code: "01",
    name: "Shahid",
    subtitle: "شهيد · témoin",
    desc: "42 capteurs bas-coût SO₂ / NO₂ / PM. Maillage LoRaWAN, fusion bayésienne, données horodatées publiquement.",
    accent: "var(--nafas-cyan)",
    tag: "Capteurs",
  },
  {
    icon: Smartphone,
    code: "02",
    name: "Dawa'",
    subtitle: "دعوة · appel",
    desc: "PWA citoyenne + bot WhatsApp. Alertes géo-localisées, trajets propres, triage symptômes par IA sous supervision médicale.",
    accent: "var(--nafas-accent2)",
    tag: "App citoyenne",
  },
  {
    icon: Grid2x2Check,
    code: "03",
    name: "Mashrabiyya",
    subtitle: "مشربية · façade",
    desc: "Façades paramétriques en phosphogypse + charbon actif de grignons d'olive. −40 % PM₂.₅ devant 4 écoles prioritaires.",
    accent: "var(--nafas-amber)",
    tag: "Architecture",
  },
  {
    icon: Trees,
    code: "04",
    name: "Hizam Akhdar",
    subtitle: "حزام أخضر · ceinture verte",
    desc: "Corridor végétal 2 km × 30 m. Tamarix (SO₂/fluorure), Atriplex (cadmium), Phragmites (ruissellement). Filtre vivant.",
    accent: "var(--nafas-accent)",
    tag: "Phytoremédiation",
  },
  {
    icon: Waves,
    code: "05",
    name: "Tahallub",
    subtitle: "تحلّب · floraison marine",
    desc: "5 hectares d'Ulva et Posidonia transplantée dans le Golfe. 225 kg de phosphore retiré/an. Sites choisis par ORACLE.",
    accent: "var(--nafas-blue)",
    tag: "Phycoremédiation",
  },
  {
    icon: Recycle,
    code: "06",
    name: "Fosfo-Blok",
    subtitle: "فوسفو · bloc circulaire",
    desc: "Phosphogypse stabilisé en blocs de construction. De la friche radioactive au matériau de dispensaire public.",
    accent: "var(--nafas-accent2)",
    tag: "Économie circulaire",
  },
];

export function Platform() {
  return (
    <section id="plateforme" className="relative border-t border-white/5 bg-[color:var(--nafas-bg)]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)] mb-6">
              <span className="h-px w-8 bg-[color:var(--nafas-ink3)]/50" />
              Chapitre 02 · La plateforme
            </div>
            <h2 className="font-[family-name:var(--font-fraunces)] font-light tracking-[-0.015em] leading-[1.02] text-[clamp(36px,5vw,64px)]">
              Six interventions.{" "}
              <em className="font-[family-name:var(--font-fraunces)] italic font-light text-[color:var(--nafas-accent2)]">
                Un seul outil.
              </em>
            </h2>
          </div>
          <p className="max-w-md text-[15.5px] leading-[1.55] text-[color:var(--nafas-ink3)]">
            Neuf projets européens ont déjà étudié Gabès — sans jamais se parler. HealiX est leur tissu conjonctif. Chaque axe est lié à un capteur, un seuil, un citoyen.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AXES.map((a) => {
            const Icon = a.icon;
            return (
              <article
                key={a.code}
                className="group relative p-7 rounded-xl bg-[color:var(--nafas-bg2)]/60 backdrop-blur-sm border border-white/[0.07] hover:border-white/[0.18] transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-6">
                  <div
                    className="size-10 rounded-lg grid place-items-center transition-transform group-hover:scale-105"
                    style={{ background: `${a.accent}1A`, color: a.accent }}
                  >
                    <Icon strokeWidth={1.4} className="size-[18px]" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-[0.2em] text-[color:var(--nafas-ink3)]">
                      {a.code}
                    </div>
                    <div className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase mt-1" style={{ color: a.accent }}>
                      {a.tag}
                    </div>
                  </div>
                </div>

                <h3 className="font-[family-name:var(--font-fraunces)] font-light text-[30px] leading-none tracking-tight mb-1">
                  {a.name}
                </h3>
                <div className="text-[12px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] mb-5">
                  {a.subtitle}
                </div>

                <p className="text-[13.5px] leading-[1.55] text-[color:var(--nafas-ink3)]">
                  {a.desc}
                </p>

                <div
                  className="absolute left-0 bottom-0 h-px w-0 group-hover:w-full transition-all duration-500"
                  style={{ background: a.accent }}
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
