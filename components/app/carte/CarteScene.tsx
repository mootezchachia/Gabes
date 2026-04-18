"use client";

import dynamic from "next/dynamic";
import { useIsAdmin, useIsSupervisorOrAdmin } from "@/lib/auth/useRole";
import { ToolRail } from "./ToolRail";
import { PlacePanelFlow } from "./PlacePanelFlow";
import { PlaceSensorFlow } from "./PlaceSensorFlow";
import { DrawZoneFlow } from "./DrawZoneFlow";
import { PlacementAIDialog } from "./PlacementAIDialog";
import { EntityDrawer } from "./EntityDrawer";
import { FocusUrlHandler } from "./FocusUrlHandler";

/**
 * Wraps the existing /monitor3d Cesium scene with admin tooling.
 *
 * We do NOT touch any file in `components/monitor3d/*`; we lazy-import the
 * same components used by /monitor3d and layer our tool rail + flows on top.
 * This keeps the monitor3d route working as-is and lets a future V2.1
 * redirect cleanly swap /monitor3d → /app/carte.
 */

const CesiumMap = dynamic(
  () => import("@/components/monitor3d/CesiumMap").then((m) => m.CesiumMap),
  { ssr: false, loading: () => <BootOverlay /> },
) as React.ComponentType<{ skipIntro?: boolean }>;
const CesiumScene = dynamic(
  () => import("@/components/monitor3d/CesiumScene").then((m) => m.CesiumScene),
  { ssr: false },
);
const CesiumClickBridge = dynamic(
  () => import("./CesiumClickBridge").then((m) => m.CesiumClickBridge),
  { ssr: false },
);

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

export function CarteScene() {
  const isAdmin = useIsAdmin();
  const canSeeRail = useIsSupervisorOrAdmin();

  return (
    <div className="absolute inset-0 overflow-hidden bg-[color:var(--nafas-bg)]">
      {/* 3D world — admin shell skips the 10s cinematic intro */}
      <CesiumMap skipIntro />
      <CesiumScene />

      {/* Admin tool rail — visible for admins, disabled for supervisors */}
      {canSeeRail ? <ToolRail disabled={!isAdmin} /> : null}

      {/* Cesium click → tool dispatch */}
      {isAdmin ? <CesiumClickBridge /> : null}

      {/* Flows (each opens its own drawer/dialog when its tool is active) */}
      {isAdmin ? (
        <>
          <PlacePanelFlow />
          <PlaceSensorFlow />
          <DrawZoneFlow />
          <PlacementAIDialog />
        </>
      ) : null}

      {/* Entity details drawer — shared by admin + supervisor */}
      <EntityDrawer />

      {/* Deep-link support: ?focus=panel:<id> opens the drawer on mount */}
      <FocusUrlHandler />
    </div>
  );
}
