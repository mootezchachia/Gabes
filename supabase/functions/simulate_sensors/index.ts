// @ts-nocheck — Deno edge function; uses `npm:` specifiers + Deno globals
/**
 * simulate_sensors — Supabase edge function
 *
 * Triggered every 2 min by pg_cron (schedule: "*\/2 * * * *").
 * See supabase/migrations/0004_helpers.sql for the cron.schedule call.
 *
 * Flow:
 *   1. Fetch Gabès wind from Open-Meteo (cache 15 min in weather_cache).
 *   2. Load active simulated sensors.
 *   3. Compute one reading per sensor (air = Pasquill; water = baseline).
 *   4. Batch-insert into sensor_readings.
 *
 * Uses SERVICE ROLE (bypasses RLS) — this function is trusted.
 */

import { createServiceClient, cors, json } from "../_shared/supabase.ts";
import {
  computeAirReading,
  computeWaterReading,
  type PanelLike,
  type SensorLike,
} from "../_shared/sim.ts";

const GABES_LAT = 33.88;
const GABES_LON = 10.10;
const WEATHER_TTL_MS = 15 * 60 * 1000;

async function getWind(
  supa: ReturnType<typeof createServiceClient>,
  orgId: string,
): Promise<{ speed_mps: number; direction_deg: number }> {
  const { data: cached } = await supa
    .from("weather_cache")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  if (
    cached &&
    Date.now() - new Date(cached.fetched_at).getTime() < WEATHER_TTL_MS
  ) {
    return {
      speed_mps: Number(cached.windspeed_mps ?? 3),
      direction_deg: Number(cached.winddirection_deg ?? 320),
    };
  }
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${GABES_LAT}&longitude=${GABES_LON}&current=wind_speed_10m,wind_direction_10m,temperature_2m&wind_speed_unit=ms`,
    );
    const j = await r.json();
    const ws = Number(j.current?.wind_speed_10m ?? 3);
    const wd = Number(j.current?.wind_direction_10m ?? 320);
    const t = Number(j.current?.temperature_2m ?? 20);
    await supa
      .from("weather_cache")
      .upsert({
        org_id: orgId,
        windspeed_mps: ws,
        winddirection_deg: wd,
        temperature_c: t,
        fetched_at: new Date().toISOString(),
      });
    return { speed_mps: ws, direction_deg: wd };
  } catch {
    // Fall back to last known or default
    return {
      speed_mps: Number(cached?.windspeed_mps ?? 3),
      direction_deg: Number(cached?.winddirection_deg ?? 320),
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return cors();

  const supa = createServiceClient();

  // For V2 we iterate all orgs; in practice there's one ('gabes').
  const { data: orgs, error: orgsErr } = await supa
    .from("orgs")
    .select("id, slug");
  if (orgsErr) return json({ error: orgsErr.message }, { status: 500 });

  const totalInserted: Record<string, number> = {};

  for (const org of orgs ?? []) {
    const wind = await getWind(supa, org.id);

    const { data: sensors, error: sErr } = await supa
      .from("sensors")
      .select("id, type, location, metadata, active, source, org_id")
      .eq("org_id", org.id)
      .eq("source", "simulated")
      .eq("active", true);
    if (sErr) continue;

    const { data: panels } = await supa
      .from("algae_panels")
      .select("id, location, area_m2, status")
      .eq("org_id", org.id)
      .eq("status", "active");

    const now = new Date();
    const tickSec = Math.floor(now.getTime() / 1000);

    const rows: Array<{
      sensor_id: string;
      value: number;
      taken_at: string;
      source: string;
    }> = [];

    for (const s of sensors ?? []) {
      // PostGIS geography returns either WKB hex or an object. We ensure we
      // have a {lon, lat} pair before calling the pure fn.
      const loc = parseGeog(s.location);
      if (!loc) continue;
      const sensor: SensorLike = {
        id: s.id,
        location: loc,
        type: s.type,
        metadata: s.metadata ?? {},
      };
      let value: number;
      if (["so2", "no2", "pm25", "pm10"].includes(s.type)) {
        value = computeAirReading(sensor, wind, now);
      } else {
        const nearbyPanels: PanelLike[] = (panels ?? [])
          .map((p) => ({
            id: p.id,
            location: parseGeog(p.location) ?? { lon: 0, lat: 0 },
            area_m2: Number(p.area_m2),
            status: p.status,
          }))
          .filter((p) => p.location.lon !== 0);
        value = computeWaterReading(sensor, nearbyPanels, tickSec);
      }
      rows.push({
        sensor_id: s.id,
        value: Number(value.toFixed(3)),
        taken_at: now.toISOString(),
        source: "simulated",
      });
    }

    if (rows.length > 0) {
      const { error: insErr } = await supa.from("sensor_readings").insert(rows);
      if (!insErr) totalInserted[org.slug] = rows.length;
    }
  }

  return json({ ok: true, inserted: totalInserted });
});

/**
 * Supabase returns geography columns either as GeoJSON (when selected via
 * PostgREST with geometry columns properly cast) or as WKB hex by default.
 * We attempt parse for both shapes.
 */
function parseGeog(
  raw: unknown,
): { lon: number; lat: number } | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null) {
    const o = raw as { coordinates?: [number, number]; type?: string };
    if (o.type === "Point" && Array.isArray(o.coordinates)) {
      return { lon: o.coordinates[0], lat: o.coordinates[1] };
    }
  }
  if (typeof raw === "string") {
    // Best-effort WKB hex → lon/lat decode. PostGIS WKB hex for POINT starts
    // with 0101 and embeds two little-endian doubles.
    try {
      const hex = raw.replace(/^SRID=\d+;/, "");
      if (hex.length >= 42) {
        const buf = new Uint8Array(
          hex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)),
        );
        const dv = new DataView(buf.buffer);
        // byte 0: endian; bytes 1-4: type; optional SRID if flag set
        let offset = 5;
        const typeFlags = dv.getUint32(1, true);
        if ((typeFlags & 0x20000000) !== 0) offset += 4; // SRID present
        const lon = dv.getFloat64(offset, true);
        const lat = dv.getFloat64(offset + 8, true);
        if (Number.isFinite(lon) && Number.isFinite(lat)) return { lon, lat };
      }
    } catch { /* ignore */ }
  }
  return null;
}
