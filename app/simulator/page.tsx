"use client";

import { useState } from "react";
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
  const plumeIntensity = useSim((s) => s.plumeIntensity);

  return (
    <>
      {HAS_TOKEN ? (
        <>
          <Map onReady={setMap} />
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
      ) : (
        <MissingTokenBanner />
      )}
      <CloseButton />
    </>
  );
}
