"use client";

import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

/**
 * Returns the current user's profile row + auth user.
 *
 * Cached for 30s because the rest of the shell (UserMenu, RoleGate,
 * CommandPalette, etc.) all read from this. Invalidate manually via
 * `queryClient.invalidateQueries({ queryKey: ["profile"] })` after profile
 * edits or role changes.
 */
export type ProfileQueryData = {
  userId: string;
  email: string | null;
  profile: Profile | null;
  role: Profile["role"] | null;
  orgId: string | null;
};

export function useProfile() {
  return useQuery<ProfileQueryData | null>({
    queryKey: ["profile", "me"],
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      const meta = (auth.user.app_metadata ?? {}) as Record<string, unknown>;
      return {
        userId: auth.user.id,
        email: auth.user.email ?? null,
        profile: (profile as Profile | null) ?? null,
        role: (profile?.role as Profile["role"] | null) ?? (meta.role as Profile["role"] | null) ?? null,
        orgId: profile?.org_id ?? (meta.org_id as string | null) ?? null,
      };
    },
  });
}
