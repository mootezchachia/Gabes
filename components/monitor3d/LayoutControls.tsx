"use client";

import { useEffect, useState } from "react";
import {
  PANEL_LABELS,
  PanelId,
  usePanelLayout,
} from "@/lib/monitor3d/panelLayout";
import { Unlock, Lock, RotateCcw, LayoutGrid } from "lucide-react";

/**
 * Keyboard choreography + edit-mode surface for the movable HUD.
 *
 *  L              — toggle lock/unlock globally
 *  Shift + R      — reset layout to defaults
 *  P              — open panel visibility chooser
 *  Esc (in P)     — close panel chooser
 *
 * Render-wise this component also produces a small bottom-left pill with
 * the hotkey legend when the layout is unlocked, and a centered panel
 * chooser modal when `P` is pressed.
 */
export function LayoutControls() {
  const locked = usePanelLayout((s) => s.locked);
  const toggleLock = usePanelLayout((s) => s.toggleLock);
  const reset = usePanelLayout((s) => s.reset);
  const visibility = usePanelLayout((s) => s.visibility);
  const toggleVisibility = usePanelLayout((s) => s.toggleVisibility);
  const hydrated = usePanelLayout((s) => s.hydrated);

  const [chooserOpen, setChooserOpen] = useState(false);

  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable) return true;
      return false;
    };
    function onKey(e: KeyboardEvent) {
      if (isTyping()) return;
      // Reset (Shift+R)
      if (e.shiftKey && (e.key === "R" || e.key === "r")) {
        e.preventDefault();
        reset();
        return;
      }
      // Lock toggle (L)
      if ((e.key === "l" || e.key === "L") && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleLock();
        return;
      }
      // Panel chooser (P)
      if ((e.key === "p" || e.key === "P") && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setChooserOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && chooserOpen) {
        setChooserOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset, toggleLock, chooserOpen]);

  if (!hydrated) return null;

  const panelIds = Object.keys(PANEL_LABELS) as PanelId[];

  return (
    <>
      {/* Edit-mode hint pill — bottom-left when unlocked */}
      {!locked && (
        <div
          className="fixed bottom-5 left-5 z-[55] flex items-center gap-3 px-3 py-2 rounded-md bg-[color:var(--nafas-bg)]/75 backdrop-blur-md border border-[color:var(--nafas-cyan)]/40"
          style={{ boxShadow: "0 8px 24px -12px rgba(62,201,208,0.35)" }}
        >
          <div className="flex items-center gap-2 text-[color:var(--nafas-cyan)]">
            <Unlock className="size-3.5" />
            <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.22em] uppercase">
              Layout déverrouillé
            </span>
          </div>
          <span className="w-px h-4 bg-white/10" />
          <KeyHint k="L" label="verrouiller" />
          <KeyHint k="P" label="panneaux" />
          <KeyHint k="⇧R" label="réinit." />
        </div>
      )}

      {/* Persistent control pill — bottom-right, always visible */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[54] pointer-events-auto hidden lg:flex items-center gap-1 p-1 rounded-md bg-[color:var(--nafas-bg)]/70 backdrop-blur-md border border-white/10">
        <LayoutButton
          onClick={toggleLock}
          active={!locked}
          title={locked ? "Déverrouiller (L)" : "Verrouiller (L)"}
        >
          {locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
        </LayoutButton>
        <LayoutButton
          onClick={() => setChooserOpen((v) => !v)}
          active={chooserOpen}
          title="Panneaux (P)"
        >
          <LayoutGrid className="size-3.5" />
        </LayoutButton>
        <LayoutButton onClick={reset} title="Réinitialiser (Shift+R)">
          <RotateCcw className="size-3.5" />
        </LayoutButton>
      </div>

      {/* Panel chooser — simple checklist */}
      {chooserOpen && (
        <>
          <button
            aria-label="Fermer"
            onClick={() => setChooserOpen(false)}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px]"
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[71] w-[min(92vw,440px)] rounded-lg bg-[color:var(--nafas-bg)]/95 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="px-5 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
              <div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.28em] uppercase text-[color:var(--nafas-ink3)]">
                  Panneaux visibles
                </div>
                <div className="font-[family-name:var(--font-fraunces)] italic text-[18px] text-[color:var(--nafas-surface)] mt-0.5">
                  Votre moniteur, votre choix.
                </div>
              </div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[9.5px] text-[color:var(--nafas-ink3)]/70 tracking-[0.2em] uppercase">
                Esc pour fermer
              </div>
            </div>
            <div className="p-3 grid grid-cols-2 gap-1">
              {panelIds.map((id) => {
                const on = visibility[id];
                return (
                  <button
                    key={id}
                    onClick={() => toggleVisibility(id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-left transition-colors ${
                      on
                        ? "bg-[color:var(--nafas-accent)]/10 border border-[color:var(--nafas-accent)]/25 hover:bg-[color:var(--nafas-accent)]/15"
                        : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`size-2 rounded-full ${on ? "bg-[color:var(--nafas-accent2)]" : "bg-[color:var(--nafas-ink3)]/40"}`}
                    />
                    <span className={`text-[13px] ${on ? "text-[color:var(--nafas-surface)]" : "text-[color:var(--nafas-ink3)]"}`}>
                      {PANEL_LABELS[id]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4 font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.2em] uppercase text-[color:var(--nafas-ink3)]">
                <KeyHint k="L" label="verrouiller" />
                <KeyHint k="⇧R" label="réinit." />
              </div>
              <button
                onClick={() => setChooserOpen(false)}
                className="text-[12px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function LayoutButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`size-8 grid place-items-center rounded transition-colors ${
        active
          ? "bg-[color:var(--nafas-cyan)]/15 text-[color:var(--nafas-cyan)]"
          : "text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function KeyHint({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="font-[family-name:var(--font-jetbrains)] text-[9px] px-1.5 py-[1px] rounded border border-white/15 bg-white/5 text-[color:var(--nafas-surface)] tracking-normal">
        {k}
      </kbd>
      <span className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--nafas-ink3)]">
        {label}
      </span>
    </span>
  );
}
