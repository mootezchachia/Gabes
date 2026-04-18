"use client";

import { useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { Map } from "@/components/monitor/Map";
import { DeckOverlay } from "@/components/monitor/DeckOverlay";
import { MissingTokenBanner } from "@/components/monitor/MissingTokenBanner";
import { TopBar } from "@/components/monitor/TopBar";
import { LeftSidebar } from "@/components/monitor/LeftSidebar";
import { RightPanel } from "@/components/monitor/RightPanel";
import { BottomRow } from "@/components/monitor/BottomRow";
import { AminaModal } from "@/components/monitor/AminaModal";
import { TimeframePills } from "@/components/monitor/TimeframePills";
import { Legend } from "@/components/monitor/Legend";

const HAS_TOKEN = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

export default function MonitorPage() {
  const [map, setMap] = useState<MapboxMap | null>(null);

  return (
    <>
      {HAS_TOKEN ? (
        <>
          {/* Map fills the whole center area — sidebars + top + bottom overlay on top */}
          <div className="absolute top-12 left-[280px] right-[340px] bottom-72">
            <Map onReady={setMap} />
            <DeckOverlay map={map} />
          </div>
        </>
      ) : (
        <MissingTokenBanner />
      )}
      <TopBar />
      <LeftSidebar />
      <RightPanel />
      <BottomRow />
      {HAS_TOKEN && (
        <>
          <TimeframePills />
          <Legend />
        </>
      )}
      <AminaModal />
    </>
  );
}
