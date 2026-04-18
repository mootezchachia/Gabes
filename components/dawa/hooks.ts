"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { distanceMeters } from "@/lib/dawa/geo";
import {
  MOCK_NEWS,
  MOCK_PROFILE,
  MOCK_SENSORS,
  MOCK_WEATHER,
  MOCK_ZONES,
  mockReadings,
  newsToAlerts,
  readingsToAlerts,
} from "@/lib/dawa/mockData";
import { computeSeverity } from "@/lib/dawa/severity";
import { getDawaClient } from "@/lib/dawa/supabase";
import type {
  AlertItem,
  LonLat,
  NewsEvent,
  Profile,
  Reading,
  Sensor,
  Severity,
  Weather,
  Zone,
} from "@/lib/dawa/types";

const QK = {
  profile: ["dawa", "profile"] as const,
  zones: ["dawa", "zones"] as const,
  sensors: (anchors: LonLat[]) => ["dawa", "sensors", anchors] as const,
  readings: (sensorIds: string[]) => ["dawa", "readings", sensorIds] as const,
  news: ["dawa", "news"] as const,
  weather: ["dawa", "weather"] as const,
};

/* ─────────────────────────── Profile ─────────────────────────── */

export function useProfile() {
  return useQuery<Profile | null>({
    queryKey: QK.profile,
    queryFn: async () => {
      const sb = await getDawaClient();
      if (!sb) return MOCK_PROFILE;
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return null;
      const { data, error } = await sb
        .from("profiles")
        .select(
          "user_id, full_name, home_location, school_location, preferred_locale",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) return null;
      return {
        userId: data.user_id,
        fullName: data.full_name,
        homeLocation: pointFromPg(data.home_location),
        schoolLocation: pointFromPg(data.school_location),
        preferredLocale: (data.preferred_locale as Profile["preferredLocale"]) ?? "fr",
      };
    },
  });
}

/* ─────────────────────────── Zones ─────────────────────────── */

export function useZones() {
  return useQuery<Zone[]>({
    queryKey: QK.zones,
    queryFn: async () => {
      const sb = await getDawaClient();
      if (!sb) return MOCK_ZONES;
      const { data } = await sb
        .from("zones")
        .select("id, slug, name, kind, centroid");
      if (!data) return MOCK_ZONES;
      return (data as unknown as Array<Record<string, unknown>>).map(
        (r) => ({
          id: String(r.id),
          slug: String(r.slug ?? r.name ?? r.id),
          name: String(r.name ?? ""),
          kind: r.kind as Zone["kind"],
          centroid: pointFromPg(r.centroid) ?? [0, 0],
        }),
      );
    },
  });
}

/* ─────────────────────────── Sensors near me ─────────────────────────── */

export function useNearbySensors(anchors: LonLat[], radiusM = 2000) {
  return useQuery<Sensor[]>({
    queryKey: QK.sensors(anchors),
    enabled: anchors.length > 0,
    queryFn: async () => {
      const sb = await getDawaClient();
      if (!sb) {
        // Mock mode: return sensors within radius of any anchor.
        return MOCK_SENSORS.filter((s) =>
          anchors.some((a) => distanceMeters(a, s.location) <= radiusM),
        );
      }
      // In real mode we fetch all sensors (small N for V2) and filter client-side.
      const { data } = await sb
        .from("sensors")
        .select("id, type, unit, location, thresholds, device_id, metadata")
        .eq("active", true);
      if (!data) return [];
      return (data as unknown as Array<Record<string, unknown>>)
        .map((r) => ({
          id: String(r.id),
          type: r.type as Sensor["type"],
          unit: String(r.unit),
          location: pointFromPg(r.location) ?? ([0, 0] as LonLat),
          thresholds: (r.thresholds as Sensor["thresholds"]) ?? {},
          label:
            (r.metadata as { label?: string } | null)?.label ||
            String(r.device_id ?? r.id),
        }))
        .filter((s) =>
          anchors.some((a) => distanceMeters(a, s.location) <= radiusM),
        );
    },
  });
}

/* ─────────────────────────── Latest readings + realtime ─────────────── */

