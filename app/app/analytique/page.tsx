import type { Metadata } from "next";
import { AnalytiqueClient } from "./AnalytiqueClient";

export const metadata: Metadata = {
  title: "Analytique",
};

export default function AnalytiquePage() {
  return <AnalytiqueClient />;
}
