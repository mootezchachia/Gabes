"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { GABES } from "@/lib/tokens";
import type { LonLat } from "@/lib/dawa/types";

import { AlertsFeed } from "./AlertsFeed";
import { AminaInstallHint } from "./AminaInstallHint";
import { BottomTabBar, type DawaTab } from "./BottomTabBar";
import { HeaderStrip } from "./HeaderStrip";
import { LastKnownCache } from "./LastKnownCache";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { SettingsSheet } from "./SettingsSheet";
import { StatusRing } from "./StatusRing";
import { TrajetCard } from "./TrajetCard";
import {
  useDawaAlerts,
  useDawaSeverity,
  useLatestReadings,
  useNearbySensors,
  useNews,
  useProfile,
  useWeather,
  useZones,
} from "./hooks";

export function DawaClient() {
  const params = useSearchParams();
  const rawTab = params?.get("tab");
  const tab: DawaTab =
    rawTab === "alertes" || rawTab === "moi" ? rawTab : "statut";

  const [settingsOpen, setSettingsOpen] = useState(false);
  // When tab === 'moi' treat settings as full-screen.
  useEffect(() => {
    if (tab === "moi") setSettingsOpen(true);
  }, [tab]);

  const { data: profile = null } = useProfile();
  const { data: zones = [] } = useZones();
  const { data: weather = null } = useWeather();
  const { data: news = [] } = useNews();

  const anchors: LonLat[] = useMemo(() => {
    const a: LonLat[] = [];
    if (profile?.homeLocation) a.push(profile.homeLocation);
    if (profile?.schoolLocation) a.push(profile.schoolLocation);
    if (a.length === 0) a.push(GABES.aminaHome as LonLat);
    return a;
  }, [profile]);

  const { data: sensors = [] } = useNearbySensors(anchors, 2000);
  const { data: readings = [] } = useLatestReadings(sensors);
  const { severity, driver } = useDawaSeverity(readings, sensors.length);
  const alerts = useDawaAlerts(readings, news);

  return (
    <div className="relative min-h-[100dvh] flex flex-col">
      <ServiceWorkerRegister />
      <LastKnownCache severity={severity} driver={driver} />

      <HeaderStrip
        profile={profile}
        weather={weather}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <AminaInstallHint />

      {tab === "alertes" ? (
        <div className="flex-1 flex flex-col pb-[180px]">
          <AlertsFeed alerts={alerts} initialCount={20} fullScreen />
        </div>
      ) : (
        <>
          <div className="pt-6 pb-4 flex flex-col items-center">
            <div
              className="text-[10.5px] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)] mb-3"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              Qualité de l’air · à mes lieux
            </div>
            <StatusRing severity={severity} driver={driver} size={240} />
            <p className="mt-4 px-6 text-center text-[13px] leading-[1.5] text-[color:var(--nafas-ink3)] max-w-[40ch]">
              {severity === "critical"
                ? "Reste à la maison ce matin. Ferme les fenêtres du côté nord."
                : severity === "warning"
                  ? "Porte un masque si tu dois sortir. Évite les rues exposées."
                  : "Respire calmement. Les valeurs sont sous les seuils OMS."}
            </p>
          </div>

          <div className="flex-1 pb-[180px]">
            <AlertsFeed alerts={alerts} initialCount={6} />
          </div>

          <TrajetCard
            home={profile?.homeLocation ?? null}
            school={profile?.schoolLocation ?? null}
          />
        </>
      )}

      <BottomTabBar active={tab} />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        zones={zones}
        fullScreen={tab === "moi"}
      />
    </div>
  );
}
