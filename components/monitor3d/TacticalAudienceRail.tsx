"use client";

import { useEffect } from "react";
import { User, Stethoscope, Factory, Ruler, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMonitor } from "@/lib/monitor/store";
import { isTypingTarget } from "@/lib/app/inputTarget";

type AudienceKey = "habitant" | "medecin" | "gct" | "architecte" | "municipalite";

interface AudienceDef {
  key: AudienceKey;
  code: string;
  label: string;
  ar: string;
  icon: LucideIcon;
  accent: string;
  hotkey: string;
}

const AUDIENCES: AudienceDef[] = [
  { key: "habitant", code: "P-01", label: "Habitant", ar: "مواطن", icon: User, accent: "var(--nafas-accent2)", hotkey: "1" },
  { key: "medecin", code: "P-02", label: "Médecin", ar: "طبيب", icon: Stethoscope, accent: "var(--nafas-blue)", hotkey: "2" },
  { key: "gct", code: "P-03", label: "Industrie", ar: "مجمّع", icon: Factory, accent: "var(--nafas-amber)", hotkey: "3" },
  { key: "architecte", code: "P-04", label: "Architecte", ar: "معمار", icon: Ruler, accent: "var(--nafas-cyan)", hotkey: "4" },
  { key: "municipalite", code: "P-05", label: "Gouvernorat", ar: "بلديّة", icon: Landmark, accent: "var(--nafas-accent)", hotkey: "5" },
];

/**
 * Left-rail tactical audience selector. Vertical stack of 5 numbered
 * personas; press 1-5 to switch. Arabic glyph fades in on active.
 */
export function TacticalAudienceRail() {
  const audience = useMonitor((s) => s.audience);
  const setAudience = useMonitor((s) => s.setAudience);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const match = AUDIENCES.find((a) => a.hotkey === e.key);
      if (match) {
        e.preventDefault();
        setAudience(match.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setAudience]);

  return (
    <div
      role="tablist"
      aria-label="Sélection d'audience"
      className="tac-panel w-full h-full py-2 overflow-auto flex flex-col"
    >
      <div className="px-3 pb-2 border-b border-white/[0.07]">
        <span className="tac-bracket">Pour qui</span>
      </div>

      <div className="flex flex-col">
        {AUDIENCES.map((a) => {
          const active = audience === a.key;
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              role="tab"
              aria-selected={active}
              onClick={() => setAudience(a.key)}
              className="group relative flex items-center gap-2.5 px-3 py-2.5 cursor-pointer text-left transition-colors hover:bg-white/[0.035]"
              style={{
                background: active ? `color-mix(in srgb, ${a.accent} 10%, transparent)` : "transparent",
              }}
            >
              <span
                aria-hidden
                className="absolute left-0 top-1.5 bottom-1.5 w-[2px] transition-colors"
                style={{
                  background: active ? a.accent : "transparent",
                  boxShadow: active ? `0 0 8px ${a.accent}` : "none",
                }}
              />
              <span
                className="grid size-[18px] place-items-center shrink-0"
                style={{
                  background: active ? a.accent : "rgba(255,255,255,0.06)",
                  color: active ? "var(--nafas-bg)" : "var(--nafas-ink3)",
                  clipPath: "polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)",
                }}
              >
                <Icon className="size-[10px]" strokeWidth={2} />
              </span>

              <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
                <span className="flex items-center gap-1.5">
                  <span
                    className="tac-label text-[8px] tracking-[0.26em] shrink-0"
                    style={{ color: active ? a.accent : "var(--nafas-ink3)" }}
                  >
                    {a.code}
                  </span>
                  <span
                    className="text-[11.5px] leading-none truncate"
                    style={{
                      color: active ? "var(--nafas-surface)" : "var(--nafas-ink3)",
                      fontWeight: active ? 500 : 400,
                      fontFamily: "var(--font-inter), sans-serif",
                    }}
                  >
                    {a.label}
                  </span>
                </span>
                <span
                  dir="rtl"
                  className="text-[10px] font-[family-name:var(--font-fraunces)] italic leading-none transition-opacity"
                  style={{
                    color: a.accent,
                    opacity: active ? 0.75 : 0,
                  }}
                >
                  {a.ar}
                </span>
              </span>

              <span
                className="tac-label text-[8px] shrink-0 transition-colors"
                style={{
                  color: active ? a.accent : "var(--nafas-ink3)/60",
                  opacity: active ? 0.85 : 0.35,
                }}
              >
                [{a.hotkey}]
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
