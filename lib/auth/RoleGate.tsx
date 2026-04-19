"use client";

import type { ReactNode } from "react";
import { useRole } from "./useRole";
import type { UserRole } from "@/lib/supabase/types";

export interface RoleGateProps {
  allow: ReadonlyArray<UserRole>;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Client-side role gate.
 *
 * This is cosmetic defence-in-depth — *never* the sole line of protection
 * for privileged features. Real security lives in:
 *   1. The Supabase `proxy.ts` (route-level redirect).
 *   2. RLS policies on every table.
 *   3. Service-role checks in edge functions.
 *
 * Use this to hide admin affordances (buttons, panels, menu entries) from
 * users who would get a 403 if they clicked them anyway.
 */
export function RoleGate({ allow, fallback = null, children }: RoleGateProps) {
  const role = useRole();
  if (!role) return <>{fallback}</>;
  if (!allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
