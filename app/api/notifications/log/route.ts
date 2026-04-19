import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recent ntfy alerts for the caller's org.
 *
 * `ntfy_alert_log` has no user-facing RLS policy (service role only), so we
 * read it with the service-role client and filter by joining `sensors.org_id`
 * against the caller's org on the server side. That way users see their own
 * alerts without us loosening DB-level permissions.
 */
export async function GET(_req: NextRequest) {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase non configuré" },
      { status: 500 },
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const app = (session.user.app_metadata ?? {}) as Record<string, unknown>;
  const role = app.role as string | undefined;
  const orgId = app.org_id as string | undefined;
  if (role !== "admin" && role !== "supervisor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "org_id missing from token" }, { status: 400 });
  }

  let service;
  try {
    service = createServiceRoleClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Service role indisponible" },
      { status: 500 },
    );
  }

  // Pull the last 50 alerts for sensors in this org.
  const { data, error } = await service
    .from("ntfy_alert_log")
    .select("id, sensor_id, threshold_key, topic, sent_at, sensors!inner(label, type, org_id)")
    .eq("sensors.org_id", orgId)
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: data ?? [] });
}
