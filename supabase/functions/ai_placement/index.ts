// @ts-nocheck — Deno edge function; uses `npm:` specifiers + Deno globals
/**
 * ai_placement — Supabase edge function (admin only)
 *
 * Pivoted domain: vegetal panels on Gabès buildings (green walls / green
 * roofs) targeting air pollution exposure, vulnerable population, or urban
 * heat islands.
 *
 *   1. Verify caller is admin.
 *   2. Score each building in the curated list (inline below).
 *   3. Spatial diversification (farthest-point greedy, 500 m min).
 *   4. LLM narration (streamed) via OpenRouter fallback chain.
 *   5. Insert rows into ai_placements sharing a single run_id.
 *   6. Respond with SSE stream — each `placement` event is a JSON blob.
 *
 * POST body: { strategy?: 'air_quality'|'vulnerable_pop'|'heat_resilience',
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

const GCT = { lon: 10.1178, lat: 33.9312 };

type Strategy = "air_quality" | "vulnerable_pop" | "heat_resilience";

type BuildingType =
  | "school" | "hospital" | "university" | "housing"
  | "office" | "mosque" | "hotel" | "mall" | "industrial";

interface Building {
  id: string;
  name: string;
  type: BuildingType;
  lon: number;
  lat: number;
  surface_m2: number;
  occupants: number;
  ndvi: number;
  heat_island_c: number;
}

/** Curated set of 25 Gabès buildings — keep in sync with
 *  `public/data/gabes-buildings.geojson`. Inlined here because edge functions
 *  can't reach the Next.js public folder at runtime. */
const BUILDINGS: Building[] = [
  { id: "b-01", name: "École Primaire Bab Bhar", type: "school", lon: 10.1045, lat: 33.8832, surface_m2: 850, occupants: 420, ndvi: 0.08, heat_island_c: 3.2 },
  { id: "b-02", name: "École Primaire Chatt Essalam", type: "school", lon: 10.1002, lat: 33.9105, surface_m2: 720, occupants: 380, ndvi: 0.04, heat_island_c: 4.6 },
  { id: "b-03", name: "Collège Gabès Centre", type: "school", lon: 10.1051, lat: 33.8861, surface_m2: 1450, occupants: 850, ndvi: 0.11, heat_island_c: 3.8 },
  { id: "b-04", name: "Lycée Farhat Hached", type: "school", lon: 10.0968, lat: 33.8898, surface_m2: 2200, occupants: 1200, ndvi: 0.12, heat_island_c: 3.4 },
  { id: "b-05", name: "École Primaire Ghannouche", type: "school", lon: 10.1078, lat: 33.9289, surface_m2: 680, occupants: 340, ndvi: 0.05, heat_island_c: 5.1 },
  { id: "b-06", name: "Lycée Ghannouche", type: "school", lon: 10.1045, lat: 33.9272, surface_m2: 1800, occupants: 950, ndvi: 0.06, heat_island_c: 5.0 },
  { id: "b-07", name: "CHU Habib Bourguiba Gabès", type: "hospital", lon: 10.0884, lat: 33.8879, surface_m2: 3800, occupants: 2400, ndvi: 0.18, heat_island_c: 2.9 },
  { id: "b-08", name: "Hôpital Régional Ghannouche", type: "hospital", lon: 10.1102, lat: 33.9245, surface_m2: 1600, occupants: 850, ndvi: 0.09, heat_island_c: 4.8 },
  { id: "b-09", name: "Université de Gabès · Campus Central", type: "university", lon: 10.0825, lat: 33.8821, surface_m2: 4200, occupants: 3200, ndvi: 0.22, heat_island_c: 2.5 },
  { id: "b-10", name: "Grande Mosquée de Jara", type: "mosque", lon: 10.1058, lat: 33.8864, surface_m2: 1100, occupants: 600, ndvi: 0.07, heat_island_c: 3.7 },
  { id: "b-11", name: "Mosquée Ghannouche", type: "mosque", lon: 10.1089, lat: 33.9258, surface_m2: 680, occupants: 420, ndvi: 0.05, heat_island_c: 4.9 },
  { id: "b-12", name: "Résidence El Khalij", type: "housing", lon: 10.1014, lat: 33.8762, surface_m2: 2800, occupants: 1900, ndvi: 0.10, heat_island_c: 3.6 },
  { id: "b-13", name: "Cité Jedida · Bloc A", type: "housing", lon: 10.0929, lat: 33.8848, surface_m2: 2400, occupants: 1650, ndvi: 0.13, heat_island_c: 3.1 },
  { id: "b-14", name: "Cité Olympique", type: "housing", lon: 10.0964, lat: 33.8929, surface_m2: 3200, occupants: 2100, ndvi: 0.14, heat_island_c: 3.3 },
  { id: "b-15", name: "Cité El Menzah Gabès", type: "housing", lon: 10.0898, lat: 33.8793, surface_m2: 1900, occupants: 1150, ndvi: 0.16, heat_island_c: 2.8 },
  { id: "b-16", name: "Résidence Chatt Essalam", type: "housing", lon: 10.0987, lat: 33.9118, surface_m2: 2600, occupants: 1550, ndvi: 0.05, heat_island_c: 4.5 },
  { id: "b-17", name: "Logements Ghannouche Ouest", type: "housing", lon: 10.1012, lat: 33.9221, surface_m2: 2100, occupants: 1300, ndvi: 0.07, heat_island_c: 4.7 },
  { id: "b-18", name: "Résidence Teboulbou", type: "housing", lon: 10.0912, lat: 33.8538, surface_m2: 1800, occupants: 1100, ndvi: 0.20, heat_island_c: 2.4 },
  { id: "b-19", name: "Municipalité de Gabès", type: "office", lon: 10.1032, lat: 33.8874, surface_m2: 1250, occupants: 350, ndvi: 0.09, heat_island_c: 3.5 },
  { id: "b-20", name: "Gouvernorat de Gabès", type: "office", lon: 10.1014, lat: 33.8891, surface_m2: 1480, occupants: 420, ndvi: 0.11, heat_island_c: 3.4 },
  { id: "b-21", name: "Centre Commercial Gabès", type: "mall", lon: 10.0972, lat: 33.8905, surface_m2: 3500, occupants: 1800, ndvi: 0.05, heat_island_c: 3.9 },
  { id: "b-22", name: "Hôtel Chems El Hana", type: "hotel", lon: 10.1082, lat: 33.8821, surface_m2: 1900, occupants: 300, ndvi: 0.15, heat_island_c: 2.9 },
  { id: "b-23", name: "Marché Central de Gabès", type: "mall", lon: 10.1048, lat: 33.8858, surface_m2: 1350, occupants: 900, ndvi: 0.04, heat_island_c: 3.8 },
  { id: "b-24", name: "Gare Routière de Gabès", type: "office", lon: 10.0992, lat: 33.8839, surface_m2: 1100, occupants: 500, ndvi: 0.06, heat_island_c: 3.6 },
  { id: "b-25", name: "Centre Culturel de Gabès", type: "office", lon: 10.0945, lat: 33.8882, surface_m2: 950, occupants: 280, ndvi: 0.18, heat_island_c: 2.7 },
];

