"use client";

import { useEffect, useState } from "react";
import { User, Stethoscope, Factory, Ruler, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMonitor } from "@/lib/monitor/store";
import { useFakeStream } from "@/lib/monitor/useFakeStream";

type AudienceKey = "habitant" | "medecin" | "gct" | "architecte" | "municipalite";

interface Framing {
  key: AudienceKey;
  role: string;
  persona: string;
  ar: string;
  icon: LucideIcon;
  accent: string;
  headline: string;
  body: string;
}

const FRAMINGS: Record<AudienceKey, Framing> = {
  habitant: {
    key: "habitant",
    role: "Habitant",
    persona: "Amina — Ghannouch, mère de trois",
    ar: "مواطن",
    icon: User,
    accent: "var(--nafas-accent2)",
    headline: "Respirer est une décision quotidienne.",
    body: "07h42. Le vent pousse le panache vers Chatt Essalam. La station de l'école primaire affiche 286 µg/m³. La sonnerie sonne dans dix-huit minutes. Amina voit le trajet vert qui contourne la plume. Ses enfants respirent l'air d'une rue de moins.",
  },
  medecin: {
    key: "medecin",
    role: "Corps médical",
    persona: "Dr Mansouri — Habib Bourguiba, garde pédiatrique",
    ar: "طبّ",
    icon: Stethoscope,
    accent: "var(--nafas-blue)",
    headline: "Une pression pédiatrique prévue, pas subie.",
    body: "Prévision 48h : 14 admissions respiratoires attendues entre 14h et 19h demain, corrélées au pic SO₂ mesuré à Ghannouch. Le dashboard priorise les stocks salbutamol, réassigne deux infirmières à l'aigu, prévient Kairouan pour transfert si seuils dépassés.",
  },
  gct: {
    key: "gct",
    role: "Industriel",
    persona: "Direction HSE — Groupe Chimique Tunisien",
    ar: "مجمّع",
    icon: Factory,
    accent: "var(--nafas-amber)",
    headline: "Transparence mesurée, pas déclarative.",
    body: "Courbe d'émissions en continu, croisée OMS (40 µg/m³) et Ilva Tarente (poursuite pénale 2024). Chaque déclaration officielle est mise en parité avec la mesure citoyenne horodatée IPFS. Le portail public n'est plus un exercice de communication — il est un banc d'essai juridique.",
  },
  architecte: {
    key: "architecte",
    role: "Architecte",
    persona: "Atelier NAFAS — catalogue ORACLE",
    ar: "معمار",
    icon: Ruler,
    accent: "var(--nafas-cyan)",
    headline: "Cinq sites, trois matériaux, une saison.",
    body: "Mashrabiyya sur quatre façades scolaires en phosphogypse stabilisé + grignons d'olive : −40% PM₂.₅. Hizam Akhdar 2 km × 30 m — Tamarix, Atriplex, Phragmites. Tahallub : cinq hectares d'Ulva posidonia, 225 kg phosphore retirés par an. Rhino + Grasshopper paramétrés, exports chantier prêts.",
  },
  municipalite: {
    key: "municipalite",
    role: "Gouvernorat",
    persona: "Gouvernorat de Gabès — service urbanisme",
    ar: "بلديّة",
    icon: Landmark,
    accent: "var(--nafas-accent)",
    headline: "Décider avec la même carte que ses citoyens.",
    body: "Vue consolidée gouvernorale. 38 incidents cartographiés, 147 infrastructures scolaires et sanitaires indexées, 42 capteurs citoyens scellés, 1 panache industriel en temps réel. Indicateurs budgétaires agrégés par délégation. Une source de vérité, pas cinq silos.",
  },
};

const MONO = "var(--font-jetbrains), ui-monospace, monospace";
const DISPLAY = "var(--font-fraunces), Georgia, serif";

export function AudienceFraming() {
  const audience = useMonitor((s) => s.audience);
  const introPlayed = useMonitor((s) => s.introPlayed);
  const framing = FRAMINGS[audience];
  const streamed = useFakeStream(framing.body, 50);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (!introPlayed) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [introPlayed, audience]);

  if (!introPlayed) return null;

  const Icon = framing.icon;

  return (
    <div
      aria-live="polite"
      className="pointer-events-auto absolute left-4 md:left-6 bottom-[116px] z-20 w-[min(90vw,380px)]"
      style={{
        opacity: mounted ? 1 : 0,
        transform: `translateY(${mounted ? "0" : "8px"})`,
        transition: "opacity 500ms cubic-bezier(0.22,1,0.36,1), transform 500ms cubic-bezier(0.22,1,0.36,1)",
      }}
      key={audience}
    >
      <div
        className="relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[rgba(10,15,20,0.72)] backdrop-blur-2xl shadow-[0_18px_48px_-18px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.02)_inset]"
      >
        {/* accent edge */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-px"
          style={{
            background: `linear-gradient(180deg, transparent, ${framing.accent}, transparent)`,
          }}
        />

        <div className="px-5 py-4">
          {/* header */}
          <div className="flex items-center gap-2.5 mb-3">
            <span
              className="grid size-7 place-items-center rounded-md border"
              style={{
                background: `color-mix(in srgb, ${framing.accent} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${framing.accent} 30%, transparent)`,
                color: framing.accent,
              }}
            >
              <Icon className="size-3.5" strokeWidth={1.6} />
            </span>
            <div className="flex-1 min-w-0">
              <div
                className="text-[10px] tracking-[0.22em] uppercase leading-none"
                style={{ fontFamily: MONO, color: framing.accent }}
              >
                {framing.role}
              </div>
              <div
                className="text-[10.5px] tracking-[0.04em] text-[color:var(--nafas-ink3)] truncate mt-1"
                style={{ fontFamily: MONO }}
              >
                {framing.persona}
              </div>
            </div>
            <span
              dir="rtl"
              className="text-[15px] font-[family-name:var(--font-fraunces)] italic font-light leading-none"
              style={{ color: framing.accent, opacity: 0.85 }}
            >
              {framing.ar}
            </span>
          </div>

          {/* headline */}
          <h4
            className="text-[16.5px] leading-[1.2] tracking-[-0.01em] text-[color:var(--nafas-surface)] mb-2.5"
            style={{ fontFamily: DISPLAY, fontWeight: 400 }}
          >
            {framing.headline}
          </h4>

          {/* body stream */}
          <p
            className="text-[13px] leading-[1.6] text-[color:var(--nafas-ink3)] min-h-[6em]"
            style={{ fontFamily: DISPLAY, fontWeight: 300 }}
          >
            {streamed}
            {streamed.length < framing.body.length ? (
              <span
                aria-hidden
                className="inline-block w-[5px] h-[0.9em] align-[-2px] ml-[1px] animate-pulse"
                style={{ background: framing.accent }}
              />
            ) : null}
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-5 py-2.5 border-t border-white/[0.05]"
          style={{ fontFamily: MONO }}
        >
          <span className="text-[9.5px] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]/60">
            Cadrage éditorial
          </span>
          <span className="flex-1 h-px bg-white/[0.04]" />
          <span className="text-[9.5px] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]/50">
            1–5 pour changer
          </span>
        </div>
      </div>
    </div>
  );
}
