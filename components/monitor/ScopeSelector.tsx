"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";

import { useMonitor, type Scope } from "@/lib/monitor/store";

type Option = { value: Scope; label: string; sub: string };

const OPTIONS: Option[] = [
  { value: "med", label: "Med Basin", sub: "13°E · 36°N · z5.2" },
  { value: "tunisia", label: "Tunisie", sub: "9.8°E · 34.2°N · z6.4" },
  { value: "gabes", label: "Gabès ville", sub: "10.09°E · 33.88°N · z10.6" },
];

const MONO =
  "var(--font-jetbrains), ui-monospace, SFMono-Regular, Menlo, monospace";

export function ScopeSelector() {
  const scope = useMonitor((s) => s.scope);
  const setScope = useMonitor((s) => s.setScope);
  const current = OPTIONS.find((o) => o.value === scope) ?? OPTIONS[0];

  return (
    <Menu.Root>
      <Menu.Trigger
        className="group/scope inline-flex h-7 shrink-0 cursor-pointer items-center gap-[8px] rounded-full border border-white/10 bg-white/[0.04] pl-[10px] pr-[8px] text-[color:var(--nafas-surface)] transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--nafas-accent2)] data-[popup-open]:border-[color:var(--nafas-accent2)]/50 data-[popup-open]:bg-white/[0.07]"
        aria-label="Sélectionner la portée géographique"
      >
        <span
          aria-hidden
          className="size-[5px] rounded-full bg-[color:var(--nafas-accent2)]"
        />
        <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--nafas-ink3)]">
          Scope
        </span>
        <span
          style={{ fontFamily: MONO }}
          className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--nafas-surface)]"
        >
          {current.label}
        </span>
        <ChevronDown
          className="size-[12px] text-[color:var(--nafas-ink3)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[popup-open]/scope:rotate-180"
          strokeWidth={1.75}
        />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start" className="z-50">
          <Menu.Popup
            className="min-w-[220px] overflow-hidden rounded-[8px] border border-white/10 bg-[color:var(--nafas-bg2)]/95 p-[4px] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl outline-none transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[starting-style]:-translate-y-1 data-[ending-style]:-translate-y-1"
          >
            <div
              style={{ fontFamily: MONO }}
              className="px-[10px] pt-[8px] pb-[6px] text-[9px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]/70"
            >
              Portée cartographique
            </div>
            {OPTIONS.map((opt) => {
              const active = opt.value === scope;
              return (
                <Menu.Item
                  key={opt.value}
                  onClick={() => setScope(opt.value)}
                  className="group/item flex cursor-pointer items-center gap-[10px] rounded-[5px] px-[10px] py-[7px] outline-none data-[highlighted]:bg-white/[0.06]"
                >
                  <span
                    aria-hidden
                    className={
                      "size-[6px] shrink-0 rounded-full transition-colors " +
                      (active
                        ? "bg-[color:var(--nafas-accent2)] shadow-[0_0_8px_-1px_rgba(61,201,154,0.8)]"
                        : "bg-white/15 group-data-[highlighted]/item:bg-white/40")
                    }
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                    <span
                      style={{ fontFamily: MONO }}
                      className={
                        "text-[11px] uppercase tracking-[0.1em] " +
                        (active
                          ? "text-[color:var(--nafas-surface)]"
                          : "text-[color:var(--nafas-surface)]/85")
                      }
                    >
                      {opt.label}
                    </span>
                    <span
                      style={{ fontFamily: MONO }}
                      className="text-[9px] uppercase tracking-[0.16em] text-[color:var(--nafas-ink3)]/80"
                    >
                      {opt.sub}
                    </span>
                  </div>
                  {active ? (
                    <span
                      style={{ fontFamily: MONO }}
                      className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--nafas-accent2)]"
                    >
                      Actif
                    </span>
                  ) : null}
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
