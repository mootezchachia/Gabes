import type { Metadata } from "next";
import { AnalytiqueClient } from "./AnalytiqueClient";

export const metadata: Metadata = {
  title: "Analytique",
};

// Authenticated dashboard — depends on per-session Supabase data. Never prerender.
export const dynamic = "force-dynamic";

export default function AnalytiquePage() {
  return <AnalytiqueClient />;
}