export function useLatestReadings(sensors: Sensor[]) {
  const qc = useQueryClient();
  const sensorIds = sensors.map((s) => s.id).sort();

  const query = useQuery<Reading[]>({
    queryKey: QK.readings(sensorIds),
    enabled: sensors.length > 0,
    refetchInterval: 60_000,
    queryFn: async () => {
      const sb = await getDawaClient();
      if (!sb) return mockReadings();
      // Single IN query + client-side "latest per sensor" reduction.
      // Fetches last ~6 hours of readings for all target sensors in ONE
      // round-trip instead of N sequential queries (fixes review HIGH#8).
      const since = new Date(Date.now() - 6 * 3600_000).toISOString();
      const { data } = await sb
        .from("sensor_readings")
        .select("sensor_id, value, taken_at")
        .in("sensor_id", sensorIds)
        .gte("taken_at", since)
        .order("taken_at", { ascending: false });
      const seen = new Set<string>();
      const out: Reading[] = [];
      for (const r of data ?? []) {
        const sid = String(r.sensor_id);
        if (seen.has(sid)) continue;
        seen.add(sid);
        const s = sensors.find((x) => x.id === sid);
        if (!s) continue;
        out.push({
          sensorId: sid,
          type: s.type,
          unit: s.unit,
          value: Number(r.value),
          takenAt: String(r.taken_at),
          thresholds: s.thresholds,
          sensorLabel: s.label,
        });
      }
      return out;
    },
  });

  // Realtime subscription to sensor_readings for the subscribed IDs.
  // The channel ref survives the async IIFE and the cleanup can always reach
  // it, so we never leak a Realtime slot when sensorIds changes mid-setup
  // (fixes review HIGH#4 in /dawa review).
  const channelRef = useRef<{ unsubscribe: () => void } | null>(null);
  useEffect(() => {
    if (sensorIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const sb = await getDawaClient();
      if (!sb || cancelled) return;
      const ch = sb
        .channel(`dawa-readings-${sensorIds.join(",").slice(0, 40)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "sensor_readings",
          },
          (payload: { new?: Record<string, unknown> }) => {
            const n = payload?.new;
            if (!n) return;
            const sid = String(n.sensor_id);
            if (!sensorIds.includes(sid)) return;
            const s = sensors.find((x) => x.id === sid);
            if (!s) return;
            const newReading: Reading = {
              sensorId: sid,
              type: s.type,
              unit: s.unit,
              value: Number(n.value),
              takenAt: String(n.taken_at),
              thresholds: s.thresholds,
              sensorLabel: s.label,
            };
            qc.setQueryData<Reading[]>(QK.readings(sensorIds), (prev = []) => {
              const next = prev.filter((r) => r.sensorId !== sid);
              next.push(newReading);
              return next;
            });

            // Haptic tick on threshold cross (guarded).
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              const crit = s.thresholds.critical;
              const warn = s.thresholds.warning;
              if (
                (typeof crit === "number" && newReading.value >= crit) ||
                (typeof warn === "number" && newReading.value >= warn)
              ) {
                try {
                  (navigator as Navigator).vibrate?.([10]);
                } catch {
                  /* noop */
                }
              }
            }
          },
        )
        .subscribe();
      if (cancelled) {
        ch.unsubscribe();
        return;
      }
      channelRef.current = { unsubscribe: () => ch.unsubscribe() };
    })();
    return () => {
      cancelled = true;
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorIds.join(",")]);

  return query;
}

/* ─────────────────────────── News + weather ─────────────────────────── */

export function useNews() {
  return useQuery<NewsEvent[]>({
    queryKey: QK.news,
    queryFn: async () => {
      const sb = await getDawaClient();
      if (!sb) return MOCK_NEWS;
      const { data } = await sb
        .from("news_events")
        .select("id, title, body_md, happened_at, severity, link, location")
        .order("happened_at", { ascending: false })
        .limit(40);
      if (!data) return [];
      return (data as unknown as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        title: String(r.title),
        body_md: (r.body_md as string | null) ?? null,
        happenedAt: String(r.happened_at),
        severity: r.severity as NewsEvent["severity"],
        link: (r.link as string | null) ?? null,
        location: pointFromPg(r.location),
      }));
    },
  });
}

export function useWeather() {
  return useQuery<Weather>({
    queryKey: QK.weather,
    queryFn: async () => {
      const sb = await getDawaClient();
      if (!sb) return MOCK_WEATHER;
      const { data } = await sb
        .from("weather_cache")
        .select("windspeed_mps, winddirection_deg, temperature_c, fetched_at")
        .maybeSingle();
      if (!data) return MOCK_WEATHER;
      return {
        temperatureC: (data.temperature_c as number | null) ?? null,
        windspeedMps: (data.windspeed_mps as number | null) ?? null,
        winddirectionDeg: (data.winddirection_deg as number | null) ?? null,
        humidityPct: null,
        fetchedAt: String(data.fetched_at),
      };
    },
  });
}

/* ─────────────────────────── Derived ─────────────────────────── */

export function useDawaSeverity(
  readings: Reading[],
  expectedSensors: number,
): {
  severity: Severity;
  driver: Reading | null;
} {
  const severity = computeSeverity(readings, undefined, { expectedSensors });
  // Pick the reading with highest normalised value as the "driver".
  let driver: Reading | null = null;
  let maxNorm = -1;
  for (const r of readings) {
    const t = r.thresholds.critical ?? r.thresholds.warning ?? 1;
    const n = t > 0 ? r.value / t : 0;
    if (n > maxNorm) {
      maxNorm = n;
      driver = r;
    }
  }
  return { severity, driver };
}

export function useDawaAlerts(readings: Reading[], news: NewsEvent[]): AlertItem[] {
  const list: AlertItem[] = [...readingsToAlerts(readings), ...newsToAlerts(news)];
  list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return list;
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function pointFromPg(raw: unknown): LonLat | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    // WKT string like 'POINT(10.1 33.9)' or 'SRID=4326;POINT(...)'
    const m = raw.match(/POINT\s*\(([-0-9.]+)\s+([-0-9.]+)\)/i);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    return null;
  }
  if (typeof raw === "object") {
    const o = raw as { coordinates?: [number, number]; type?: string };
    if (Array.isArray(o.coordinates) && o.coordinates.length === 2) {
      return [o.coordinates[0], o.coordinates[1]];
    }
  }
  return null;
}
