"use client";

import Link from "next/link";
import { Maximize2, Radio, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useMonitor } from "@/lib/monitor/store";
import { ScopeSelector } from "@/components/monitor/ScopeSelector";

const MONO = "var(--font-jetbrains), ui-monospace, monospace";
const DISPLAY = "var(--font-fraunces), Georgia, serif";

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="Retour à l'accueil HealiX"
      className="nafas-brand group flex shrink-0 items-center gap-[7px] select-none outline-none rounded-[4px]"
    >
      <span
        aria-hidden
        className="nafas-brand-glyph relative flex size-[22px] items-center justify-center rounded-[4px] bg-[color:var(--nafas-accent)] text-[color:var(--nafas-bg)] shadow-[0_0_0_1px_rgba(61,201,154,0.35),0_0_18px_-6px_rgba(61,201,154,0.55)]"
      >
        <span
          style={{ fontFamily: DISPLAY }}
          className="text-[14px] leading-none font-[500] italic"
        >
          N
        </span>
      </span>
      <span
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
        className="text-[12px] font-[600] tracking-[0.02em] text-[color:var(--nafas-surface)]"
      >
        HealiX
      </span>
    </Link>
  );
}

function LiveDot() {
  return (
    <span aria-hidden className="relative inline-flex size-[7px] rounded-full bg-[color:var(--nafas-accent2)]">
      <span className="nafas-live-ring absolute inset-0 rounded-full bg-[color:var(--nafas-accent2)]" />
    </span>
  );
}

/** Live SO₂ + wind readout. Placeholder values; will hook into real store later. */
function LiveReadout() {
  const crisis = useMonitor((s) => s.crisisMessage);
  return (
    <div className="hidden md:flex shrink-0 items-center gap-3" style={{ fontFamily: MONO }}>
      <div className="flex items-center gap-[7px] text-[11px] uppercase tracking-[0.14em]">
        <LiveDot />
        <span className="text-[color:var(--nafas-surface)]/90">LIVE</span>
        <span className="text-[color:var(--nafas-ink3)]/45">·</span>
        <span className="text-[color:var(--nafas-ink3)]">42 capteurs</span>
      </div>

      {crisis && (
        <div className="nafas-crisis flex items-center gap-[7px] rounded-full border border-[color:var(--nafas-danger)]/30 bg-[color:var(--nafas-danger)]/10 px-[10px] py-[3px]">
          <span className="nafas-crisis-dot inline-block size-[6px] rounded-full bg-[color:var(--nafas-danger)]" />
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--nafas-danger)] max-w-[260px] truncate">
            {crisis}
          </span>
        </div>
      )}
    </div>
  );
}

function IconButton({
  onClick,
  href,
  label,
  children,
  tone = "default",
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  const toneCls =
    tone === "danger"
      ? "text-[color:var(--nafas-danger)] hover:text-[color:var(--nafas-danger)]"
      : "text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]";
  const base =
    `inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-transparent transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/15 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--nafas-accent2)] cursor-pointer ${toneCls}`;
  if (href) {
    return (
      <Link href={href} aria-label={label} className={base}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={base}>
      {children}
    </button>
  );
}

export function TopBar() {
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const handler = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  return (
    <>
      <header
        className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex h-11 items-center gap-[12px] rounded-full border border-white/[0.08] bg-[color:var(--nafas-bg)]/62 px-[12px] pr-[8px] backdrop-blur-2xl shadow-[0_18px_48px_-18px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.02)_inset]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(26,35,48,0.4) 0%, rgba(10,15,20,0.55) 100%)",
        }}
      >
        <BrandMark />

        <span aria-hidden className="h-4 w-px bg-white/10 shrink-0" />

        <LiveReadout />

        <span aria-hidden className="hidden md:block h-4 w-px bg-white/10 shrink-0" />

        <ScopeSelector />

        <span aria-hidden className="h-4 w-px bg-white/10 shrink-0" />

        <div className="flex shrink-0 items-center gap-[2px]">
          <IconButton label="Capteurs live">
            <Radio className="size-[13px]" strokeWidth={1.75} />
          </IconButton>
          <IconButton
            label={isFs ? "Quitter le plein écran" : "Plein écran"}
            onClick={toggleFullscreen}
          >
            <Maximize2 className="size-[12px]" strokeWidth={1.75} />
          </IconButton>
          <IconButton label="Retour à l'accueil" href="/">
            <X className="size-[14px]" strokeWidth={1.75} />
          </IconButton>
        </div>
      </header>

      <style jsx>{`
        .nafas-brand-glyph {
          transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 480ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .nafas-brand:hover .nafas-brand-glyph {
          animation: nafas-brand-breathe 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @keyframes nafas-brand-breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 1px rgba(61,201,154,0.35), 0 0 18px -6px rgba(61,201,154,0.55); }
          50% { transform: scale(1.06); box-shadow: 0 0 0 1px rgba(61,201,154,0.55), 0 0 22px -4px rgba(61,201,154,0.85); }
        }
        .nafas-live-ring {
          animation: nafas-live-ping 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @keyframes nafas-live-ping {
          0% { transform: scale(1); opacity: 0.7; }
          80%, 100% { transform: scale(2.6); opacity: 0; }
        }
        .nafas-crisis {
          animation: nafas-crisis-flash 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .nafas-crisis-dot {
          animation: nafas-crisis-dot 1s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          box-shadow: 0 0 12px -1px rgba(226,75,74,0.65);
        }
        @keyframes nafas-crisis-flash {
          0%, 100% { background-color: rgba(226,75,74,0.1); border-color: rgba(226,75,74,0.3); }
          50% { background-color: rgba(226,75,74,0.18); border-color: rgba(226,75,74,0.5); }
        }
        @keyframes nafas-crisis-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.82); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nafas-brand:hover .nafas-brand-glyph,
          .nafas-live-ring,
          .nafas-crisis,
          .nafas-crisis-dot { animation: none !important; }
        }
      `}</style>
    </>
  );
}
