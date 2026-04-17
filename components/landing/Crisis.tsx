const MONTHS = [
  { m: "J-25", v: 48 }, { m: "F", v: 62 }, { m: "M", v: 71 }, { m: "A", v: 89 },
  { m: "M", v: 105 }, { m: "J", v: 142 }, { m: "J", v: 168 }, { m: "A", v: 201 },
  { m: "S", v: 224 }, { m: "O", v: 340, peak: true }, { m: "N", v: 278 }, { m: "D", v: 312 },
];

const MAX = 360;
const W = 520;
const H = 220;

function linePath(points: { x: number; y: number }[]) {
  return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
}

export function Crisis() {
  const step = W / (MONTHS.length - 1);
  const pts = MONTHS.map((m, i) => ({
    x: i * step,
    y: H - (m.v / MAX) * (H - 30) - 10,
    v: m.v,
    label: m.m,
    peak: m.peak,
  }));
  const area = `${linePath(pts)} L ${W} ${H} L 0 ${H} Z`;
  const peak = pts.find((p) => p.peak)!;

  return (
    <section id="crise" className="relative border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-14 items-start">
          {/* left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)] mb-6">
              <span className="h-px w-8 bg-[color:var(--nafas-ink3)]/50" />
              Chapitre 01 · La crise
            </div>
            <h2 className="font-[family-name:var(--font-fraunces)] font-light tracking-[-0.015em] leading-[1.02] text-[clamp(36px,5vw,64px)] mb-8">
              Le 14 octobre 2025, Gabès{" "}
              <em className="font-[family-name:var(--font-fraunces)] italic font-light text-[color:var(--nafas-danger)]">
                n&apos;a pas respiré.
              </em>
            </h2>

            <p className="text-[17px] leading-[1.6] text-[color:var(--nafas-ink3)] mb-5">
              À 08h47, un panache de dioxyde de soufre s&apos;échappe des stacks du Groupe Chimique Tunisien à Ghannouch. À 08h52, 121 élèves de l&apos;école Chatt Essalam, située à 800 mètres au sud-sud-est, sont évacués en asphyxie. Pic mesuré : <span className="text-[color:var(--nafas-amber)] font-[family-name:var(--font-jetbrains)]">340 µg/m³</span> — plus de huit fois le seuil OMS.
            </p>
            <p className="text-[17px] leading-[1.6] text-[color:var(--nafas-ink3)] mb-8">
              Aucun capteur public ne fonctionnait. Aucune alerte n&apos;a été émise. Aucun protocole d&apos;évacuation préétabli. La ville a appris l&apos;épisode par les hôpitaux, pas par ses institutions.
            </p>

            <div className="grid grid-cols-3 gap-4 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-ink3)]">
              <div className="pt-4 border-t border-white/10">
                <div className="text-[22px] font-[family-name:var(--font-fraunces)] font-light text-[color:var(--nafas-surface)] normal-case tracking-tight">08:47</div>
                <div className="mt-1">Émission GCT</div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="text-[22px] font-[family-name:var(--font-fraunces)] font-light text-[color:var(--nafas-danger)] normal-case tracking-tight">08:52</div>
                <div className="mt-1">Évacuation école</div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="text-[22px] font-[family-name:var(--font-fraunces)] font-light text-[color:var(--nafas-surface)] normal-case tracking-tight">11:10</div>
                <div className="mt-1">Info relayée</div>
              </div>
            </div>
          </div>

          {/* right: sparkline */}
          <div className="relative">
            <div className="rounded-xl bg-[color:var(--nafas-bg2)]/60 backdrop-blur-sm border border-white/[0.08] p-6 md:p-8">
              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)] mb-1">
                    SO₂ mensuel · Golfe de Gabès
                  </div>
                  <div className="text-[14px] text-[color:var(--nafas-surface)] font-[family-name:var(--font-fraunces)] italic">
                    Source : Sentinel-5P TROPOMI · µg/m³
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[28px] font-[family-name:var(--font-fraunces)] font-light text-[color:var(--nafas-danger)] leading-none">340</div>
                  <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-ink3)] mt-1">Oct · pic</div>
                </div>
              </div>

              <svg viewBox={`-10 -10 ${W + 20} ${H + 30}`} className="w-full h-auto overflow-visible">
                {/* grid */}
                {[0.25, 0.5, 0.75].map((f) => (
                  <line key={f} x1={0} y1={H - f * (H - 30) - 10} x2={W} y2={H - f * (H - 30) - 10} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
                ))}
                {/* WHO threshold */}
                <line x1={0} y1={H - (40 / MAX) * (H - 30) - 10} x2={W} y2={H - (40 / MAX) * (H - 30) - 10} stroke="rgba(62,201,154,0.5)" strokeWidth={1} strokeDasharray="3 4" />
                <text x={W} y={H - (40 / MAX) * (H - 30) - 14} textAnchor="end" fontSize="10" fill="var(--nafas-accent2)" fontFamily="var(--font-jetbrains)">Seuil OMS 40</text>

                {/* area */}
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E24B4A" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#E24B4A" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={area} fill="url(#areaGrad)" />
                <path d={linePath(pts)} fill="none" stroke="var(--nafas-danger)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />

                {/* peak marker */}
                <line x1={peak.x} y1={peak.y} x2={peak.x} y2={H} stroke="var(--nafas-danger)" strokeWidth={0.6} strokeDasharray="2 3" />
                <circle cx={peak.x} cy={peak.y} r={8} fill="var(--nafas-danger)" opacity={0.18} />
                <circle cx={peak.x} cy={peak.y} r={3.5} fill="var(--nafas-danger)" />

                {/* x labels */}
                {pts.map((p, i) => (
                  <text key={i} x={p.x} y={H + 14} textAnchor="middle" fontSize="9" fill={p.peak ? "var(--nafas-danger)" : "var(--nafas-ink3)"} fontFamily="var(--font-jetbrains)">
                    {p.label}
                  </text>
                ))}
              </svg>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-ink3)]">
                <span>12 mois glissants</span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[color:var(--nafas-danger)]" />
                  Épisode 14 oct
                </span>
              </div>
            </div>

            <div className="absolute -top-3 -right-3 size-2 rounded-full bg-[color:var(--nafas-danger)] animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
