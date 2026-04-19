"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/app/ui/Primitives";
import { KpiStrip } from "@/components/app/analytique/KpiStrip";
import { SensorTrendsChart } from "@/components/app/analytique/SensorTrendsChart";
import { AiHistoryPanel } from "@/components/app/analytique/AiHistoryPanel";
import { NtfyAlertsPanel } from "@/components/app/analytique/NtfyAlertsPanel";
import { ScenarioCompareDialog } from "@/components/app/analytique/ScenarioCompareDialog";
import { PdfExportButton } from "@/components/app/analytique/PdfExportButton";
import { WaterQualityCard } from "@/components/app/analytique/WaterQualityCard";

export function AnalytiqueClient() {
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <Eyebrow className="mb-2">Analytique</Eyebrow>
            <h1 className="font-[family-name:var(--font-fraunces)] text-[34px] leading-[1.05] tracking-[-0.02em]">
              Surveiller, prévoir, décider.
            </h1>
            <p className="mt-2 text-[13.5px] text-[color:var(--nafas-ink3)] max-w-[60ch]">
              Indicateurs clés en temps réel, tendances des capteurs sur 7 jours, historique des
              scans ORACLE et comparateur de scénarios.
            </p>
          </div>
          <PdfExportButton />
        </div>

        <KpiStrip />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <SensorTrendsChart />
          <AiHistoryPanel onCompare={() => setCompareOpen(true)} />
        </div>

        <WaterQualityCard />

        <NtfyAlertsPanel />

        <ScenarioCompareDialog open={compareOpen} onOpenChange={setCompareOpen} />
      </div>
    </div>
  );
}
