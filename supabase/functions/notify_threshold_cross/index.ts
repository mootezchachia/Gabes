// @ts-nocheck — Deno edge function; uses `npm:` specifiers + Deno globals
/**
 * notify_threshold_cross — Supabase edge function
 *
 * Triggered via DB webhook (or a pg_cron-based polling call) AFTER INSERT
 * on sensor_readings. Checks whether the inserted value crosses a threshold
 * and publishes an ntfy.sh notification to zone topics and (for critical)
 * the org-wide topic.
 *
 * Anti-spam: 30-minute dedup via ntfy_alert_log.
 *
 * Expected payload (Supabase DB webhook shape):
 *   { type: 'INSERT',
 *     table: 'sensor_readings',
 *     record: { id, sensor_id, value, taken_at, source },
 *     schema: 'public' }
 *
 * If invoked directly (e.g. batch processing a scheduled sweep), POST:
 *   { sensor_id: uuid, value: number, taken_at?: iso8601 }
 */

import { createServiceClient, cors, json } from "../_shared/supabase.ts";

const NTFY_URL = Deno.env.get("NTFY_URL") ?? "https://ntfy.sh";
const TOPIC_PREFIX = Deno.env.get("NEXT_PUBLIC_NTFY_TOPIC_PREFIX") ?? "nafas-gabes";
const NTFY_AUTH = Deno.env.get("NTFY_AUTH_TOKEN");
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "https://nafas.tn";
const DEDUP_MS = 30 * 60 * 1000;

interface Thresholds { warning?: number; critical?: number }

function crossedWhich(value: number, t: Thresholds): "critical" | "warning" | null {
  if (t.critical != null && value >= Number(t.critical)) return "critical";
  if (t.warning != null && value >= Number(t.warning)) return "warning";
  return null;
}

const TYPE_LABEL: Record<string, string> = {
  so2: "SO₂", no2: "NO₂", pm25: "PM2.5", pm10: "PM10",
  ph: "pH", turbidity: "Turbidité", chlorophyll_a: "Chlorophylle-a",
  temperature: "Température",
};

const TYPE_UNIT: Record<string, string> = {
  so2: "µg/m³", no2: "µg/m³", pm25: "µg/m³", pm10: "µg/m³",
  ph: "", turbidity: "NTU", chlorophyll_a: "µg/L", temperature: "°C",
};

