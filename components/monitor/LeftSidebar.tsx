"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight,
  User, Stethoscope, Factory, Ruler, Landmark,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatStrip } from "./StatStrip";
import { LayerToggle } from "./LayerToggle";
import { AminaSpotlight } from "./AminaSpotlight";
import { WaterQualityMonitor } from "./WaterQualityMonitor";
import { BriefAI } from "./BriefAI";
import { Posture } from "./Posture";
import { EventsFeed } from "./EventsFeed";
import { useMonitor } from "@/lib/monitor/store";
import { useFakeStream } from "@/lib/monitor/useFakeStream";
import { isTypingTarget } from "@/lib/app/inputTarget";

type AudienceKey = "habitant" | "medecin" | "gct" | "architecte" | "municipalite";

interface AudienceDef {
  key: AudienceKey;
  label: string;
  ar: string;
  icon: LucideIcon;
  accent: string;
  hotkey: string;
  role: string;
  persona: string;
  headline: string;
  body: string;
}

const AUDIENCES: AudienceDef[] = [
  {
    key: "habitant", label: "Habitant", ar: "مواطن", icon: User,
    accent: "var(--nafas-accent2)", hotkey: "1",
    role: "Habitant", persona: "Amina — Ghannouch, mère de trois",
    headline: "Respirer est une décision quotidienne.",
    body: "07h42. Le vent pousse le panache vers Chatt Essalam. La station de l'école primaire affiche 286 µg/m³. La sonnerie sonne dans dix-huit minutes. Amina voit le trajet vert qui contourne la plume. Ses enfants respirent l'air d'une rue de moins.",
  },
  {
    key: "medecin", label: "Médecin", ar: "طبيب", icon: Stethoscope,
    accent: "var(--nafas-blue)", hotkey: "2",
    role: "Corps médical", persona: "Dr Mansouri — Habib Bourguiba, garde pédiatrique",
    headline: "Une pression pédiatrique prévue, pas subie.",
    body: "Prévision 48h : 14 admissions respiratoires attendues entre 14h et 19h demain, corrélées au pic SO₂ mesuré à Ghannouch. Le dashboard priorise les stocks salbutamol, réassigne deux infirmières à l'aigu, prévient Kairouan pour transfert si seuils dépassés.",
  },
  {
    key: "gct", label: "Industrie", ar: "مجمّع", icon: Factory,
    accent: "var(--nafas-amber)", hotkey: "3",
    role: "Industriel", persona: "Direction HSE — Groupe Chimique Tunisien",
    headline: "Transparence mesurée, pas déclarative.",
    body: "Courbe d'émissions en continu, croisée OMS (40 µg/m³) et Ilva Tarente (poursuite pénale 2024). Chaque déclaration officielle est mise en parité avec la mesure citoyenne horodatée IPFS. Le portail public n'est plus un exercice de communication — il est un banc d'essai juridique.",
  },
  {
    key: "architecte", label: "Architecte", ar: "معمار", icon: Ruler,
    accent: "var(--nafas-cyan)", hotkey: "4",
    role: "Architecte", persona: "Atelier HealiX — catalogue ORACLE",
    headline: "Cinq sites, trois matériaux, une saison.",
    body: "Mashrabiyya sur quatre façades scolaires en phosphogypse stabilisé + grignons d'olive : −40% PM₂.₅. Hizam Akhdar 2 km × 30 m — Tamarix, Atriplex, Phragmites. Tahallub : cinq hectares d'Ulva posidonia, 225 kg phosphore retirés par an. Rhino + Grasshopper paramétrés, exports chantier prêts.",
  },
  {
    key: "municipalite", label: "Gouvernorat", ar: "بلديّة", icon: Landmark,
    accent: "var(--nafas-accent)", hotkey: "5",
    role: "Gouvernorat", persona: "Gouvernorat de Gabès — service urbanisme",
    headline: "Décider avec la même carte que ses citoyens.",
    body: "Vue consolidée gouvernorale. 38 incidents cartographiés, 147 infrastructures scolaires et sanitaires indexées, 42 capteurs citoyens scellés, 1 panache industriel en temps réel. Indicateurs budgétaires agrégés par délégation. Une source de vérité, pas cinq silos.",
  },
];

