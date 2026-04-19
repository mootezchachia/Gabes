import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { requireSupabaseUrl, requireSupabaseAnonKey } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/simulate
 *
 * End-to-end jury-demo trigger. Picks a random live sensor of the caller's
 * org, fabricates a reading above its critical threshold, forwards to the
 * `notify_threshold_cross` edge function, and returns the full pipeline
 * result so the UI can light up:
 *   - the sensor location on the globe,
 *   - the ntfy topics the notification was published to,
 *   - a cinematic alert overlay.
 *
 * No DB row is inserted — we call the edge function directly with a
 * synthetic `{sensor_id, value}` payload. The function writes to
 * `ntfy_alert_log` as usual, so the alert also appears in the history.
 *
 * Admin only.
 */
export async function POST(req: NextRequest) {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase non configuré" },
      { status: 500 },
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const app = (session.user.app_metadata ?? {}) as Record<string, unknown>;
  if (app.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const orgId = app.org_id as string | undefined;
  if (!orgId) return NextResponse.json({ error: "org_id missing" }, { status: 400 });

  let body: { sensor_type?: string; severity?: "warning" | "critical" } = {};
  try {
    body = await req.json();
  } catch {
    /* no body */
  }
  const sensorType = body.sensor_type ?? "so2";
  const severity = body.severity ?? "critical";

  const service = createServiceRoleClient();

  // Pick a random active sensor of the requested type. We also want its
  // location decoded so the UI can fly the camera directly.
  const { data: sensors, error: sErr } = await service
    .from("sensors")
    .select("id, label, type, unit, thresholds, location_geojson:location")
    .eq("org_id", orgId)
    .eq("type", sensorType)
    .eq("active", true)
    .limit(20);

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }
  if (!sensors || sensors.length === 0) {
    return NextResponse.json(
      { error: `Aucun capteur « ${sensorType} » actif dans cette organisation.` },
      { status: 404 },
    );
  }

  const picked = sensors[Math.floor(Math.random() * sensors.length)];
  const thresholds = (picked.thresholds ?? {}) as { warning?: number; critical?: number };
  const baseThreshold =
    severity === "critical"
      ? Number(thresholds.critical ?? thresholds.warning ?? 100)
      : Number(thresholds.warning ?? 50);
  // 20 % above threshold — comfortably above the crossing check even with
  // floating-point slop, but not so extreme it looks fake.
  const simValue = Math.round(baseThreshold * 1.2 * 10) / 10;

  // Resolve sensor coordinates. Supabase returns GEOGRAPHY as a GeoJSON
  // object when we alias the column; grab lon/lat for the cinematic.
  let lon: number | null = null;
  let lat: number | null = null;
  const locRaw = (picked as unknown as { location_geojson?: unknown }).location_geojson;
  if (locRaw && typeof locRaw === "object") {
    const o = locRaw as { coordinates?: [number, number]; type?: string };
    if (o.type === "Point" && Array.isArray(o.coordinates)) {
      lon = o.coordinates[0];
      lat = o.coordinates[1];
    }
  } else if (typeof locRaw === "string") {
    // Parse hex EWKB fallback (Supabase returns this when GeoJSON aliasing
    // isn't in play). Same trick as ai_forecast/parseGeog.
    try {
      const hex = (locRaw as string).replace(/^SRID=\d+;/, "");
      if (hex.length >= 42) {
        const buf = new Uint8Array(hex.match(/.{1,2}/g)!.map((h: string) => parseInt(h, 16)));
        const dv = new DataView(buf.buffer);
        let offset = 5;
        const flags = dv.getUint32(1, true);
        if ((flags & 0x20000000) !== 0) offset += 4;
        lon = dv.getFloat64(offset, true);
        lat = dv.getFloat64(offset + 8, true);
      }
    } catch {
      /* leave null */
    }
  }

  // Clear the dedup window for this sensor so repeated demo triggers fire.
  await service
    .from("ntfy_alert_log")
    .delete()
    .eq("sensor_id", picked.id)
    .gte("sent_at", new Date(Date.now() - 31 * 60 * 1000).toISOString());

  // Call the edge function directly. We use the anon key + the caller's
  // session JWT (same dance as the other proxies) so the gateway accepts
  // the request and the function can run.
  const url = `${requireSupabaseUrl()}/functions/v1/notify_threshold_cross`;
  const anon = requireSupabaseAnonKey();
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: anon,
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        sensor_id: picked.id,
        value: simValue,
        taken_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Edge function unreachable" },
      { status: 502 },
    );
  }

  const upstreamJson = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
  if (!upstream.ok) {
    return NextResponse.json(
      { error: (upstreamJson.error as string) || `HTTP ${upstream.status}` },
      { status: upstream.status },
    );
  }

  const sentByPipeline =
    (upstreamJson.sent_topics as string[] | undefined) ?? [];

  // Safety net: always push straight to the public demo topic so the user's
  // phone rings even if the pipeline silenced the general topic (sensor had
  // no critical threshold, wrong zone kind, anti-spam stale row, etc.).
  // Cheap — one extra HTTP POST to ntfy.sh.
  const demoTopic = "nafas-gabes-general";
  const sensorLabel = picked.label ?? String(picked.id).slice(0, 8);
  // Strip non-ASCII for HTTP headers (SO₂, —, µ would break the header
  // encoder on Vercel/Node's fetch and get the push silently rejected).
  // The message body itself stays full UTF-8.
  const toAscii = (s: string): string =>
    s
      .replace(/₂/g, "2").replace(/µ/g, "u")
      .replace(/²/g, "2").replace(/³/g, "3")
      .replace(/[—–]/g, "-").replace(/[«»]/g, "")
      .replace(/[éèê]/gi, "e").replace(/[àâ]/gi, "a").replace(/[îï]/gi, "i").replace(/[ôö]/gi, "o").replace(/[ûü]/gi, "u").replace(/[ç]/gi, "c")
      .replace(/[^\x20-\x7e]/g, "");
  const titleAscii = toAscii(`SO2 critique - ${sensorLabel}`);
  const ntfyBody = `SO₂ ${simValue} µg/m³ au capteur « ${sensorLabel} ». Seuil critique: ${baseThreshold} µg/m³. Évitez les déplacements en extérieur et suivez les consignes officielles.`;
  const ntfyBase = process.env.NTFY_URL?.replace(/\/+$/, "") || "https://ntfy.sh";

  // First attempt: full payload with headers. Errors surface, not swallowed.
  let directFired = false;
  let directError: string | null = null;
  try {
    const directRes = await fetch(`${ntfyBase}/${demoTopic}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Title: titleAscii,
        Priority: "urgent",
        Tags: "rotating_light,warning",
      },
      body: ntfyBody,
    });
    directFired = directRes.ok;
    if (!directRes.ok) {
      directError = `ntfy ${directRes.status} on ${demoTopic}: ${(await directRes.text().catch(() => "")).slice(0, 120)}`;
    }
  } catch (e) {
    directError = `ntfy fetch: ${(e as Error).message}`.slice(0, 160);
  }

  // Bulletproof fallback: if the fancy push failed for ANY reason, send the
  // simplest possible POST — no custom headers at all, just a plain text
  // body. ntfy accepts that and the body becomes the notification text. No
  // demo should ever not ring because of a header parse bug.
  if (!directFired) {
    try {
      const fallbackRes = await fetch(`${ntfyBase}/${demoTopic}`, {
        method: "POST",
        body: ntfyBody,
      });
      directFired = fallbackRes.ok;
      if (!directFired) {
        directError = `${directError ?? ""} | fallback ${fallbackRes.status}`.slice(0, 200);
      } else {
        directError = null;
      }
    } catch (e) {
      directError = `${directError ?? ""} | fallback fetch: ${(e as Error).message}`.slice(0, 200);
    }
  }

  console.log("[simulate]", {
    sensor: picked.id,
    value: simValue,
    sentByPipeline,
    directFired,
    directError,
  });

  // De-duplicate the topic list returned to the UI.
  const mergedTopics = Array.from(
    new Set([...sentByPipeline, ...(directFired ? [demoTopic] : [])]),
  );

  return NextResponse.json({
    ok: true,
    sensor: {
      id: picked.id,
      label: picked.label,
      type: picked.type,
      unit: picked.unit,
      lon,
      lat,
    },
    simulated_value: simValue,
    threshold: baseThreshold,
    severity,
    crossed: upstreamJson.crossed ?? severity,
    sent_topics: mergedTopics,
    direct_push: directFired,
    direct_error: directError,
  });
}
