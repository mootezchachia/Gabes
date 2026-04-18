import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseUrl, requireSupabaseAnonKey } from "./env";

/**
 * Server-side Supabase client for RSC + route handlers + server actions.
 *
 * Per @supabase/ssr docs: a NEW client must be instantiated per request;
 * never memoise across requests. Cookies are always re-read from the
 * per-request `next/headers` store.
 *
 * When used inside a Server Component, calls to `setAll` are a no-op
 * (RSCs cannot set cookies). The proxy (middleware) handles the refresh
 * write-back in that case.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(requireSupabaseUrl(), requireSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // RSC: this throws. Route handlers + server actions: it works.
        // We swallow the throw so the same function is callable from both.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Read-only cookie store (RSC). Proxy handles refresh. */
        }
      },
    },
  });
}
