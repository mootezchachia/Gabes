import Link from "next/link";
import { LiveBadge } from "./LiveBadge";

const LINKS = [
  { href: "#crise", label: "La crise" },
  { href: "#comment", label: "Méthode" },
  { href: "#plateforme", label: "Six axes" },
  { href: "#audiences", label: "Pour qui" },
  { href: "#agir", label: "Agir" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[color:var(--nafas-bg)]/80 border-b border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="size-7 rounded-md bg-[color:var(--nafas-accent)] grid place-items-center text-black font-[family-name:var(--font-fraunces)] text-[15px] font-medium italic group-hover:bg-[color:var(--nafas-accent2)] transition-colors">
            N
          </div>
          <div className="text-[14px] font-medium tracking-wide">
            HealiX <span className="text-[color:var(--nafas-ink3)] font-normal">· Gabès</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          <LiveBadge />
          <Link
            href="/app/carte"
            className="text-[13px] font-medium bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black px-4 py-2 rounded-md transition-colors"
          >
            Ouvrir le moniteur 3D →
          </Link>
        </div>
      </div>
    </header>
  );
}
