"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Client-side sign-out helper. Called from the UserMenu.
 *
 * We intentionally don't use a server action: sign-out is a single cookie
 * revoke, and round-tripping through an action just adds latency.
 */
export async function signOut(redirectTo = "/") {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}
