import { NextResponse } from "next/server";

import { MOCK_SENSORS, mockReadings } from "@/lib/dawa/mockData";
import { recommendRoute } from "@/lib/dawa/routeRecommender";
import { getDawaClient } from "@/lib/dawa/supabase";
import type { LonLat, Reading, Sensor } from "@/lib/dawa/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLonLat(v: string | null): LonLat | null {
  if (!v) return null;
  const [a, b] = v.split(",").map((s) => Number(s.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
}

async function loadSensorsAndReadings(): Promise<{
  sensors: Sensor[];
  readings: Reading[];
}> {
  const sb = await getDawaClient();
  if (!sb) {
    return { sensors: MOCK_SENSORS, readings: mockReadings() };
  }
  try {
    const { data: sRows } = await sb
      .from("sensors")
      .select("id, type, unit, location, thresholds, device_id, metadata")
      .eq("active", true);

    const sensors: Sensor[] = (sRows ?? []).map(
      (r: Record<string, unknown>) => ({
        id: String(r.id),
        type: r.type as Sensor["type"],
        unit: String(r.unit),
        location: pointFromPg(r.location) ?? ([0, 0] as LonLat),
        thresholds: (r.thresholds as Sensor["thresholds"]) ?? {},
        label:
          (r.metadata as { label?: string } | null)?.label ||
          String(r.device_id ?? r.id),
      }),
    );

    // Single IN query + client-side latest-per-sensor reduction.
    // Fixes review HIGH#8 in /dawa review: one round-trip instead of N.
    const since = new Date(Date.now() - 6 * 3600_000).toISOString();
    const sensorIds = sensors.map((s) => s.id);
    const { data: rows } = await sb
      .from("sensor_readings")
      .select("sensor_id, value, taken_at")
      .in("sensor_id", sensorIds)
      .gte("taken_at", since)
      .order("taken_at", { ascending: false });
    const seen = new Set<string>();
    const readings: Reading[] = [];
    for (const r of (rows ?? []) as Array<{
      sensor_id: string;
      value: number;
      taken_at: string;
    }>) {
      const sid = String(r.sensor_id);
      if (seen.has(sid)) continue;
      seen.add(sid);
      const s = sensors.find((x) => x.id === sid);
      if (!s) continue;
      readings.push({
        sensorId: sid,
        type: s.type,
        unit: s.unit,
        value: Number(r.value),
        takenAt: String(r.taken_at),
        thresholds: s.thresholds,
        sensorLabel: s.label,
      });
    }
    return { sensors, readings };
  } catch {
    return { sensors: MOCK_SENSORS, readings: mockReadings() };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = parseLonLat(url.searchParams.get("home"));
  const dest = parseLonLat(url.searchParams.get("dest"));

  if (!home || !dest) {
    return NextResponse.json(
      { error: "home and dest are required as 'lon,lat'" },
      { status: 400 },
    );
  }

  const { sensors, readings } = await loadSensorsAndReadings();
  const result = recommendRoute(home, dest, sensors, readings);
  return NextResponse.json(result, {
    headers: {
      "Cache-Control":
        "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
    },
  });
}

function pointFromPg(raw: unknown): LonLat | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const m = raw.match(/POINT\s*\(([-0-9.]+)\s+([-0-9.]+)\)/i);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
    return null;
  }
  if (typeof raw === "object") {
    const o = raw as { coordinates?: [number, number] };
    if (Array.isArray(o.coordinates) && o.coordinates.length === 2) {
      return [o.coordinates[0], o.coordinates[1]];
    }
  }
  return null;
}
