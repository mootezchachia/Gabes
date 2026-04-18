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

// Cinematic intro chrome — overlays the Cesium canvas during the fly-in
const CinematicBoot = dynamic(
  () => import("@/components/monitor3d/CinematicBoot").then((m) => m.CinematicBoot),
  { ssr: false },
);
const IntroGate = dynamic(
  () => import("@/components/monitor3d/IntroGate").then((m) => m.IntroGate),
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

/**
 * HUD reveal thresholds (0..1) — tied to the 10s cinematic drive.
 *
 *   ~0.35  altitude ~4 Mm · first atmospheric entry · surface data arrives
 *   ~0.55  altitude ~600 km · city silhouette resolves · primary HUD shows
 *   ~0.70  altitude ~50 km · tools & timeline online
 *   ~0.85  altitude ~10 km · fine detail chrome (reticle, labels, inspect)
 *   ~0.92  altitude ~4 km · last actionable widgets, audience rail
 */
const THRESHOLDS = {
  status: 0.35,
  header: 0.55,
  legend: 0.6,
  layers: 0.68,
  atmosphere: 0.7,
  timeline: 0.75,
  tools: 0.8,
  keybinds: 0.85,
  labels: 0.88,
  reticle: 0.9,
  inspect: 0.9,
  aiScan: 0.9,
  audienceRail: 0.92,
} as const;

export default function Monitor3DPage() {
  return (
    <>
      {/* The 3D world */}
      <CesiumMap />
      <CesiumScene />
      <IntroGate threshold={THRESHOLDS.labels}>
        <TacticalLabels />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.aiScan}>
        <TacticalAIScan />
      </IntroGate>

      {/* Viewport-wide cinematic overlays */}
      <div className="tac-vignette" aria-hidden />
      <div className="tac-scanlines" aria-hidden />
      <IntroGate threshold={THRESHOLDS.reticle}>
        <TacticalReticle />
      </IntroGate>

      {/* Tactical chrome — hugs the edges, reveals stage-by-stage */}
      <IntroGate threshold={THRESHOLDS.status}>
        <TacticalStatus />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.header}>
        <TacticalHeader />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.audienceRail}>
        <TacticalAudienceRail />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.layers}>
        <TacticalLayers />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.atmosphere}>
        <TacticalAtmosphere />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.legend}>
        <TacticalLegend />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.timeline}>
        <TacticalTimeline />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.tools}>
        <TacticalTools />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.keybinds}>
        <TacticalKeybinds />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.inspect}>
        <TacticalInspect />
      </IntroGate>

      {/* Cinematic boot overlay — tops everything during the intro */}
      <CinematicBoot />
    </>
  );
}
