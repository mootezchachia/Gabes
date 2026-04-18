// @ts-nocheck — Deno edge function; uses `npm:` specifiers + Deno globals
/**
 * ai_forecast — Supabase edge function (admin + supervisor)
 *
 * Implements §8.2 of the design doc.
 *
 * POST body:
 *   { target_kind: 'panel'|'placement',
 *     target_id: uuid,
 *     horizon_years?: number (default 10),
 *     with_brief?: boolean (default true) }
 */

import OpenAI from "npm:openai@6";
import {
  cors,
  createServiceClient,
  getCallerContext,
  json,
} from "../_shared/supabase.ts";
import { CALIBRATION_VERSION, runForecast } from "../_shared/forecast.ts";

const MODELS = [
  "qwen/qwen3-235b-a22b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free",
] as const;

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseGeog(raw: unknown): { lon: number; lat: number } | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null) {
    const o = raw as { coordinates?: [number, number]; type?: string };
    if (o.type === "Point" && Array.isArray(o.coordinates))
      return { lon: o.coordinates[0], lat: o.coordinates[1] };
  }
  if (typeof raw === "string") {
    try {
      const hex = raw.replace(/^SRID=\d+;/, "");
      if (hex.length >= 42) {
        const buf = new Uint8Array(hex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)));
        const dv = new DataView(buf.buffer);
        let offset = 5;
        const flags = dv.getUint32(1, true);
        if ((flags & 0x20000000) !== 0) offset += 4;
        return { lon: dv.getFloat64(offset, true), lat: dv.getFloat64(offset + 8, true) };
      }
    } catch { /* ignore */ }
  }
  return null;
}

async function llmBrief(
  projections: unknown,
  metadata: Record<string, unknown>,
): Promise<{ text: string | null; model_used: string | null }> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return { text: null, model_used: null };
  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: { "HTTP-Referer": "https://nafas.tn", "X-Title": "NAFAS" },
  });
  const prompt = `Tu es ORACLE. Voici la projection décennale pour un panneau à algues dans le Golfe de Gabès :
${JSON.stringify(projections, null, 2)}
Métadonnées: ${JSON.stringify(metadata)}

Rédige une note d'orientation en français de 200 mots MAXIMUM destinée à la Municipalité de Gabès :
- Contexte (1 phrase)
- Principal impact attendu (avec chiffre clé)
- 3 impacts quantifiés secondaires (liste à puces)
- 1 limite méthodologique

Cite uniquement les chiffres présents dans les projections. N'invente aucune donnée.`;
  for (const model of MODELS) {
    try {
      const r = await client.chat.completions.create({
        model, messages: [{ role: "user", content: prompt }],
        max_tokens: 500, temperature: 0.35,
      });
      return { text: r.choices[0]?.message?.content ?? null, model_used: model };
    } catch (e: unknown) {
      const s = (e as { status?: number }).status;
      if (s === 429 || (typeof s === "number" && s >= 500)) continue;
      return { text: null, model_used: null };
    }
  }
  return { text: null, model_used: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return cors();
  if (req.method !== "POST") return json({ error: "POST only" }, { status: 405 });

  const ctx = await getCallerContext(req);
  if (!ctx) return json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "supervisor"].includes(ctx.role))
    return json({ error: "admin or supervisor only" }, { status: 403 });

  let body: {
    target_kind?: "panel" | "placement";
    target_id?: string;
    horizon_years?: number;
    with_brief?: boolean;
  } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const targetKind = body.target_kind;
  const targetId = body.target_id;
  const horizon = Math.max(1, Math.min(30, body.horizon_years ?? 10));
  const withBrief = body.with_brief ?? true;
  if (!targetKind || !targetId)
    return json({ error: "target_kind and target_id required" }, { status: 400 });

  const supa = createServiceClient();

  // Resolve target (panel or placement)
  const table = targetKind === "panel" ? "algae_panels" : "ai_placements";
  const locCol = targetKind === "panel" ? "location" : "proposed_location";
  const areaCol = targetKind === "panel" ? "area_m2" : "proposed_area_m2";
  const { data: target, error: tErr } = await supa
    .from(table)
    .select(`id, org_id, ${locCol}, ${areaCol}`)
    .eq("id", targetId)
    .single();
  if (tErr || !target) return json({ error: "target not found" }, { status: 404 });
  if ((target as Record<string, string>).org_id !== ctx.org_id)
    return json({ error: "cross-org not allowed" }, { status: 403 });

  const loc = parseGeog((target as Record<string, unknown>)[locCol]);
  const area = Number((target as Record<string, number>)[areaCol] ?? 500);
  if (!loc) return json({ error: "target has no location" }, { status: 400 });

  const inputKey = JSON.stringify({
    t: targetKind, id: targetId, h: horizon,
    cal: CALIBRATION_VERSION, area,
  });
  const inputHash = await sha256Hex(inputKey);

  // Cache: 24h TTL
  const { data: cached } = await supa
    .from("ai_forecasts")
    .select("*")
    .eq("input_hash", inputHash)
    .eq("org_id", ctx.org_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    cached &&
    Date.now() - new Date(cached.created_at).getTime() < 24 * 3600_000
  ) {
    return json({
      forecast_id: cached.id,
      projections: cached.projections,
      brief_md: cached.brief_md,
      cached: true,
    });
  }

  const result = runForecast({
    location: loc,
    area_m2: area,
    horizon_years: horizon,
  });

  let briefMd: string | null = null;
  let modelUsed: string | null = null;
  if (withBrief) {
    const { text, model_used } = await llmBrief(result.projections, {
      area_m2: area, horizon_years: horizon, target_kind: targetKind,
    });
    briefMd = text;
    modelUsed = model_used;
  }

  const { data: ins, error: insErr } = await supa
    .from("ai_forecasts")
    .insert({
      org_id: ctx.org_id,
      target_kind: targetKind,
      target_id: targetId,
      horizon_years: horizon,
      projections: result.projections,
      assumptions: result.assumptions,
      brief_md: briefMd,
      model_name: modelUsed,
      input_hash: inputHash,
    })
    .select()
    .single();

  if (insErr) return json({ error: insErr.message }, { status: 500 });

  return json({
    forecast_id: ins.id,
    projections: result.projections,
    brief_md: briefMd,
    model_name: modelUsed,
    cached: false,
  });
});
