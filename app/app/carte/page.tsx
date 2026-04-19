import type { Metadata } from "next";
import { Suspense } from "react";
import { CarteScene } from "@/components/app/carte/CarteScene";

export const metadata: Metadata = {
  title: "Carte",
};

// Authenticated map — Cesium + per-session Supabase entities. Never prerender.
export const dynamic = "force-dynamic";

/**
 * /app/carte — the authenticated, admin-tooled view of the 3D world.
 *
 * We disable SSR/prerendering for the Cesium island (done at the component
 * level via `dynamic({ ssr: false })`) but keep the page itself server-
 * rendered so the top bar + rail paint instantly.
 */
export default function CartePage() {
  return (
    <Suspense fallback={null}>
      <CarteScene />
    </Suspense>
  );
}