async function publishNtfy(opts: {
  topic: string;
  title: string;
  body: string;
  priority: "default" | "high" | "urgent";
  tags: string[];
  click: string;
  actionsHeader?: string;
}) {
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    Title: opts.title,
    Priority: opts.priority,
    Tags: opts.tags.join(","),
    Click: opts.click,
  };
  if (opts.actionsHeader) headers["Actions"] = opts.actionsHeader;
  if (NTFY_AUTH) headers["Authorization"] = `Bearer ${NTFY_AUTH}`;
  await fetch(`${NTFY_URL}/${opts.topic}`, {
    method: "POST",
    headers,
    body: opts.body,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return cors();

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { /* empty */ }

  // Accept both DB webhook shape and direct POST.
  let sensorId: string | undefined;
  let value: number | undefined;
  let takenAt: string | undefined;

  if (payload.record && typeof payload.record === "object") {
    const r = payload.record as Record<string, unknown>;
    sensorId = r.sensor_id as string;
    value = Number(r.value);
    takenAt = r.taken_at as string;
  } else {
    sensorId = payload.sensor_id as string;
    value = Number(payload.value);
    takenAt = payload.taken_at as string;
  }

  if (!sensorId || !Number.isFinite(value))
    return json({ error: "missing sensor_id / value" }, { status: 400 });

  const supa = createServiceClient();

  // Load sensor + thresholds + zones
  const { data: sensor, error: sErr } = await supa
    .from("sensors")
    .select("id, org_id, type, unit, label, thresholds, location")
    .eq("id", sensorId)
    .single();
  if (sErr || !sensor) return json({ error: "sensor not found" }, { status: 404 });

  const t = (sensor.thresholds ?? {}) as Thresholds;
  const key = crossedWhich(value!, t);
  if (!key) return json({ ok: true, crossed: false });

  // Fetch zones containing or within 2km of the sensor
  const { data: zones } = await supa.rpc("zones_near_sensor", {
    sensor_id_in: sensorId,
    radius_m: 2000,
  }).select() as unknown as { data: Array<{ id: string; slug: string; name: string; kind: string }> | null };

  // Fallback if RPC not defined: plain SQL
  let zoneRows = zones ?? [];
  if (!zoneRows || zoneRows.length === 0) {
    const { data: zs } = await supa
      .from("zones")
      .select("id, slug, name, kind")
      .eq("org_id", sensor.org_id);
    zoneRows = (zs ?? []) as typeof zoneRows;
  }

  const topics = new Set<string>();
  for (const z of zoneRows) {
    if (!z.slug) continue;
    if (!["school", "hospital", "residential", "coastal"].includes(z.kind)) continue;
    topics.add(`${TOPIC_PREFIX}-zone-${z.slug}`);
  }
  const generalTopic = `${TOPIC_PREFIX}-general`;

  const typeLabel = TYPE_LABEL[sensor.type] ?? sensor.type;
  const unit = TYPE_UNIT[sensor.type] ?? sensor.unit ?? "";
  const sensorLabel = sensor.label ?? sensor.id.slice(0, 8);
  const priority: "default" | "high" | "urgent" =
    key === "critical" ? "urgent" : "high";

  const title = `${typeLabel} ${key === "critical" ? "critique" : "élevé"} — ${sensorLabel}`;
  const threshold = key === "critical" ? t.critical : t.warning;
  const body = `${typeLabel} ${value!.toFixed(1)} ${unit} au capteur « ${sensorLabel} ». Seuil ${key === "critical" ? "critique" : "d'alerte"} : ${threshold} ${unit}. Évitez les déplacements en extérieur et suivez les consignes officielles.`;

  const click = `${APP_ORIGIN}/dawa?focus=sensor:${sensorId}`;
  const actions = `view, Voir sur la carte, ${APP_ORIGIN}/app/carte?focus=sensor:${sensorId}`;

  const targetTopics: string[] = [...topics];
  if (key === "critical") targetTopics.push(generalTopic);

  const sentTopics: string[] = [];
  for (const topic of targetTopics) {
    // Dedup check.
    // Rule: if a CRITICAL alert was sent in the window, suppress any further
    //       alert (warning OR critical). If only a WARNING was sent, a
    //       subsequent CRITICAL escalation is still allowed through.
    // Fixes review HIGH#4: oscillating warning↔critical no longer spams.
    let query = supa
      .from("ntfy_alert_log")
      .select("sent_at, threshold_key")
      .eq("sensor_id", sensorId)
      .eq("topic", topic)
      .gte("sent_at", new Date(Date.now() - DEDUP_MS).toISOString());
    if (key === "warning") {
      // Warning suppressed by any prior alert in window.
    } else {
      // Critical only suppressed by prior critical — lets us escalate.
      query = query.eq("threshold_key", "critical");
    }
    const { data: recent } = await query.limit(1);
    if (recent && recent.length > 0) continue;

    try {
      await publishNtfy({
        topic,
        title,
        body,
        priority,
        tags: key === "critical" ? ["rotating_light", "warning"] : ["warning"],
        click,
        actionsHeader: actions,
      });
      await supa.from("ntfy_alert_log").insert({
        sensor_id: sensorId,
        threshold_key: key,
        topic,
      });
      sentTopics.push(topic);
    } catch (e: unknown) {
      console.error(`ntfy publish failed for ${topic}:`, e);
    }
  }

  // Taken_at param is informational; we don't use it beyond logging.
  void takenAt;

  return json({ ok: true, crossed: key, sent_topics: sentTopics });
});
