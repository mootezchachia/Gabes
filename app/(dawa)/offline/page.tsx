"use client";

import { useEffect, useState } from "react";
import type { Reading, Severity } from "@/lib/dawa/types";
import { StatusRing } from "@/components/dawa/StatusRing";

interface LastKnown {
  severity: Severity;
  driver: Reading | null;
  at: string;
}

function relativeFr(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "à l’instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  return `il y a ${days} j`;
}

export default function OfflinePage() {
  const [cached, setCached] = useState<LastKnown | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("dawa.lastKnown");
      if (!raw) return;
      setCached(JSON.parse(raw) as LastKnown);
    } catch {
      /* noop */
    }

    // Best-effort: try to bounce back to /dawa once online.
    const onOnline = () => {
      window.location.href = "/dawa";
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
      <div
        className="text-[10.5px] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)] mb-3"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        Hors ligne
      </div>
      <StatusRing
        severity={cached?.severity ?? "ok"}
        driver={cached?.driver ?? null}
        size={220}
      />
      <p className="mt-5 max-w-[34ch] text-[13px] text-[color:var(--nafas-ink3)]">
        {cached
          ? `Dernière lecture ${relativeFr(cached.at)}. Reconnexion en cours…`
          : "Nous n’avons pas encore de lecture mise en cache. Reconnexion en cours…"}
      </p>
      <div
        className="mt-6 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[color:var(--nafas-ink3)]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        <span className="size-1.5 rounded-full bg-[color:var(--nafas-amber)] animate-pulse" />
        Mode hors-ligne
      </div>
    </div>
  );
}
