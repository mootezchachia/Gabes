import "server-only";

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseUrl, requireSupabaseServiceRoleKey } from "./env";

/**
 * Service-role admin client. BYPASSES RLS.
 *
 * Never, ever import this file from client code. It only works in server
 * contexts (route handlers, server actions, edge/function runtimes). The
 * `server-only` import above trips the build if this is leaked.
 *
 * Use this sparingly: only for invitations, bootstrap seeding, and background
 * jobs that genuinely need cross-tenant reads. Normal app operations go
 * through `createSupabaseServerClient()` which respects RLS.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  return createSupabaseJsClient(
    requireSupabaseUrl(),
    requireSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
