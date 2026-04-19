import Link from "next/link";

export function Footer() {
  return (
    <footer id="equipe" className="relative border-t border-white/5 bg-[color:var(--nafas-bg)]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="grid md:grid-cols-4 gap-10 mb-14">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="size-7 rounded-md bg-[color:var(--nafas-accent)] grid place-items-center text-black font-[family-name:var(--font-fraunces)] text-[15px] italic">
                N
              </div>
              <div className="text-[14px] font-medium tracking-wide">
                HealiX <span className="text-[color:var(--nafas-ink3)] font-normal">· Gabès</span>
              </div>
            </div>
            <p className="text-[14px] leading-[1.6] text-[color:var(--nafas-ink3)] max-w-md">
              Hackathon 2026 — Tunis. Un outil citoyen, scientifique et architectural pour que Gabès respire. Open-source, données publiques.
            </p>
          </div>

          <div>
            <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.2em] uppercase text-[color:var(--nafas-ink3)] mb-4">
              Plateforme
            </div>
            <ul className="space-y-2.5 text-[13px]">
              <li><Link href="/monitor3d" className="hover:text-[color:var(--nafas-accent2)] transition-colors">Moniteur 3D</Link></li>
              <li><a href="#crise" className="hover:text-[color:var(--nafas-accent2)] transition-colors">Chronologie</a></li>
              <li><a href="#plateforme" className="hover:text-[color:var(--nafas-accent2)] transition-colors">Six axes</a></li>
              <li><span className="text-[color:var(--nafas-ink3)]">Triage médical · v2</span></li>
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.2em] uppercase text-[color:var(--nafas-ink3)] mb-4">
              Partenaires
            </div>
            <ul className="space-y-2.5 text-[13px] text-[color:var(--nafas-ink3)]">
              <li>Stop Pollution Gabès</li>
              <li>FTDES</li>
              <li>Mediterranean Posidonia Network</li>
              <li>Copernicus · Sentinel-5P</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-ink3)]/80">
            © 2026 HealiX · Tunisie
          </div>
          <div className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]/60 max-w-xl md:text-right leading-[1.55]">
            Prototype. Données Sentinel-5P publiques + simulations calibrées sur littérature scientifique citée. Aucun conseil médical. Les mesures ne remplacent ni un médecin, ni un suivi environnemental officiel.
          </div>
        </div>
      </div>
    </footer>
  );
}
