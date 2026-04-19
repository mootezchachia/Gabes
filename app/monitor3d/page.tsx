"use client";

import dynamic from "next/dynamic";

const CesiumMap = dynamic(
  () => import("@/components/monitor3d/CesiumMap").then((m) => m.CesiumMap),
  { ssr: false, loading: () => <BootOverlay /> },
);
const CesiumScene = dynamic(
  () => import("@/components/monitor3d/CesiumScene").then((m) => m.CesiumScene),
  { ssr: false },
);
const CinematicBoot = dynamic(
  () => import("@/components/monitor3d/CinematicBoot").then((m) => m.CinematicBoot),
  { ssr: false },
);
const IntroGate = dynamic(
  () => import("@/components/monitor3d/IntroGate").then((m) => m.IntroGate),
  { ssr: false },
);
const MovablePanel = dynamic(
  () => import("@/components/monitor3d/MovablePanel").then((m) => m.MovablePanel),
  { ssr: false },
);

const TacticalStatus   = dynamic(() => import("@/components/monitor3d/TacticalStatus").then((m) => m.TacticalStatus),     { ssr: false });
const TacticalHeader   = dynamic(() => import("@/components/monitor3d/TacticalHeader").then((m) => m.TacticalHeader),     { ssr: false });
const TacticalTimeline = dynamic(() => import("@/components/monitor3d/TacticalTimeline").then((m) => m.TacticalTimeline), { ssr: false });
const TacticalKeybinds = dynamic(() => import("@/components/monitor3d/TacticalKeybinds").then((m) => m.TacticalKeybinds), { ssr: false });
const TacticalInspect  = dynamic(() => import("@/components/monitor3d/TacticalInspect").then((m) => m.TacticalInspect),   { ssr: false });
const TacticalReticle  = dynamic(() => import("@/components/monitor3d/TacticalReticle").then((m) => m.TacticalReticle),   { ssr: false });
const TacticalLabels   = dynamic(() => import("@/components/monitor3d/TacticalLabels").then((m) => m.TacticalLabels),     { ssr: false });
const Tac3DSidebar     = dynamic(() => import("@/components/monitor3d/Tac3DSidebar").then((m) => m.Tac3DSidebar),         { ssr: false });

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

const THRESHOLDS = {
  status:   0.35,
  header:   0.55,
  sidebar:  0.68,
  timeline: 0.75,
  keybinds: 0.85,
  labels:   0.88,
  reticle:  0.9,
  inspect:  0.9,
} as const;

export default function Monitor3DPage() {
  return (
    <>
      {/* 3D world */}
      <CesiumMap />
      <CesiumScene />
      <IntroGate threshold={THRESHOLDS.labels}>
        <TacticalLabels />
      </IntroGate>

      {/* Viewport-wide cinematic overlays */}
      <div className="tac-vignette" aria-hidden />
      <div className="tac-scanlines" aria-hidden />
      <IntroGate threshold={THRESHOLDS.reticle}>
        <TacticalReticle />
      </IntroGate>

      {/* Edge-anchored chrome */}
      <IntroGate threshold={THRESHOLDS.status}>
        <TacticalStatus />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.header}>
        <TacticalHeader />
      </IntroGate>
      <IntroGate threshold={THRESHOLDS.keybinds}>
        <TacticalKeybinds />
      </IntroGate>

      {/* Unified HUD sidebar — replaces all scattered MovablePanels */}
      <IntroGate threshold={THRESHOLDS.sidebar}>
        <Tac3DSidebar />
      </IntroGate>

      {/* Timeline stays at bottom */}
      <IntroGate threshold={THRESHOLDS.timeline}>
        <MovablePanel id="timeline" zIndex={40}>
          <TacticalTimeline />
        </MovablePanel>
      </IntroGate>

      {/* Inspect stays floating — triggered by map click */}
      <IntroGate threshold={THRESHOLDS.inspect}>
        <MovablePanel id="inspect" zIndex={50}>
          <TacticalInspect />
        </MovablePanel>
      </IntroGate>

      {/* Cinematic boot overlay */}
      <CinematicBoot />
    </>
  );
}
