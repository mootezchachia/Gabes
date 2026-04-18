import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSupabaseUrl, requireSupabaseAnonKey } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy to the `ai_forecast` Supabase edge function. Admin + supervisor
 * allowed. Forecast is one-shot (not streamed), so we return JSON.
 */
export async function POST(req: NextRequest) {
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

  const role = ((session.user.app_metadata ?? {}) as Record<string, unknown>).role;
  if (role !== "admin" && role !== "supervisor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.text();
  const url = `${requireSupabaseUrl()}/functions/v1/ai_forecast`;
  const anonKey = requireSupabaseAnonKey();

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // See /api/ai/placement for why both headers are required.
        apikey: anonKey,
        authorization: `Bearer ${session.access_token}`,
      },
      body,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Proxy indisponible" },
      { status: 502 },
    );
  }

  const data = await upstream.text();
  return new Response(data, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
