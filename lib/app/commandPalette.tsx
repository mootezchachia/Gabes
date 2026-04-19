"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AlgaePanel, NewsEvent, Sensor, Zone } from "@/lib/supabase/types";

/**
 * Command palette data + UI hook (Cmd+K / Ctrl+K).
 *
 * Renders nothing itself — the TopBar wires it to a shadcn-style dialog.
 * We keep the hook + dialog decoupled so other pages can mount their own
 * palette shortcuts (e.g. /dawa has a simplified three-item palette).
 */

export type PaletteItem = {
  id: string;
  kind: "panel" | "sensor" | "zone" | "news" | "page";
  title: string;
  subtitle?: string;
  href: string;
};

const STATIC_PAGES: PaletteItem[] = [
  { id: "page-carte", kind: "page", title: "Carte", href: "/app/carte" },
  { id: "page-panneaux", kind: "page", title: "Panneaux à algues", href: "/app/objets/panneaux" },
  { id: "page-capteurs", kind: "page", title: "Capteurs", href: "/app/objets/capteurs" },
  { id: "page-zones", kind: "page", title: "Zones", href: "/app/objets/zones" },
  { id: "page-actualites", kind: "page", title: "Actualités", href: "/app/objets/actualites" },
  { id: "page-analytique", kind: "page", title: "Analytique", href: "/app/analytique" },
  { id: "page-utilisateurs", kind: "page", title: "Paramètres · Utilisateurs", href: "/app/parametres/utilisateurs" },
  { id: "page-couches", kind: "page", title: "Paramètres · Couches", href: "/app/parametres/couches" },
  { id: "page-org", kind: "page", title: "Paramètres · Organisation", href: "/app/parametres/organisation" },
  { id: "page-moi", kind: "page", title: "Paramètres · Moi", href: "/app/parametres/moi" },
];

function score(item: PaletteItem, query: string): number {
  if (!query) return 0;
  const q = query.toLowerCase().trim();
  const hay = `${item.title} ${item.subtitle ?? ""}`.toLowerCase();
  if (hay.startsWith(q)) return 2;
  if (hay.includes(q)) return 1;
  return 0;
}

export function usePaletteCorpus() {
  return useQuery<PaletteItem[]>({
    queryKey: ["palette", "corpus"],
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const [panels, sensors, zones, news] = await Promise.all([
        supabase.from("algae_panels").select("id, notes, status").limit(200),
        supabase.from("sensors").select("id, type, unit, device_id").limit(200),
        supabase.from("zones").select("id, name, kind").limit(200),
        supabase.from("news_events").select("id, title, happened_at").limit(50),
      ]);

      const items: PaletteItem[] = [...STATIC_PAGES];

      (panels.data as Pick<AlgaePanel, "id" | "notes" | "status">[] | null)?.forEach((row) => {
        items.push({
          id: `panel:${row.id}`,
          kind: "panel",
          title: row.notes?.slice(0, 60) || `Panneau ${row.id.slice(0, 8)}`,
          subtitle: `panneau · ${row.status}`,
          href: `/app/carte?focus=panel:${row.id}`,
        });
      });
      (sensors.data as Pick<Sensor, "id" | "type" | "unit" | "device_id">[] | null)?.forEach((row) => {
        items.push({
          id: `sensor:${row.id}`,
          kind: "sensor",
          title: row.device_id || `Capteur ${row.id.slice(0, 8)}`,
          subtitle: `capteur · ${row.type} · ${row.unit}`,
          href: `/app/carte?focus=sensor:${row.id}`,
        });
      });
      (zones.data as Pick<Zone, "id" | "name" | "kind">[] | null)?.forEach((row) => {
        items.push({
          id: `zone:${row.id}`,
          kind: "zone",
          title: row.name,
          subtitle: `zone · ${row.kind}`,
          href: `/app/carte?focus=zone:${row.id}`,
        });
      });
      (news.data as Pick<NewsEvent, "id" | "title" | "happened_at">[] | null)?.forEach((row) => {
        items.push({
          id: `news:${row.id}`,
          kind: "news",
          title: row.title,
          subtitle: `actualité · ${new Date(row.happened_at).toLocaleDateString("fr-FR")}`,
          href: `/app/objets/actualites?focus=${row.id}`,
        });
      });
      return items;
    },
  });
}

/** Opens/closes state + Cmd+K listener + filtered results. */
export function useCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: corpus } = usePaletteCorpus();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const trigger = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k";
      if (trigger) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = corpus ?? STATIC_PAGES;
  const filtered = useMemo(() => {
    if (!query) return items.slice(0, 20);
    return items
      .map((i) => ({ i, s: score(i, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 20)
      .map((x) => x.i);
  }, [items, query]);

  const select = useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      setQuery("");
      router.push(item.href);
    },
    [router],
  );

  return { open, setOpen, query, setQuery, filtered, select };
}
