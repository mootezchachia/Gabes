"use client";

import { useProfile } from "./useProfile";
import type { UserRole } from "@/lib/supabase/types";

/**
 * Lightweight role hooks. Always derive from `useProfile()` so the role stays
 * in sync with the React Query cache and we don't hit Supabase twice.
 */
export function useRole(): UserRole | null {
  const { data } = useProfile();
  return (data?.role as UserRole | null) ?? null;
}

export function useIsAdmin(): boolean {
  return useRole() === "admin";
}

export function useIsSupervisorOrAdmin(): boolean {
  const role = useRole();
  return role === "admin" || role === "supervisor";
}
