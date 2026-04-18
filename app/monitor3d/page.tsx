"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { X } from "lucide-react";

// Cesium must render client-only — no SSR, no prerender
const CesiumMap = dynamic(
  () => import("@/components/monitor3d/CesiumMap").then((m) => m.CesiumMap),
  { ssr: false, loading: () => <BootOverlay /> },
);

const CesiumScene = dynamic(
  () => import("@/components/monitor3d/CesiumScene").then((m) => m.CesiumScene),
  { ssr: false },
);

function BootOverlay() {
  return (
    <div className="absolute inset-0 grid place-items-center text-[color:var(--nafas-ink3)]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-[color:var(--nafas-accent)]/20 border-t-[color:var(--nafas-accent)] animate-spin" />
        <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.24em] uppercase text-[color:var(--nafas-ink3)]/70">
          Chargement du globe
        </div>
      </div>
    </div>
  );
}

export default function Monitor3DPage() {
  return (
    <>
      <CesiumMap />
      <CesiumScene />

      {/* close → back to home */}
      <Link
        href="/"
        aria-label="Retour à l'accueil"
        className="absolute top-4 right-4 z-40 hud-chip p-2 hover:bg-white/5 transition-colors"
      >
        <X className="size-4 text-[color:var(--nafas-ink3)]" strokeWidth={1.8} />
      </Link>

      {/* build-in-progress banner */}
      <div className="absolute top-4 left-4 z-40 hud-chip px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[color:var(--nafas-amber)] animate-pulse" />
          <span className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-amber)]">
            NAFAS 3D · prototype
          </span>
        </div>
      </div>
    </>
  );
}