const WEIGHTS: Record<Strategy, Record<string, number>> = {
  air_quality:     { ae: 1.4, bs: 0.9, po: 1.0, vu: 0.6, hi: 0.5, gr: 0.6 },
  vulnerable_pop:  { ae: 1.0, bs: 0.6, po: 1.0, vu: 1.5, hi: 0.4, gr: 0.5 },
  heat_resilience: { ae: 0.5, bs: 0.9, po: 0.8, vu: 0.3, hi: 1.5, gr: 1.2 },
};

const TYPE_VULNERABILITY: Record<BuildingType, number> = {
  school: 1.0, hospital: 0.95, university: 0.7, mosque: 0.55,
  housing: 0.55, mall: 0.35, hotel: 0.3, office: 0.3, industrial: 0.1,
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

function airExposure(loc: { lon: number; lat: number }): number {
  const d = haversine(loc, GCT);
  const proximity = clamp01(1 - d / 3500);
  const dLat = loc.lat - GCT.lat;
  const dLon = loc.lon - GCT.lon;
  let downwind = 0.3;
  if (dLat < 0) {
    const raw = Math.abs(Math.atan2(dLon, dLat) - Math.PI);
    const theta = Math.min(raw, Math.abs(raw - 2 * Math.PI));
    downwind = clamp01(1 - theta / (Math.PI / 3));
  }
  return clamp01(0.6 * proximity + 0.4 * downwind);
}

function scoreBuilding(
  b: Building,
  strategy: Strategy,
): { score: number; components: Record<string, number> } {
  const w = WEIGHTS[strategy];
  const loc = { lon: b.lon, lat: b.lat };

  const components = {
    ae: airExposure(loc),
    bs: clamp01(b.surface_m2 / 4000),
    po: clamp01(b.occupants / 3000),
    vu: clamp01(TYPE_VULNERABILITY[b.type] ?? 0.3),
    hi: clamp01(b.heat_island_c / 6),
    gr: clamp01(1 - b.ndvi),
  };

  const raw =
    w.ae * components.ae +
    w.bs * components.bs +
    w.po * components.po +
    w.vu * components.vu +
    w.hi * components.hi +
    w.gr * components.gr;
  const wTot = w.ae + w.bs + w.po + w.vu + w.hi + w.gr;
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
  building: Building,
  comps: Record<string, number>,
  score: number,
  strategy: string,
): Promise<{ text: string | null; model_used: string | null; last_error?: string }> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return { text: null, model_used: null, last_error: "OPENROUTER_API_KEY not set" };
  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: { "HTTP-Referer": "https://gabes.vercel.app", "X-Title": "GABES" },
  });
  const stratLabel: Record<string, string> = {
    air_quality: "Qualité de l'air urbain",
    vulnerable_pop: "Protection des populations vulnérables",
    heat_resilience: "Résilience aux îlots de chaleur",
  };
  const typeLabel: Record<BuildingType, string> = {
    school: "école", hospital: "hôpital", university: "université",
    housing: "résidence", office: "bâtiment administratif", mosque: "mosquée",
    hotel: "hôtel", mall: "centre commercial", industrial: "bâtiment industriel",
  };
  const userPrompt =
    `Tu es ORACLE, assistant scientifique de la plateforme GABES (ville de Gabès, Tunisie).
Un bâtiment a été scoré par un algorithme multi-critères pour l'installation de panneaux végétaux (murs/toits végétalisés).

Bâtiment : ${building.name} (${typeLabel[building.type] ?? building.type})
Surface panneau disponible : ~${building.surface_m2} m²
Occupants quotidiens : ~${building.occupants}
Stratégie choisie : ${stratLabel[strategy] ?? strategy}
Score final : ${score.toFixed(2)} / 1.00
Composantes du score (chacune notée 0..1) :
  ae (exposition pollution GCT)        : ${comps.ae?.toFixed(2) ?? "n/a"}
  bs (surface bâtiment disponible)     : ${comps.bs?.toFixed(2) ?? "n/a"}
  po (occupants desservis)             : ${comps.po?.toFixed(2) ?? "n/a"}
  vu (vulnérabilité école/hôpital)     : ${comps.vu?.toFixed(2) ?? "n/a"}
  hi (îlot de chaleur urbain)          : ${comps.hi?.toFixed(2) ?? "n/a"}
  gr (manque de végétal existant)      : ${comps.gr?.toFixed(2) ?? "n/a"}

Rédige une justification en français de 60 mots MAXIMUM pour installer des panneaux végétaux sur ce bâtiment.
Commence par un verbe d'action fort.
Nomme EXACTEMENT DEUX critères dominants (les deux plus hauts) et cite leurs valeurs numériques.
Si le score < 0.6, termine par une courte mise en garde.
N'invente aucune donnée absente du tableau ci-dessus. Pas de noms inventés.`;
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
  const strategy = (body.strategy ?? "air_quality") as Strategy;
  const targetCount = Math.max(1, Math.min(10, body.target_count ?? 5));

  const supa = createServiceClient();

  const scored = BUILDINGS
    .map((b) => {
      const { score, components } = scoreBuilding(b, strategy);
      return {
        building: b,
        location: { lon: b.lon, lat: b.lat },
        score,
        components,
      };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, Math.min(scored.length, 20));
  const chosen = farthestPoint(top, targetCount, 500);

  const runId = crypto.randomUUID();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      send("run", { run_id: runId, strategy, candidates: BUILDINGS.length, picked: chosen.length });
      send("progress", { stage: "candidates", detail: `${BUILDINGS.length} bâtiments évalués · top ${top.length} retenus pour diversification` });

      const results: Array<{
        id: string;
        location: { lon: number; lat: number };
        score: number;
        components: Record<string, number>;
        rationale_md: string | null;
        model_name: string;
        building: { id: string; name: string; type: string; surface_m2: number; occupants: number };
      }> = [];

      for (const c of chosen) {
        send("progress", { stage: "rationale", for: c.location, detail: c.building.name });
        const { text, model_used, last_error } = await llmRationale(
          c.building, c.components, c.score, strategy,
        );
        if (!text && last_error) {
          send("progress", { stage: "llm_warn", detail: last_error });
        }
        const modelName = model_used ?? "none";

        const { data: ins, error } = await supa
          .from("ai_placements")
          .insert({
            org_id: ctx.org_id,
            run_id: runId,
            proposed_location: `SRID=4326;POINT(${c.location.lon} ${c.location.lat})`,
            proposed_area_m2: c.building.surface_m2,
            score: c.score,
            score_components: { ...c.components, building: { id: c.building.id, name: c.building.name, type: c.building.type, surface_m2: c.building.surface_m2, occupants: c.building.occupants } },
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
          building: {
            id: c.building.id,
            name: c.building.name,
            type: c.building.type,
            surface_m2: c.building.surface_m2,
            occupants: c.building.occupants,
          },
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
