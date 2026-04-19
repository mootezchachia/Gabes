// @ts-nocheck — Deno edge function; uses `npm:` specifiers + Deno globals
/**
 * ai_placement — Supabase edge function (admin only)
 *
 * Implements §8.1 of the design doc:
 *   1. Verify caller is admin.
 *   2. Generate hex-grid candidates in Gabès bbox via PostGIS RPC.
 *   3. Score each candidate (lib/scoring/placement equivalent, inlined).
 *   4. Spatial diversification (farthest-point greedy, 500m min).
 *   5. LLM narration (streamed) via OpenRouter fallback chain.
 *   6. Insert rows into ai_placements sharing a single run_id.
 *   7. Respond with SSE stream — each `placement` event is a JSON blob.
 *
 * POST body: { strategy?: 'phosphate_recovery'|'school_protection'|'biodiversity',
 *              target_count?: number }
 */

import OpenAI from "npm:openai@6";
import {
  cors,
  createServiceClient,
  getCallerContext,
  json,
} from "../_shared/supabase.ts";

const MODELS = [
  "qwen/qwen3-235b-a22b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free",
] as const;

const GABES_BBOX = { w: 9.80, s: 33.75, e: 10.35, n: 34.10 };
const GCT = { lon: 10.1178, lat: 33.9312 };
// Chatt Essalam as proxy for "school downwind" heuristic
const CHATT_ESSALAM = { lon: 10.1054, lat: 33.9121 };

type Strategy = "phosphate_recovery" | "school_protection" | "biodiversity";

const WEIGHTS: Record<Strategy, Record<string, number>> = {
  phosphate_recovery: { ps: 1.2, df: 0.8, mo: 0.5, sl: 0.6, sd: 0.4, pp: 1.3 },
  school_protection:  { ps: 1.0, df: 0.6, mo: 0.3, sl: 0.4, sd: 1.5, pp: 1.1 },
  biodiversity:       { ps: 0.7, df: 0.9, mo: 1.4, sl: 1.0, sd: 0.3, pp: 0.8 },
};

