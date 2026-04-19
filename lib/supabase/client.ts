"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseUrl, requireSupabaseAnonKey } from "./env";

/**
 * Browser-side Supabase client (memoised per tab).
 *
 * We deliberately create a singleton so React Query / Realtime channels /
 * auth listeners all share the same connection — otherwise the same tab
 * opens duplicate WebSockets and blows the free-tier connection cap.
 *
 * Note on typing: we keep the client untyped for now. Hand-written Database
 * types create more friction than they prevent at this stage (Supabase's
 * `PostgrestBuilder` infers Insert/Update shapes from the generic and our
 * rough types fight it). Once `supabase gen types` runs, swap this back to
 * `createBrowserClient<Database>(...)`.
 */
let singleton: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (singleton) return singleton;
  singleton = createBrowserClient(requireSupabaseUrl(), requireSupabaseAnonKey());
  return singleton;
}

/** Alias that matches the common `createClient()` naming convention. */
export const createClient = createSupabaseBrowserClient;
