/**
 * Runtime assertion for Supabase env vars.
 *
 * The NAFAS backend is still being provisioned. Any code path that touches
 * Supabase goes through here first so we fail loudly with a useful message
 * instead of "Cannot read properties of undefined (reading 'replace')" deep
 * in `@supabase/supabase-js`.
 */
export function requireSupabaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) {
    throw new Error(
      "Supabase n'est pas configuré. Ajoute NEXT_PUBLIC_SUPABASE_URL à .env.local (voir docs/plans/2026-04-18-nafas-v2-design.md §2.3).",
    );
  }
  return v;
}

export function requireSupabaseAnonKey(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) {
    throw new Error(
      "Supabase n'est pas configuré. Ajoute NEXT_PUBLIC_SUPABASE_ANON_KEY à .env.local.",
    );
  }
  return v;
}

export function requireSupabaseServiceRoleKey(): string {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!v) {
    throw new Error(
      "Supabase service role absent. Ajoute SUPABASE_SERVICE_ROLE_KEY à .env.local (jamais exposée côté client).",
    );
  }
  return v;
}

/** Best-effort check used by public UI to show a "configure Supabase" banner. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
