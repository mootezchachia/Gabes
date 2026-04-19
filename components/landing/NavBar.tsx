"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LiveBadge } from "./LiveBadge";

const NAV_LINKS = [
  { href: "#moniteur", label: "Surveillance" },
  { href: "#architecture", label: "Architecture" },
  { href: "#sante", label: "Santé" },
];

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? "color-mix(in srgb, var(--nafas-bg) 85%, transparent)"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(1.1)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center gap-6">
        {/* logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="size-7 rounded-md bg-[color:var(--nafas-accent)] grid place-items-center text-black font-[family-name:var(--font-fraunces)] text-[15px] font-medium italic group-hover:bg-[color:var(--nafas-accent2)] transition-colors">
            N
          </div>
          <div className="text-[14px] font-medium tracking-wide">
            HealiX <span className="text-[color:var(--nafas-ink3)] font-normal">· Gabès</span>
          </div>
        </Link>

        {/* nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] px-3.5 py-1.5 rounded-md hover:bg-white/5 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* right */}
        <div className="flex items-center gap-3 ml-auto">
          <LiveBadge />
          <Link
            href="/monitor"
            className="hidden md:inline-flex items-center text-[12.5px] font-medium text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] px-3.5 py-2 rounded-md border border-white/10 hover:border-white/20 transition-colors"
          >
            Carte 2D
          </Link>
          <Link
            href="/monitor3d"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black px-4 py-2 rounded-md transition-colors"
          >
            Globe 3D <span className="opacity-70">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
