"use client";

import { ReactNode, useEffect } from "react";
import {
  PANEL_CONSTRAINTS,
  PanelId,
  usePanelLayout,
} from "@/lib/monitor3d/panelLayout";
import {
  usePanelDrag,
  usePanelResize,
} from "@/lib/monitor3d/useDragResize";

/**
 * Transparent positioning shell around an existing HUD panel. The panel
 * itself (`tac-panel` card with its own title + content) renders as
 * children and fills the shell with `w-full h-full`.
 *
 * When the layout is LOCKED (default): zero visual intrusion, zero
 * pointer interception — the panel works exactly as before.
 *
 * When UNLOCKED (press `L`):
 *   · dashed cyan outline around the panel
 *   · translucent drag strip overlays the top 28px
 *   · resize corner overlays the bottom-right SE
 *
 * Drag/resize use pointer events with 8px grid + magnetic-edge snap.
 */
export function MovablePanel({
  id,
  children,
  zIndex = 40,
}: {
  id: PanelId;
  children: ReactNode;
  zIndex?: number;
}) {
  const bounds = usePanelLayout((s) => s.positions[id]);
  const visible = usePanelLayout((s) => s.visibility[id]);
  const locked = usePanelLayout((s) => s.locked);
  const hydrated = usePanelLayout((s) => s.hydrated);
  const hydrate = usePanelLayout((s) => s.hydrate);

  const dragBind = usePanelDrag(id);
  const resizeBind = usePanelResize(id);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) return null; // avoid flash of SSR-computed bounds
  if (!visible) return null;

  const con = PANEL_CONSTRAINTS[id];
  const canResize = con.resizable !== false;

  return (
    <div
      className="fixed"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.w,
        height: bounds.h,
        zIndex,
      }}
    >
      {children}

      {/* Edit-mode affordances — only when unlocked */}
      {!locked && (
        <>
          {/* Dashed outline */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-0.5 rounded-lg border border-dashed border-[color:var(--nafas-cyan)]/50"
            style={{ boxShadow: "0 0 0 1px rgba(10,15,20,0.4) inset" }}
          />

          {/* Drag strip — covers the top 28px */}
          <div
            {...dragBind}
            className="absolute top-0 left-0 right-6 h-7 cursor-grab active:cursor-grabbing bg-[color:var(--nafas-cyan)]/8 hover:bg-[color:var(--nafas-cyan)]/14 border-b border-[color:var(--nafas-cyan)]/40 rounded-t-md flex items-center gap-2 px-2.5 backdrop-blur-[2px] transition-colors"
            style={{ touchAction: "none" }}
            aria-label="Déplacer le panneau"
          >
            {/* 6-dot grip */}
            <div className="flex flex-col gap-[2px]">
              <div className="flex gap-[2px]">
                <span className="size-[3px] rounded-full bg-[color:var(--nafas-cyan)]/80" />
                <span className="size-[3px] rounded-full bg-[color:var(--nafas-cyan)]/80" />
                <span className="size-[3px] rounded-full bg-[color:var(--nafas-cyan)]/80" />
              </div>
              <div className="flex gap-[2px]">
                <span className="size-[3px] rounded-full bg-[color:var(--nafas-cyan)]/80" />
                <span className="size-[3px] rounded-full bg-[color:var(--nafas-cyan)]/80" />
                <span className="size-[3px] rounded-full bg-[color:var(--nafas-cyan)]/80" />
              </div>
            </div>
            <span className="font-[family-name:var(--font-jetbrains)] text-[9px] tracking-[0.28em] uppercase text-[color:var(--nafas-cyan)]/90 truncate">
              {id}
            </span>
          </div>

          {/* Resize corner — SE */}
          {canResize && (
            <div
              {...resizeBind}
              className="absolute bottom-0 right-0 size-5 cursor-nwse-resize flex items-end justify-end p-0.5 text-[color:var(--nafas-cyan)] hover:text-[color:var(--nafas-accent2)] transition-colors bg-[color:var(--nafas-cyan)]/10 hover:bg-[color:var(--nafas-cyan)]/20 rounded-tl-md"
              style={{ touchAction: "none" }}
              aria-label="Redimensionner"
            >
              <svg viewBox="0 0 12 12" className="size-3.5 pointer-events-none">
                <path
                  d="M12 2 L2 12 M12 6 L6 12 M12 10 L10 12"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  fill="none"
                />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
}
