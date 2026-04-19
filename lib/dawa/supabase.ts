/**
 * Thin adapter so /dawa can work even before the backend agent has finished
 * writing `lib/supabase/client.ts`. When that file lands, importing from
 * `@/lib/supabase/client` will "just work" — this module is a cached wrapper
 * around that call that returns `null` if the module can't be resolved yet,
 * letting the UI render in a stable "offline" mode during development.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export async function getDawaClient(): Promise<SupabaseClient | null> {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — resolved at runtime; backend agent owns this module.
    const mod = await import("@/lib/supabase/client");
    const maker: (() => SupabaseClient) | undefined =
      (mod as { createClient?: () => SupabaseClient }).createClient;
    cached = maker ? maker() : null;
  } catch {
    cached = null;
  }
  return cached;
}
