"use client";

import { MousePointer2, Leaf, Radio, Hexagon, Sparkles } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";
import { useToolStore, useToolKeybinds, type Tool } from "./toolStore";
import { useIsAdmin } from "@/lib/auth/useRole";

/**
 * Left-edge tool rail on /app/carte.
 *
 * Visible only to admins (cosmetic; backend enforces). Supervisors see the
 * same rail with every button disabled + a "lecture seule" tooltip so they
 * understand the UI shape without accidentally hitting walls.
 */

const TOOLS: Array<{
  id: Tool;
  label: string;
  hint: string;
  key: string;
  Icon: typeof MousePointer2;
}> = [
  { id: "select", label: "Sélectionner", hint: "Sélection / pan", key: "V", Icon: MousePointer2 },
  { id: "panel", label: "Placer un panneau", hint: "Placer un panneau à algues", key: "P", Icon: Leaf },
  { id: "sensor", label: "Placer un capteur", hint: "Placer un capteur air ou eau", key: "S", Icon: Radio },
  { id: "zone", label: "Tracer une zone", hint: "Tracer un polygone", key: "Z", Icon: Hexagon },
  { id: "ai", label: "Placement IA", hint: "Lancer ORACLE", key: "I", Icon: Sparkles },
];

export function ToolRail({ disabled = false }: { disabled?: boolean }) {
  const tool = useToolStore((s) => s.tool);
  const setTool = useToolStore((s) => s.setTool);
  const isAdmin = useIsAdmin();
  useToolKeybinds(isAdmin && !disabled);

  if (!isAdmin && !disabled) {
    // Not admin? Don't render at all — supervisor gets the disabled variant
    // from the parent only when explicitly requested.
    return null;
  }

  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-3 z-40 flex flex-col gap-1.5 p-1.5 rounded-xl border border-white/10 bg-[color:var(--nafas-bg2)]/85 backdrop-blur-xl shadow-[0_18px_48px_-18px_rgba(0,0,0,0.9)]">
      {TOOLS.map(({ id, label, hint, key, Icon }) => {
        const active = tool === id;
        return (
          <Tooltip.Provider key={id} delay={300}>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <button
                    type="button"
                    aria-label={`${label} (${key})`}
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={() => setTool(id)}
                    className={cn(
                      "size-10 rounded-lg grid place-items-center transition-all outline-none",
                      "focus-visible:ring-2 focus-visible:ring-[color:var(--nafas-accent)]/40",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                      active
                        ? "bg-[color:var(--nafas-accent)]/20 text-[color:var(--nafas-accent2)] ring-1 ring-[color:var(--nafas-accent)]/40 shadow-[inset_0_0_0_1px_rgba(62,201,154,0.18)]"
                        : "text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-white/5",
                    )}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.6} />
                  </button>
                }
              />
              <Tooltip.Portal>
                <Tooltip.Positioner side="right" sideOffset={10} className="z-[130]">
                  <Tooltip.Popup className="rounded-md border border-white/10 bg-[color:var(--nafas-bg2)] px-2.5 py-1.5 text-[12px] text-[color:var(--nafas-surface)] shadow-xl">
                    <div className="flex items-center gap-2">
                      <span>{hint}</span>
                      <kbd className="text-[10px] font-[family-name:var(--font-jetbrains)] border border-white/10 rounded px-1 py-[1px] text-[color:var(--nafas-ink3)]">
                        {key}
                      </kbd>
                    </div>
                    {disabled ? (
                      <div className="text-[10.5px] text-[color:var(--nafas-ink3)] mt-0.5">
                        Lecture seule (superviseur)
                      </div>
                    ) : null}
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        );
      })}
    </div>
  );
}