const LEGEND_ITEMS = [
  { label: "Alerte",       color: "var(--nafas-danger)", note: "SO₂ > 200 µg/m³" },
  { label: "Élevé",        color: "var(--nafas-amber)",  note: "100 — 200" },
  { label: "Surveillance", color: "var(--nafas-cyan)",   note: "< 100" },
  { label: "Base",         color: "var(--nafas-accent)", note: "calibration" },
];

const SECTION = "font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-widest text-[color:var(--nafas-ink3)]";

function AudienceSection() {
  const audience = useMonitor((s) => s.audience);
  const setAudience = useMonitor((s) => s.setAudience);
  const current = AUDIENCES.find((a) => a.key === audience) ?? AUDIENCES[0];
  const streamed = useFakeStream(current.body, 40);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const match = AUDIENCES.find((a) => a.hotkey === e.key);
      if (match) { e.preventDefault(); setAudience(match.key); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setAudience]);

  return (
    <div className="flex flex-col gap-3">
      {/* 5-button compact grid */}
      <div className="grid grid-cols-5 overflow-hidden rounded-md border border-white/10">
        {AUDIENCES.map((a, i) => {
          const active = audience === a.key;
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => setAudience(a.key)}
              title={`${a.label} (${a.hotkey})`}
              className="flex flex-col items-center gap-1 py-2.5 px-1 transition-colors cursor-pointer"
              style={{
                background: active ? `color-mix(in srgb, ${a.accent} 15%, transparent)` : "transparent",
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <Icon
                className="size-[13px]"
                strokeWidth={1.7}
                style={{ color: active ? a.accent : "var(--nafas-ink3)" }}
              />
              <span
                className="font-[family-name:var(--font-jetbrains)] text-[8px] uppercase tracking-[0.08em] leading-none"
                style={{ color: active ? "var(--nafas-surface)" : "var(--nafas-ink3)" }}
              >
                {a.label.slice(0, 5)}
              </span>
              {active && (
                <span aria-hidden className="size-[3px] rounded-full" style={{ background: a.accent }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Framing card */}
      <div className="relative overflow-hidden rounded-[8px] border border-white/[0.08] bg-black/30 p-3">
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-px"
          style={{ background: `linear-gradient(180deg, transparent, ${current.accent}, transparent)` }}
        />
        <div className="flex items-center gap-2 mb-2">
          <span
            className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.2em] shrink-0"
            style={{ color: current.accent }}
          >
            {current.role}
          </span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[9px] text-[color:var(--nafas-ink3)]/60 truncate">
            {current.persona}
          </span>
        </div>
        <h4 className="font-[family-name:var(--font-fraunces)] text-[13px] italic font-light leading-snug text-[color:var(--nafas-surface)] mb-1.5">
          {current.headline}
        </h4>
        <p className="font-[family-name:var(--font-fraunces)] text-[11px] leading-[1.55] text-[color:var(--nafas-ink3)] line-clamp-4">
          {streamed}
          {streamed.length < current.body.length && (
            <span
              aria-hidden
              className="inline-block w-[4px] h-[0.8em] ml-[1px] align-[-2px] animate-pulse"
              style={{ background: current.accent }}
            />
          )}
        </p>
        <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-[8.5px] uppercase tracking-[0.18em] text-[color:var(--nafas-ink3)]/50">
          1–5 pour changer
        </div>
      </div>
    </div>
  );
}

export function LeftSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="sidebar-scroll absolute top-12 left-0 bottom-0 z-30 flex flex-col border-r border-white/10 bg-[color:var(--nafas-bg2)]/75 backdrop-blur-xl transition-all duration-300"
      style={{ width: collapsed ? "40px" : "300px" }}
      aria-label="Panneau latéral — Golfe de Gabès"
    >
      <style jsx>{`
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-6 z-50 grid size-6 place-items-center rounded-full border border-white/10 bg-[color:var(--nafas-bg2)] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] transition-colors"
        aria-label={collapsed ? "Ouvrir le panneau" : "Réduire le panneau"}
      >
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>

      {/* Collapsed strip */}
      {collapsed && (
        <div className="flex flex-col items-center gap-5 pt-8 px-2 text-[color:var(--nafas-ink3)]">
          <span className="font-[family-name:var(--font-jetbrains)] text-[8px] uppercase tracking-[0.3em] [writing-mode:vertical-rl] rotate-180 opacity-40">
            Golfe de Gabès
          </span>
        </div>
      )}

      {/* Expanded content */}
      {!collapsed && (
        <div className="flex flex-col gap-5 p-5 overflow-y-auto flex-1">
          {/* Header */}
          <header className="flex flex-col gap-1.5">
            <h2 className="font-[family-name:var(--font-fraunces)] text-[20px] font-light italic leading-none text-[color:var(--nafas-surface)]">
              Golfe de Gabès
            </h2>
            <div className="font-[family-name:var(--font-jetbrains)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]">
              · zone critique · 42 capteurs
            </div>
          </header>

          <div className="h-px w-full bg-white/5" />

          {/* Audience switcher + framing */}
          <section className="flex flex-col gap-3">
            <div className={SECTION}>Pour qui</div>
            <AudienceSection />
          </section>

          <div className="h-px w-full bg-white/5" />

          {/* Brief AI */}
          <section>
            <BriefAI />
          </section>

          <div className="h-px w-full bg-white/5" />

          {/* Stats */}
          <section className="flex flex-col gap-3">
            <div className={SECTION}>Métriques</div>
            <StatStrip />
          </section>

          <div className="h-px w-full bg-white/5" />

          {/* Severity legend */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className={SECTION}>Sévérité SO₂</span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[9px] tracking-[0.16em] uppercase text-[color:var(--nafas-ink3)]/50">µg/m³</span>
            </div>
            <div className="flex flex-col gap-2">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span
                    className="inline-block size-[8px] shrink-0 rounded-full"
                    style={{ backgroundColor: item.color, boxShadow: `0 0 8px -1px ${item.color}` }}
                  />
                  <span className="text-[11.5px] text-[color:var(--nafas-surface)]" style={{ fontWeight: 500 }}>
                    {item.label}
                  </span>
                  <span className="ml-auto font-[family-name:var(--font-jetbrains)] text-[9.5px] tracking-[0.12em] uppercase text-[color:var(--nafas-ink3)]/65">
                    {item.note}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="h-px w-full bg-white/5" />

          {/* Layers */}
          <section className="flex flex-col gap-3">
            <div className={SECTION}>Couches</div>
            <LayerToggle />
          </section>

          <div className="h-px w-full bg-white/5" />

          {/* Water Quality AI */}
          <section className="flex flex-col gap-3">
            <div className={SECTION}>Qualité eau · IA</div>
            <WaterQualityMonitor />
          </section>

          <div className="h-px w-full bg-white/5" />

          {/* Posture */}
          <Posture />

          <div className="h-px w-full bg-white/5" />

          {/* Events */}
          <EventsFeed />

          <div className="h-px w-full bg-white/5" />

          {/* Spotlight */}
          <section className="flex flex-col gap-3">
            <div className={SECTION}>Spotlight</div>
            <AminaSpotlight />
          </section>

          {/* Footer */}
          <footer className="mt-auto pt-4 flex flex-col gap-1 font-[family-name:var(--font-jetbrains)] text-[10px] leading-[1.5] text-[color:var(--nafas-ink3)]/60">
            <div className="uppercase tracking-wider">Sentinel-5P · OpenAQ · Nawaat · FTDES</div>
            <div className="tracking-wider">Données simulées · CC BY-NC</div>
          </footer>
        </div>
      )}
    </aside>
  );
}
