"use client";

import dynamic from "next/dynamic";

// Cesium must render client-only — no SSR, no prerender
const CesiumMap = dynamic(
  () => import("@/components/monitor3d/CesiumMap").then((m) => m.CesiumMap),
  { ssr: false, loading: () => <BootOverlay /> },
);
const CesiumScene = dynamic(
  () => import("@/components/monitor3d/CesiumScene").then((m) => m.CesiumScene),
  { ssr: false },
);

// Chrome islands — ok for SSR since they render placeholder chrome until
// Zustand + Cesium hydrate.
const TacticalStatus       = dynamic(() => import("@/components/monitor3d/TacticalStatus").then((m) => m.TacticalStatus),           { ssr: false });
const TacticalHeader       = dynamic(() => import("@/components/monitor3d/TacticalHeader").then((m) => m.TacticalHeader),           { ssr: false });
const TacticalLayers       = dynamic(() => import("@/components/monitor3d/TacticalLayers").then((m) => m.TacticalLayers),           { ssr: false });
const TacticalAtmosphere   = dynamic(() => import("@/components/monitor3d/TacticalAtmosphere").then((m) => m.TacticalAtmosphere),   { ssr: false });
const TacticalTimeline     = dynamic(() => import("@/components/monitor3d/TacticalTimeline").then((m) => m.TacticalTimeline),       { ssr: false });
const TacticalAudienceRail = dynamic(() => import("@/components/monitor3d/TacticalAudienceRail").then((m) => m.TacticalAudienceRail), { ssr: false });
const TacticalTools        = dynamic(() => import("@/components/monitor3d/TacticalTools").then((m) => m.TacticalTools),             { ssr: false });
const TacticalLegend       = dynamic(() => import("@/components/monitor3d/TacticalLegend").then((m) => m.TacticalLegend),           { ssr: false });
const TacticalKeybinds     = dynamic(() => import("@/components/monitor3d/TacticalKeybinds").then((m) => m.TacticalKeybinds),       { ssr: false });
const TacticalInspect      = dynamic(() => import("@/components/monitor3d/TacticalInspect").then((m) => m.TacticalInspect),         { ssr: false });
const TacticalReticle      = dynamic(() => import("@/components/monitor3d/TacticalReticle").then((m) => m.TacticalReticle),         { ssr: false });
const TacticalLabels       = dynamic(() => import("@/components/monitor3d/TacticalLabels").then((m) => m.TacticalLabels),           { ssr: false });
const TacticalAIScan       = dynamic(() => import("@/components/monitor3d/TacticalAIScan").then((m) => m.TacticalAIScan),           { ssr: false });

function BootOverlay() {
  return (
    <div className="absolute inset-0 grid place-items-center text-[color:var(--nafas-ink3)]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-[color:var(--nafas-cyan)]/20 border-t-[color:var(--nafas-cyan)] animate-spin" />
        <div className="tac-label text-[9.5px] tracking-[0.32em] text-[color:var(--nafas-ink3)]/80">
          · Initialisation du globe ·
        </div>
      </div>
    </div>
  );
}

export default function Monitor3DPage() {
  return (
    <>
      {/* The 3D world */}
      <CesiumMap />
      <CesiumScene />
      <TacticalLabels />
      <TacticalAIScan />

      {/* Viewport-wide cinematic overlays */}
      <div className="tac-vignette" aria-hidden />
      <div className="tac-scanlines" aria-hidden />
      <TacticalReticle />

      {/* Tactical chrome — hugs the edges */}
      <TacticalStatus />
      <TacticalHeader />
      <TacticalAudienceRail />
      <TacticalLayers />
      <TacticalAtmosphere />
      <TacticalLegend />
      <TacticalTimeline />
      <TacticalTools />
      <TacticalKeybinds />
      <TacticalInspect />
    </>
  );
}