function haversine(a: { lon: number; lat: number }, b: { lon: number; lat: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clamp01(v: number) {
  return !isFinite(v) ? 0 : Math.max(0, Math.min(1, v));
}

function depthFit(d: number) {
  if (d <= 0) return 0;
  if (d < 3) return d / 3;
  if (d <= 8) return 1;
  if (d < 15) return (15 - d) / 7;
  return 0;
}

/** Generate hexagonal candidate grid (~250m cells) in bbox, then filter
 *  to those within 200-2000m of the GCT complex (coastal strip proxy). */
function generateCandidates(count = 400): Array<{ lon: number; lat: number }> {
  const out: Array<{ lon: number; lat: number }> = [];
  const step = 0.005; // ~500m in lat, ~465m in lon at 33.9°
  for (let lat = GABES_BBOX.s; lat <= GABES_BBOX.n; lat += step) {
    for (let lon = GABES_BBOX.w; lon <= GABES_BBOX.e; lon += step * 1.15) {
      const d = haversine({ lon, lat }, GCT);
      if (d < 200 || d > 4000) continue;
      out.push({ lon, lat });
      if (out.length >= count) return out;
    }
  }
  return out;
}

function scoreCandidate(
  cand: { lon: number; lat: number },
  strategy: Strategy,
  latestReadingsByRing: Record<number, number>,
): { score: number; components: Record<string, number> } {
  const w = WEIGHTS[strategy];
  const dGct = haversine(cand, GCT);
  const dSchool = haversine(cand, CHATT_ESSALAM);

  // pollution severity proxy: ring-1 sensors' mean / 500
  const pollutionMean = Object.values(latestReadingsByRing).length
    ? Object.values(latestReadingsByRing).reduce((a, b) => a + b, 0) /
      Object.values(latestReadingsByRing).length
    : 50;
  const pollutionSeverity = clamp01(pollutionMean / 500);

  // Crude depth model: east-of-Gabès is deeper. Coastal strip = 2-5m.
  const depthM = clamp01((cand.lon - 10.08) * 80) * 12;

  // Meadow overlap — proxy: farther offshore = historically more posidonia
  const meadow = clamp01((cand.lon - 10.08) * 4);

  // Shipping lane distance — proxy: 2km offshore band is shipping
  const shippingDist = Math.abs(cand.lon - 10.20) * 1000 * 90;

  // School downwind coverage — proxy: closer to Chatt Essalam + south of GCT
  const schoolDownwind = clamp01(1 - dSchool / 2000);

  // Phosphate plume overlap — proxy: 1 at GCT, 0 at 3km
  const phosphatePlume = clamp01(1 - dGct / 3000);

  // Short keys shared with the frontend (lib/sim/impact.ts → Components).
  // ps = proximity to GCT rejection (phosphate plume + pollution severity)
  // df = depth fit (bathymetry)
  // mo = meadow/posidonia overlap
  // sl = salinity / dilution / distance from shipping lane
  // sd = schools downwind
  // pp = population reached
  const components = {
    ps: clamp01(0.55 * phosphatePlume + 0.45 * pollutionSeverity),
    df: clamp01(depthFit(depthM)),
    mo: meadow,
    sl: clamp01(shippingDist / 1000),
    sd: schoolDownwind,
    pp: clamp01((dGct > 0 ? 1 - Math.min(1, dGct / 3500) : 0) * 0.8 + 0.2 * schoolDownwind),
  };

  const raw =
    w.ps * components.ps +
    w.df * components.df +
    w.mo * components.mo +
    w.sl * components.sl +
    w.sd * components.sd +
    w.pp * components.pp;
  const wTot = w.ps + w.df + w.mo + w.sl + w.sd + w.pp;
  return { score: raw / wTot, components };
}

function farthestPoint<T extends { location: { lon: number; lat: number } }>(
  ranked: T[],
  k: number,
  minM: number,
): T[] {
  const chosen: T[] = [];
  for (const c of ranked) {
    if (chosen.length >= k) break;
    if (chosen.every((p) => haversine(p.location, c.location) >= minM)) {
      chosen.push(c);
    }
  }
  return chosen;
}

async function llmRationale(
  comps: Record<string, number>,
  score: number,
  strategy: string,
): Promise<{ text: string | null; model_used: string | null; last_error?: string }> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return { text: null, model_used: null, last_error: "OPENROUTER_API_KEY not set" };
  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: { "HTTP-Referer": "https://nafas.tn", "X-Title": "NAFAS" },
  });
  const stratLabel: Record<string, string> = {
    phosphate_recovery: "Récupération du phosphate",
    school_protection: "Protection des écoles",
    biodiversity: "Biodiversité marine",
  };
  const userPrompt =
    `Tu es ORACLE, assistant scientifique de la plateforme NAFAS (Golfe de Gabès, Tunisie).
Une zone de déploiement de panneaux à algues a été scorée par un algorithme multi-critères.

Stratégie choisie: ${stratLabel[strategy] ?? strategy}
Score final: ${score.toFixed(2)} / 1.00
Composantes du score (chacune notée 0..1) :
  ps (proximité rejet phosphaté GCT) : ${comps.ps?.toFixed(2) ?? "n/a"}
  df (compatibilité bathymétrique)    : ${comps.df?.toFixed(2) ?? "n/a"}
  mo (valeur biodiversité Posidonia) : ${comps.mo?.toFixed(2) ?? "n/a"}
  sl (salinité / dilution littorale) : ${comps.sl?.toFixed(2) ?? "n/a"}
  sd (écoles sous le vent)            : ${comps.sd?.toFixed(2) ?? "n/a"}
  pp (population desservie)           : ${comps.pp?.toFixed(2) ?? "n/a"}

Rédige une justification en français de 60 mots MAXIMUM pour cette zone.
Commence par un verbe d'action fort.
Nomme EXACTEMENT DEUX critères dominants (les deux plus hauts) et cite leurs valeurs numériques.
Si le score < 0.6, termine par une courte mise en garde.
N'invente aucune donnée absente du tableau ci-dessus. Pas de noms de lieux inventés.`;
  let lastErr: string | undefined;
  for (const model of MODELS) {
    try {
      const r = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 180,
        temperature: 0.4,
      });
      const text = r.choices[0]?.message?.content ?? null;
      if (text && text.trim().length > 0) {
        return { text: text.trim(), model_used: model };
      }
      lastErr = `${model}: empty response`;
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string; code?: string };
      lastErr = `${model}: ${err.status ?? err.code ?? "?"} ${err.message ?? ""}`.slice(0, 180);
      // Continue on ANY error, not just 429/5xx. Keeps the fallback chain alive
      // when OpenRouter returns 400/401/404 for a specific model id.
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
  if (ctx.role !== "admin") return json({ error: "admin only" }, { status: 403 });

  let body: { strategy?: Strategy; target_count?: number } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const strategy = (body.strategy ?? "phosphate_recovery") as Strategy;
  const targetCount = Math.max(1, Math.min(10, body.target_count ?? 5));

  const supa = createServiceClient();

  // Pull latest ring-1 SO2 readings for a rough pollution context.
  const { data: recent } = await supa
    .from("sensor_readings")
    .select("sensor_id, value, taken_at, sensors!inner(metadata, type, org_id)")
    .eq("sensors.org_id", ctx.org_id)
    .eq("sensors.type", "so2")
    .order("taken_at", { ascending: false })
    .limit(400);

  const latestByRing: Record<number, number> = {};
  for (const row of recent ?? []) {
    const ring = Number(
      (row as unknown as { sensors: { metadata: { ring?: number } } })
        .sensors?.metadata?.ring ?? 0,
    );
    if (!latestByRing[ring]) latestByRing[ring] = Number(row.value);
  }

  const candidates = generateCandidates(400);
  const scored = candidates
    .map((location) => {
      const { score, components } = scoreCandidate(location, strategy, latestByRing);
      return { location, score, components };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 40);
  const chosen = farthestPoint(top, targetCount, 500);

  const runId = crypto.randomUUID();

  // SSE streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      send("run", { run_id: runId, strategy, candidates: candidates.length, picked: chosen.length });

      const results: Array<{
        id: string; location: { lon: number; lat: number }; score: number;
        components: Record<string, number>; rationale_md: string | null; model_name: string;
      }> = [];

      for (const c of chosen) {
        send("progress", { stage: "rationale", for: c.location });
        const { text, model_used, last_error } = await llmRationale(c.components, c.score, strategy);
        if (!text && last_error) {
          send("progress", { stage: "llm_warn", detail: last_error });
        }
        const modelName = model_used ?? "none";
        const area = 500;

        const { data: ins, error } = await supa
          .from("ai_placements")
          .insert({
            org_id: ctx.org_id,
            run_id: runId,
            proposed_location: `SRID=4326;POINT(${c.location.lon} ${c.location.lat})`,
            proposed_area_m2: area,
            score: c.score,
            score_components: c.components,
            rationale_md: text,
            strategy,
            status: "draft",
            model_name: modelName,
          })
          .select()
          .single();

        if (error) {
          send("error", { message: error.message });
          continue;
        }

        const item = {
          id: ins.id,
          location: c.location,
          score: c.score,
          components: c.components,
          rationale_md: text,
          model_name: modelName,
        };
        results.push(item);
        send("placement", item);
      }

      send("done", { run_id: runId, count: results.length });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      Connection: "keep-alive",
    },
  });
});
