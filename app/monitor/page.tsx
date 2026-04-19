"use client";

import { useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { Map } from "@/components/monitor/Map";
import { DeckOverlay } from "@/components/monitor/DeckOverlay";
import { MissingTokenBanner } from "@/components/monitor/MissingTokenBanner";
import { TopBar } from "@/components/monitor/TopBar";
import { TimeStrip } from "@/components/monitor/TimeStrip";
import { AminaModal } from "@/components/monitor/AminaModal";
import { ColdOpen } from "@/components/monitor/ColdOpen";
import { InspectCard } from "@/components/monitor/InspectCard";
import { AudienceSwitcher } from "@/components/monitor/AudienceSwitcher";
import { AudienceFraming } from "@/components/monitor/AudienceFraming";
import { Atmosphere } from "@/components/monitor/Atmosphere";
import { LeftSidebar } from "@/components/monitor/LeftSidebar";
import { RightPanel } from "@/components/monitor/RightPanel";
import { useMonitor } from "@/lib/monitor/store";

const HAS_TOKEN = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

export default function MonitorPage() {
  const [map, setMap] = useState<MapboxMap | null>(null);
  const introPlayed = useMonitor((s) => s.introPlayed);
  const chromeReady = HAS_TOKEN ? introPlayed : true;

  return (
    <>
      {HAS_TOKEN ? (
        <>
          <div className="absolute inset-0">
            <Map onReady={setMap} />
            <DeckOverlay map={map} />
          </div>
          <Atmosphere />
          <ColdOpen map={map} />
        </>
      ) : (
        <MissingTokenBanner />
      )}

      {/* Chrome — fades in after intro */}
      <div
        className="contents"
        style={{ visibility: chromeReady ? "visible" : "hidden" }}
      >
        <div
          className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ opacity: chromeReady ? 1 : 0 }}
        >
          <div className="relative w-full h-full [&>*]:pointer-events-auto">
            <TopBar />
            {HAS_TOKEN && (
              <>
                <LeftSidebar />
                <RightPanel />
                <AudienceSwitcher />
                <AudienceFraming />
                <TimeStrip />
              </>
            )}
          </div>
        </div>
      </div>

      <InspectCard />
      <AminaModal />
    </>
  );
}
