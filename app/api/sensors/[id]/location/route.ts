import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sensors/:id/location
 *
 * Returns `{ lon, lat }` for a sensor — used by the DefenseTicker to fly
 * the Cesium camera to an alert that came in via polling (rather than from
 * the simulate endpoint, which returns coordinates inline). Admin or
 * supervisor; the service role is used to dodge the sensor RLS join when
 * the caller already proved they're authorised at the route layer.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
  if (!orgId) return NextResponse.json({ error: "org_id missing" }, { status: 400 });

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("sensors")
    .select("id, org_id, location_geojson:location")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "sensor not found" }, { status: 404 });

  let lon: number | null = null;
  let lat: number | null = null;
  const raw = (data as unknown as { location_geojson?: unknown }).location_geojson;
  if (raw && typeof raw === "object") {
    const o = raw as { coordinates?: [number, number]; type?: string };
    if (o.type === "Point" && Array.isArray(o.coordinates)) {
      lon = o.coordinates[0];
      lat = o.coordinates[1];
    }
  } else if (typeof raw === "string") {
    try {
      const hex = (raw as string).replace(/^SRID=\d+;/, "");
      if (hex.length >= 42) {
        const buf = new Uint8Array(hex.match(/.{1,2}/g)!.map((h: string) => parseInt(h, 16)));
        const dv = new DataView(buf.buffer);
        let offset = 5;
        const flags = dv.getUint32(1, true);
        if ((flags & 0x20000000) !== 0) offset += 4;
        lon = dv.getFloat64(offset, true);
        lat = dv.getFloat64(offset + 8, true);
      }
    } catch {
      /* swallow */
    }
  }

  return NextResponse.json({ lon, lat });
}
