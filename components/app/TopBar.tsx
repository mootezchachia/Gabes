"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/auth/useProfile";
import { useQuery } from "@tanstack/react-query";
import { UserMenu } from "./UserMenu";
import { CommandPalette } from "./CommandPalette";
import type { Org } from "@/lib/supabase/types";

function useOrg() {
  const { data: profile } = useProfile();
  return useQuery<Org | null>({
    queryKey: ["org", profile?.orgId],
    enabled: Boolean(profile?.orgId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!profile?.orgId) return null;
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("orgs")
        .select("*")
        .eq("id", profile.orgId)
        .maybeSingle();
      return (data as Org | null) ?? null;
    },
  });
}

export function TopBar() {
  const { data: org } = useOrg();
  const [paletteHint, setPaletteHint] = useState(true);
  // Dismiss the hint once user has used the palette. We can't easily know
  // that, so we just fade it out after 12s as a gentle reveal.
  if (paletteHint) {
    setTimeout(() => setPaletteHint(false), 12_000);
  }

  return (
    <header className="h-12 shrink-0 border-b border-white/5 bg-[color:var(--nafas-bg)]/80 backdrop-blur-xl flex items-center gap-3 px-4">
      <Link href="/app" className="flex items-center gap-2 shrink-0 group">
        <div className="size-6 rounded-[5px] bg-[color:var(--nafas-accent)] grid place-items-center text-black font-[family-name:var(--font-fraunces)] text-[13px] italic group-hover:bg-[color:var(--nafas-accent2)] transition-colors">
          N
        </div>
        <div className="text-[13px] font-medium tracking-wide">
          HealiX{" "}
          <span className="text-[color:var(--nafas-ink3)] font-normal">
            · {org?.name ?? "Gabès"}
          </span>
        </div>
      </Link>

      <div className="hidden md:flex items-center gap-2 h-7 ml-auto">
        <button
          type="button"
          aria-label="Recherche globale (⌘K)"
          onClick={() => {
            // The CommandPalette listens for Cmd+K. We dispatch the same
            // event so the button click opens the palette too.
            const ev = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              ctrlKey: true,
              bubbles: true,
            });
            window.dispatchEvent(ev);
          }}
          className="h-7 px-2.5 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-colors flex items-center gap-2 text-[12px] text-[color:var(--nafas-ink3)]"
        >
          <span>⌕ Rechercher…</span>
          <kbd className="text-[10px] font-[family-name:var(--font-jetbrains)] border border-white/10 rounded px-1 py-[1px]">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="ml-auto md:ml-0 flex items-center gap-1">
        <UserMenu />
      </div>
      <CommandPalette />
    </header>
  );
}
