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

const URBAN_STRATEGIES = new Set(["air_quality", "vulnerable_pop", "heat_resilience"]);

function urbanProjections(
  components: Record<string, number>,
  building: { surface_m2?: number; occupants?: number; name?: string; type?: string } | null,
  horizon: number,
): Array<Record<string, number>> {
  const bs = components.bs ?? 0;
  const po = components.po ?? 0;
  const hi = components.hi ?? 0;
  const ae = components.ae ?? 0;

  const raw_surface = building?.surface_m2 ?? bs * 4000;
  const effective_m2 = raw_surface * 0.35;
  const exposureBoost = 1 + 0.35 * ae;
  const occ_per_year = po * 3; // k persons

  const years: Array<Record<string, number>> = [];
  let cumulative_co2 = 0;
  let cumulative_occ_years = 0;
  let cumulative_nox = 0;
  for (let y = 1; y <= horizon; y++) {
    // 3-year ramp to full operation, then 2% growth as coverage optimizes.
    const ramp = y <= 3 ? y / 3 : 1 + 0.02 * (y - 3);
    const co2 = 2.0 * effective_m2 * exposureBoost * ramp; // kg
    const nox = 5.0 * effective_m2 * exposureBoost * ramp; // g
    const occ = occ_per_year; // stable
    const thermal = Math.min(2.2, 2 * bs * (0.4 + 0.6 * hi));
    cumulative_co2 += co2;
    cumulative_occ_years += occ;
    cumulative_nox += nox;
    years.push({
      year: y,
      co2_kg: Math.round(co2),
      nox_g: Math.round(nox),
      occupants_k: Math.round(occ * 10) / 10,
      thermal_c: Math.round(thermal * 10) / 10,
      cumulative_co2_kg: Math.round(cumulative_co2),
      cumulative_occupants_k_years: Math.round(cumulative_occ_years * 10) / 10,
      cumulative_nox_g: Math.round(cumulative_nox),
    });
  }
  return years;
}

