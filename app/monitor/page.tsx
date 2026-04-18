"use client";

import { useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { Map } from "@/components/monitor/Map";
import { DeckOverlay } from "@/components/monitor/DeckOverlay";
import { MissingTokenBanner } from "@/components/monitor/MissingTokenBanner";
import { TopBar } from "@/components/monitor/TopBar";
import { TimeStrip } from "@/components/monitor/TimeStrip";
import { Legend } from "@/components/monitor/Legend";
import { AminaModal } from "@/components/monitor/AminaModal";

const HAS_TOKEN = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

export default function MonitorPage() {
  const [map, setMap] = useState<MapboxMap | null>(null);

  return (
    <>
      {HAS_TOKEN ? (
        <>
          {/* Map fills the whole viewport — chrome overlays on top */}
          <div className="absolute inset-0">
            <Map onReady={setMap} />
            <DeckOverlay map={map} />
          </div>

          {/* Edge vignette for depth — keeps attention on the center */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                "radial-gradient(ellipse 85% 70% at 50% 55%, transparent 45%, rgba(10,15,20,0.35) 80%, rgba(10,15,20,0.75) 100%)",
            }}
          />
        </>
      ) : (
        <MissingTokenBanner />
      )}

      {/* Floating glass chrome */}
      <TopBar />
      {HAS_TOKEN && (
        <>
          <TimeStrip />
          <Legend />
        </>
      )}

      <AminaModal />
    </>
  );
}
