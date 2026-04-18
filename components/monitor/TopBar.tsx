"use client";

import Link from "next/link";
import { Maximize2, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useMonitor } from "@/lib/monitor/store";
import { ScopeSelector } from "@/components/monitor/ScopeSelector";

/* -------------------------------------------------------------------------- */
/*  Small atoms                                                               */
/* -------------------------------------------------------------------------- */

function Dot() {
  return (
    <span
      aria-hidden
      className="inline-block size-[3px] shrink-0 rounded-full bg-white/20"
    />
  );
}

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="Retour à l'accueil NAFAS"
      className="nafas-brand group flex shrink-0 items-center gap-2 select-none outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--nafas-accent2)] rounded-[4px]"
    >
      <span
        aria-hidden
        className="nafas-brand-glyph relative flex size-6 items-center justify-center rounded-[4px] bg-[color:var(--nafas-accent)] text-[color:var(--nafas-bg)] shadow-[0_0_0_1px_rgba(61,201,154,0.35),0_0_18px_-6px_rgba(61,201,154,0.55)]"
      >
        <span
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          className="text-[15px] leading-none font-[500] italic"
        >
          N
        </span>
      </span>
      <span className="flex items-baseline gap-[6px]">
        <span
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
          className="text-[13px] font-[600] tracking-[0.02em] text-[color:var(--nafas-surface)]"
        >
          NAFAS
        </span>
        <span className="text-[color:var(--nafas-ink3)]/60 text-[11px]">·</span>
        <span
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          className="text-[13px] font-[500] italic text-[color:var(--nafas-ink3)]"
        >
          MONITOR
        </span>
      </span>
    </Link>
  );
}

function MetaTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
      className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[color:var(--nafas-ink3)]"
    >
      {children}
    </span>
  );
}

function LiveIndicator() {
  return (
    <div className="flex shrink-0 items-center gap-[8px]">
      <span
        aria-hidden
        className="nafas-live-dot relative inline-flex size-[7px] rounded-full bg-[color:var(--nafas-accent2)]"
      >
        <span
          aria-hidden
          className="nafas-live-ring absolute inset-0 rounded-full bg-[color:var(--nafas-accent2)]"
        />
      </span>
      <span
        style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
        className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--nafas-surface)]/90"
      >
        LIVE
        <span className="mx-[6px] text-white/25">·</span>
        <span className="text-[color:var(--nafas-ink3)]">Méditerranée</span>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Crisis ribbon                                                             */
/* -------------------------------------------------------------------------- */

function CrisisRibbon() {
  const message = useMonitor((s) => s.crisisMessage);
  if (!message) return <div className="flex-1" />;

  return (
    <div
      role="status"
      aria-live="polite"
      className="nafas-crisis flex min-w-0 flex-1 items-center gap-[8px] rounded-[3px] border border-[color:var(--nafas-danger)]/30 bg-[color:var(--nafas-danger)]/10 px-[10px] py-[3px]"
    >
      <span
        aria-hidden
        className="nafas-crisis-dot inline-block size-[7px] shrink-0 rounded-full bg-[color:var(--nafas-danger)]"
      />
      <span
        style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
        className="min-w-0 truncate text-[11px] uppercase tracking-[0.12em] text-[color:var(--nafas-danger)]"
      >
        {message}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Right-cluster icon button                                                  */
/* -------------------------------------------------------------------------- */

function IconButton({
  onClick,
  href,
  label,
  children,
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-[color:var(--nafas-ink3)] transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/15 hover:bg-white/5 hover:text-[color:var(--nafas-surface)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--nafas-accent2)] cursor-pointer";

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

/* -------------------------------------------------------------------------- */
/*  TopBar                                                                    */
/* -------------------------------------------------------------------------- */

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
        className="absolute top-0 inset-x-0 z-40 flex h-12 items-center gap-[14px] border-b border-white/[0.07] bg-[color:var(--nafas-bg)]/72 px-[14px] backdrop-blur-xl"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(26,35,48,0.55) 0%, rgba(10,15,20,0.72) 100%)",
        }}
      >
        <BrandMark />

        <Dot />

        <MetaTag>v0.1 · @mootezchachia</MetaTag>

        <Dot />

        <LiveIndicator />

        <ScopeSelector />

        <CrisisRibbon />

        <div className="flex shrink-0 items-center gap-[4px]">
          <IconButton label="Rechercher (⌘K)">
            <Search className="size-[14px]" strokeWidth={1.75} />
            <kbd
              aria-hidden
              style={{
                fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
              }}
              className="sr-only"
            >
              ⌘K
            </kbd>
          </IconButton>
          <IconButton
            label={isFs ? "Quitter le plein écran" : "Plein écran"}
            onClick={toggleFullscreen}
          >
            <Maximize2 className="size-[13px]" strokeWidth={1.75} />
          </IconButton>
          <IconButton label="Retour à l'accueil" href="/">
            <X className="size-[15px]" strokeWidth={1.75} />
          </IconButton>
        </div>
      </header>

      <style jsx>{`
        .nafas-brand-glyph {
          transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 480ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .nafas-brand:hover .nafas-brand-glyph {
          animation: nafas-brand-breathe 1.8s
            cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @keyframes nafas-brand-breathe {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 1px rgba(61, 201, 154, 0.35),
              0 0 18px -6px rgba(61, 201, 154, 0.55);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 0 0 1px rgba(61, 201, 154, 0.55),
              0 0 22px -4px rgba(61, 201, 154, 0.85);
          }
        }

        .nafas-live-ring {
          animation: nafas-live-ping 1.6s cubic-bezier(0.22, 1, 0.36, 1)
            infinite;
        }
        @keyframes nafas-live-ping {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          80%,
          100% {
            transform: scale(2.6);
            opacity: 0;
          }
        }

        .nafas-crisis {
          animation: nafas-crisis-flash 2.4s
            cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .nafas-crisis-dot {
          animation: nafas-crisis-dot 1s cubic-bezier(0.22, 1, 0.36, 1)
            infinite;
          box-shadow: 0 0 12px -1px rgba(226, 75, 74, 0.65);
        }
        @keyframes nafas-crisis-flash {
          0%,
          100% {
            background-color: rgba(226, 75, 74, 0.1);
            border-color: rgba(226, 75, 74, 0.3);
          }
          50% {
            background-color: rgba(226, 75, 74, 0.18);
            border-color: rgba(226, 75, 74, 0.5);
          }
        }
        @keyframes nafas-crisis-dot {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.55;
            transform: scale(0.82);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nafas-brand:hover .nafas-brand-glyph,
          .nafas-live-ring,
          .nafas-crisis,
          .nafas-crisis-dot {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