async function llmBrief(
  projections: unknown,
  metadata: Record<string, unknown>,
  urban?: { strategy: string; components: Record<string, number>; building?: { name?: string; type?: string; surface_m2?: number; occupants?: number } | null },
): Promise<{ text: string | null; model_used: string | null; last_error?: string }> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return { text: null, model_used: null, last_error: "OPENROUTER_API_KEY not set" };
  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: { "HTTP-Referer": "https://gabes.vercel.app", "X-Title": "GABES" },
  });
  let prompt: string;
  if (urban) {
    const stratLabel: Record<string, string> = {
      air_quality: "Qualité de l'air urbain",
      vulnerable_pop: "Protection des populations vulnérables",
      heat_resilience: "Résilience aux îlots de chaleur",
    };
    const typeLabel: Record<string, string> = {
      school: "école", hospital: "hôpital", university: "université",
      housing: "résidence", office: "bâtiment administratif", mosque: "mosquée",
      hotel: "hôtel", mall: "centre commercial", industrial: "bâtiment industriel",
    };
    const b = urban.building ?? {};
    const arr = Array.isArray(projections) ? projections as Array<Record<string, number>> : [];
    const last = arr.length > 0 ? arr[arr.length - 1] : null;
    const first = arr.length > 0 ? arr[0] : null;
    const mid = arr.length > 4 ? arr[Math.floor(arr.length / 2) - 1] : null;
    // Compact summary instead of full JSON so the free models (Llama-3.3,
    // Gemma-2) don't hit their smaller context budget or refuse to parse.
    const compact = {
      horizon_years: arr.length,
      year_1: first,
      year_mid: mid,
      year_final: last,
    };
    prompt = `Tu es ORACLE, assistant scientifique de la plateforme GABES (ville de Gabès, Tunisie).

Bâtiment cible : ${b.name ?? "—"} (${typeLabel[b.type ?? ""] ?? b.type ?? "—"})
Surface disponible pour panneaux végétaux : ~${b.surface_m2 ?? 0} m²
Occupants quotidiens : ~${b.occupants ?? 0}
Stratégie retenue : ${stratLabel[urban.strategy] ?? urban.strategy}

Projection décennale (valeurs clés) :
${JSON.stringify(compact, null, 2)}

Rédige une note d'orientation en français de 180 mots MAXIMUM destinée à la Municipalité de Gabès. Structure :
- 1 phrase de contexte nommant le bâtiment et la stratégie
- 1 paragraphe sur l'impact principal sur 10 ans (cite au moins un chiffre du cumul)
- 3 bullets d'impacts secondaires quantifiés (chaque bullet cite un chiffre)
- 1 phrase de limite méthodologique

Cite uniquement les chiffres présents ci-dessus. N'invente aucune donnée. Commence directement par la note (pas d'en-tête).`;
  } else {
    prompt = `Tu es ORACLE. Voici la projection décennale pour un panneau à algues dans le Golfe de Gabès :
${JSON.stringify(projections, null, 2)}
Métadonnées: ${JSON.stringify(metadata)}

Rédige une note d'orientation en français de 200 mots MAXIMUM destinée à la Municipalité de Gabès :
- Contexte (1 phrase)
- Principal impact attendu (avec chiffre clé)
- 3 impacts quantifiés secondaires (liste à puces)
- 1 limite méthodologique

Cite uniquement les chiffres présents dans les projections. N'invente aucune donnée.`;
  }
  let lastErr: string | undefined;
  for (const model of MODELS) {
    try {
      const r = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.35,
      });
      const text = r.choices[0]?.message?.content;
      if (text && text.trim().length > 0) {
        return { text: text.trim(), model_used: model };
      }
      lastErr = `${model}: empty response`;
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string; code?: string };
      lastErr = `${model}: ${err.status ?? err.code ?? "?"} ${err.message ?? ""}`.slice(0, 180);
      // Continue on any error — fallback chain alive even on 400/401/404, just
      // like llmRationale in ai_placement. The previous early-return on
      // non-429/5xx was the root cause of "note LLM indisponible" being
      // sticky even when a later model would have succeeded.
      continue;
    }
  }
  return { text: null, model_used: null, last_error: lastErr };
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
  const extraCols = targetKind === "placement" ? ", strategy, score_components" : "";
  const { data: target, error: tErr } = await supa
    .from(table)
    .select(`id, org_id, ${locCol}, ${areaCol}${extraCols}`)
    .eq("id", targetId)
    .single();
  if (tErr || !target) return json({ error: "target not found" }, { status: 404 });
  if ((target as Record<string, string>).org_id !== ctx.org_id)
    return json({ error: "cross-org not allowed" }, { status: 403 });

  const loc = parseGeog((target as Record<string, unknown>)[locCol]);
  const area = Number((target as Record<string, number>)[areaCol] ?? 500);
  if (!loc) return json({ error: "target has no location" }, { status: 400 });

  // Urban-vegetal vs marine-algae — placement's strategy decides the physics.
  const placementStrategy = targetKind === "placement"
    ? String((target as Record<string, string>).strategy ?? "")
    : "";
  const isUrban = URBAN_STRATEGIES.has(placementStrategy);
  const scoreComponents = targetKind === "placement"
    ? ((target as Record<string, unknown>).score_components as Record<string, unknown> | null)
    : null;
  const buildingMeta = scoreComponents && typeof scoreComponents === "object"
    ? (scoreComponents.building as { name?: string; type?: string; surface_m2?: number; occupants?: number } | null)
    : null;

  // Cache key includes with_brief so a cached no-brief forecast isn't
  // returned when the caller re-requests with brief=true (fixes review HIGH#3).
  // Urban mode bumps the key so we don't serve a marine forecast for an urban
  // placement after the domain pivot.
  const inputKey = JSON.stringify({
    t: targetKind, id: targetId, h: horizon,
    cal: CALIBRATION_VERSION, area, brief: withBrief,
    mode: isUrban ? "urban" : "marine",
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

  // Only serve the cache when (a) it's fresh AND (b) it has the artifacts
  // the caller requested. A cached row with `brief_md = null` would
  // otherwise be sticky: the user asks for `with_brief=true`, we cache the
  // failed brief once, every subsequent request returns `null` from cache
  // and we never retry the LLM. The `withBrief` part of the cache key
  // already isolates brief-vs-no-brief calls, but if an earlier brief call
  // failed we want to retry — so require a non-null brief_md here.
  const cacheUsable =
    cached &&
    Date.now() - new Date(cached.created_at).getTime() < 24 * 3600_000 &&
    (!withBrief || !!cached.brief_md);

  if (cacheUsable) {
    return json({
      forecast_id: cached.id,
      projections: cached.projections,
      brief_md: cached.brief_md,
      cached: true,
    });
  }

  let projections: unknown;
  let assumptions: unknown;
  if (isUrban) {
    projections = urbanProjections(
      (scoreComponents ?? {}) as Record<string, number>,
      buildingMeta,
      horizon,
    );
    assumptions = {
      mode: "urban_vegetal_panel",
      panel_coverage_fraction: 0.35,
      co2_kg_per_m2_yr: 2.0,
      nox_g_per_m2_yr: 5.0,
      ramp_years: 3,
      coverage_growth_yr_after_ramp: 0.02,
    };
  } else {
    const result = runForecast({
      location: loc,
      area_m2: area,
      horizon_years: horizon,
    });
    projections = result.projections;
    assumptions = result.assumptions;
  }

  let briefMd: string | null = null;
  let modelUsed: string | null = null;
  let briefLastError: string | undefined;
  if (withBrief) {
    const r = await llmBrief(
      projections,
      { area_m2: area, horizon_years: horizon, target_kind: targetKind },
      isUrban
        ? {
            strategy: placementStrategy,
            components: (scoreComponents ?? {}) as Record<string, number>,
            building: buildingMeta,
          }
        : undefined,
    );
    briefMd = r.text;
    modelUsed = r.model_used;
    briefLastError = r.last_error;
  }

  const { data: ins, error: insErr } = await supa
    .from("ai_forecasts")
    .insert({
      org_id: ctx.org_id,
      target_kind: targetKind,
      target_id: targetId,
      horizon_years: horizon,
      projections,
      assumptions,
      brief_md: briefMd,
      model_name: modelUsed,
      input_hash: inputHash,
    })
    .select()
    .single();

  if (insErr) return json({ error: insErr.message }, { status: 500 });

  return json({
    forecast_id: ins.id,
    projections,
    brief_md: briefMd,
    model_name: modelUsed,
    mode: isUrban ? "urban" : "marine",
    cached: false,
    brief_error: briefLastError ?? null,
  });
});
