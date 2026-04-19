// @ts-nocheck — Deno edge function; uses `npm:` specifiers + Deno globals
/**
 * Shared Supabase client helpers for edge functions.
 *
 * `createServiceClient` uses the service-role key (bypasses RLS) — only for
 * trusted server operations like sensor simulation, threshold alerts, and
 * AI pipeline writes.
 *
 * `authClientFromRequest` creates a client authenticated as the caller,
 * used to verify JWT role claims via the normal RLS-respecting path.
 */

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export function getEnv(key: string): string {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

export function createServiceClient(): SupabaseClient {
  return createClient(
    getEnv("SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

export function authClientFromRequest(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    getEnv("SUPABASE_URL"),
    getEnv("SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    },
  );
}

/** Returns {user_id, org_id, role} or null if token invalid / no profile. */
export async function getCallerContext(req: Request): Promise<
  { user_id: string; org_id: string; role: string } | null
> {
  const client = authClientFromRequest(req);
  const { data: userData, error } = await client.auth.getUser();
  if (error || !userData?.user) return null;
  const user = userData.user;
  const app = (user.app_metadata ?? {}) as Record<string, string>;
  // Preferred: read from JWT claims if present.
  if (app.org_id && app.role) {
    return { user_id: user.id, org_id: app.org_id, role: app.role };
  }
  // Fallback: query profiles with service client (JWT exists, so we trust user.id)
  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("org_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return { user_id: user.id, org_id: profile.org_id, role: profile.role };
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...(init.headers ?? {}),
    },
  });
}

export function cors(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}
