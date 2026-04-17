"use client";

import { useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { Map } from "@/components/simulator/Map";
import { DeckOverlay } from "@/components/simulator/DeckOverlay";
import { CloseButton } from "@/components/simulator/CloseButton";
import { MissingTokenBanner } from "@/components/simulator/MissingTokenBanner";

const HAS_TOKEN = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

export default function SimulatorPage() {
  const [map, setMap] = useState<MapboxMap | null>(null);

  return (
    <>
      {HAS_TOKEN ? (
        <>
          <Map onReady={setMap} />
          <DeckOverlay map={map} plumeIntensity={1} />
        </>
      ) : (
        <MissingTokenBanner />
      )}
      <CloseButton />

      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-20 px-4 py-2 rounded-full bg-black/50 backdrop-blur border border-white/10 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
        Simulateur · 42 capteurs · plume GCT
      </div>
    </>
  );
}
