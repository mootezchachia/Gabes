import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSupabaseUrl } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Thin proxy from the Next app to the Supabase edge function
 * `ai_placement`. Responsibilities:
 *   1. Authenticate the caller via the SSR Supabase client.
 *   2. Authorize: admin only.
 *   3. Forward the request body + the user's JWT to the edge function.
 *   4. Relay the SSE response chunk-by-chunk so the dialog on /app/carte
 *      can render progress events as they arrive.
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

  const appMeta = (session.user.app_metadata ?? {}) as Record<string, unknown>;
  if (appMeta.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.text();
  const url = `${requireSupabaseUrl()}/functions/v1/ai_placement`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "text/event-stream",
        authorization: `Bearer ${session.access_token}`,
      },
      body,
      // Use duplex half for streaming bodies on Node fetch.
      // @ts-expect-error duplex is node fetch-only
      duplex: "half",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Proxy ORACLE indisponible : ${e.message}`
            : "Proxy ORACLE indisponible",
      },
      { status: 502 },
    );
  }

  // Pass the upstream stream through untouched.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
