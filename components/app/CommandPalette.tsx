"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef } from "react";
import { useCommandPalette } from "@/lib/app/commandPalette";
import { cn } from "@/lib/utils";

const KIND_BADGE: Record<string, string> = {
  panel: "Panneau",
  sensor: "Capteur",
  zone: "Zone",
  news: "Actualité",
  page: "Page",
};

export function CommandPalette() {
  const { open, setOpen, query, setQuery, filtered, select } = useCommandPalette();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Defer to let the dialog paint its popup.
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery("");
    }
  }, [open, setQuery]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[3px] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-150" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-[18vh] z-[90] -translate-x-1/2 w-[min(620px,calc(100vw-2rem))]",
            "rounded-xl border border-white/10 bg-[color:var(--nafas-bg2)] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.9)]",
            "data-[starting-style]:opacity-0 data-[starting-style]:translate-y-[-8px] data-[ending-style]:opacity-0 transition-all duration-150 outline-none overflow-hidden",
          )}
        >
          <Dialog.Title className="sr-only">Recherche globale</Dialog.Title>
          <div className="flex items-center gap-3 px-4 h-12 border-b border-white/5">
            <span className="text-[color:var(--nafas-ink3)] text-[14px]">⌕</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un panneau, un capteur, une zone, une page…"
              className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[color:var(--nafas-ink3)]/70"
              aria-label="Recherche globale"
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 h-5 rounded border border-white/10 text-[10px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
              ESC
            </kbd>
          </div>
          <div className="max-h-[360px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-[color:var(--nafas-ink3)]">
                Aucun résultat.
              </div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item)}
                  className="w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-white/5 focus:bg-white/5 outline-none transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-[color:var(--nafas-surface)] truncate">
                      {item.title}
                    </div>
                    {item.subtitle ? (
                      <div className="text-[11px] text-[color:var(--nafas-ink3)] truncate">
                        {item.subtitle}
                      </div>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[10px] font-[family-name:var(--font-jetbrains)] tracking-[0.12em] uppercase text-[color:var(--nafas-ink3)]/80 px-1.5 py-0.5 rounded border border-white/10">
                    {KIND_BADGE[item.kind] ?? item.kind}
                  </span>
                </button>
              ))
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
