"use client";

import { useState, useEffect } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { Map } from "@/components/simulator/Map";
import { DeckOverlay } from "@/components/simulator/DeckOverlay";
import { CloseButton } from "@/components/simulator/CloseButton";
import { MissingTokenBanner } from "@/components/simulator/MissingTokenBanner";
import { Tour } from "@/components/simulator/Tour";
import { YearCounter } from "@/components/simulator/YearCounter";
import { SubtitleStrip } from "@/components/simulator/SubtitleStrip";
import { AminaCard } from "@/components/simulator/AminaCard";
import { DeployButton } from "@/components/simulator/DeployButton";
import { SkipButton } from "@/components/simulator/SkipButton";
import { AudioControl } from "@/components/simulator/AudioControl";
import { SandboxDock } from "@/components/simulator/SandboxDock";
import { useSim } from "@/lib/sim/store";

const HAS_TOKEN = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

export default function SimulatorPage() {
  const [map, setMap] = useState<MapboxMap | null>(null);
  const [safeMode, setSafeMode] = useState(false);
  const plumeIntensity = useSim((s) => s.plumeIntensity);

  // Read ?safe=1 from URL for diagnostic mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("safe") === "1") setSafeMode(true);
  }, []);

  return (
    <>
      {HAS_TOKEN ? (
        <>
          <Map onReady={setMap} safeMode={safeMode} />
          {!safeMode && (
            <>
              <DeckOverlay map={map} plumeIntensity={plumeIntensity} />
              <Tour map={map} />
              <AminaCard map={map} />
              <YearCounter />
              <SubtitleStrip />
              <DeployButton />
              <SkipButton />
              <AudioControl />
              <SandboxDock />
            </>
          )}
          {safeMode && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-black/60 backdrop-blur border border-white/10 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-amber)]">
              Safe mode · default dark-v11 · no terrain · pitch 0
            </div>
          )}
        </>
      ) : (
        <MissingTokenBanner />
      )}
      <CloseButton />
    </>
  );
}
