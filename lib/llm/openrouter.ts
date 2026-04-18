/**
 * OpenRouter client with 3-model fallback chain for NAFAS.
 *
 * Primary:    qwen/qwen3-235b-a22b:free    (strong FR reasoning, free tier)
 * Fallback 1: meta-llama/llama-3.3-70b-instruct:free
 * Fallback 2: google/gemma-2-9b-it:free    (smallest, fastest)
 *
 * On 429 / 5xx errors, falls through to the next model. On any other error
 * (auth, malformed prompt, etc.) it re-throws. If ALL models fail, returns
 * `{ text: null, error }`.
 *
 * Usage (non-streaming):
 *   const { text, model_used } = await withFallback({
 *     systemPrompt: "...", userPrompt: "...", maxTokens: 160,
 *   });
 *
 * Usage (streaming):
 *   const { stream, model_used } = await streamWithFallback({...});
 *   for await (const chunk of stream) { ... }
 */

import OpenAI from "openai";

export const MODELS = [
  "qwen/qwen3-235b-a22b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free",
] as const;

export type ModelId = (typeof MODELS)[number];

const BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_HEADERS = {
  "HTTP-Referer": "https://nafas.tn",
  "X-Title": "NAFAS",
};

export function getApiKey(): string {
  const key =
    (typeof process !== "undefined" && process.env?.OPENROUTER_API_KEY) ||
    // deno:
    // @ts-ignore — Deno may not be defined in node context
    (typeof Deno !== "undefined" && Deno.env?.get?.("OPENROUTER_API_KEY"));
  if (!key) throw new Error("OPENROUTER_API_KEY not set");
  return key;
}

export function createOpenrouterClient(): OpenAI {
  return new OpenAI({
    apiKey: getApiKey(),
    baseURL: BASE_URL,
    defaultHeaders: DEFAULT_HEADERS,
  });
}

export interface WithFallbackOpts {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  /** override the fallback chain (e.g., to skip a model known to be flaky) */
  models?: readonly string[];
}

export interface LlmResult {
  text: string | null;
  model_used: string | null;
  error?: string;
}

function shouldFallback(err: unknown): boolean {
  const e = err as { status?: number; code?: string; message?: string };
  if (!e) return false;
  if (e.status === 429) return true;
  if (typeof e.status === "number" && e.status >= 500) return true;
  // openai-sdk may map network errors to code: 'ECONNRESET' etc.
  if (e.code && ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"].includes(e.code))
    return true;
  return false;
}

/**
 * withFallback — non-streaming completion. Iterates the model chain until
 * one succeeds, returning {text, model_used}.
 */
export async function withFallback(opts: WithFallbackOpts): Promise<LlmResult> {
  const client = createOpenrouterClient();
  const chain = opts.models ?? MODELS;
  let lastErr: unknown = null;
  for (const model of chain) {
    try {
      const resp = await client.chat.completions.create({
        model,
        messages: [
          ...(opts.systemPrompt
            ? [{ role: "system" as const, content: opts.systemPrompt }]
            : []),
          { role: "user", content: opts.userPrompt },
        ],
        max_tokens: opts.maxTokens ?? 220,
        temperature: opts.temperature ?? 0.3,
      });
      const text = resp.choices?.[0]?.message?.content ?? null;
      return { text, model_used: model };
    } catch (err) {
      lastErr = err;
      if (shouldFallback(err)) continue;
      // non-retryable — re-throw to surface config/auth errors
      throw err;
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  return { text: null, model_used: null, error: msg };
}

/**
 * streamWithFallback — streaming completion. Returns the first model that
 * successfully opens a stream; delta content is yielded via an async
 * iterator. The caller concatenates deltas to get the full text.
 */
export async function streamWithFallback(
  opts: WithFallbackOpts,
): Promise<{
  stream: AsyncIterable<string>;
  model_used: string;
} | { stream: null; model_used: null; error: string }> {
  const client = createOpenrouterClient();
  const chain = opts.models ?? MODELS;
  let lastErr: unknown = null;
  for (const model of chain) {
    try {
      const resp = await client.chat.completions.create({
        model,
        messages: [
          ...(opts.systemPrompt
            ? [{ role: "system" as const, content: opts.systemPrompt }]
            : []),
          { role: "user", content: opts.userPrompt },
        ],
        max_tokens: opts.maxTokens ?? 220,
        temperature: opts.temperature ?? 0.3,
        stream: true,
      });
      const iter = (async function* () {
        for await (const chunk of resp) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        }
      })();
      return { stream: iter, model_used: model };
    } catch (err) {
      lastErr = err;
      if (shouldFallback(err)) continue;
      throw err;
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  return { stream: null, model_used: null, error: msg };
}

/** Shared prompt templates (kept here so edge functions stay lean). */
export const PROMPTS = {
  placement: (scoreComponentsJson: string, score: number) =>
    `Tu es ORACLE, assistant scientifique de la plateforme NAFAS (Golfe de Gabès).
Un score de placement a été calculé par un algorithme multi-critères :
${scoreComponentsJson}

Score final: ${score.toFixed(2)} / 1.00

Écris une justification en français de 60 mots MAXIMUM pour cette zone.
Cite au moins DEUX chiffres précis du JSON dans ta réponse.
Si le score est inférieur à 0.6, ajoute une phrase de mise en garde.
N'invente aucune donnée absente du JSON.`,

  forecast: (projectionsJson: string, panelMetadata: string) =>
    `Tu es ORACLE. Voici la projection décennale pour un panneau à algues dans le Golfe de Gabès :
${projectionsJson}
${panelMetadata}

Rédige une note d'orientation en français de 200 mots MAXIMUM destinée à la Municipalité de Gabès :
- Contexte (1 phrase)
- Principal impact attendu (avec chiffre clé)
- 3 impacts quantifiés secondaires (liste à puces)
- 1 limite méthodologique

Cite uniquement les chiffres présents dans les projections.
N'invente aucune donnée.`,
};
