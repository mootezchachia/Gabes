import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * NAFAS proxy (formerly `middleware.ts` — renamed per Next.js 16 convention).
 *
 * Responsibilities:
 *   1. Refresh the Supabase session cookie on every request (required for
 *      `@supabase/ssr` to work correctly).
 *   2. Gate protected routes:
 *        /app/*        — authenticated admin/supervisor (user → /dawa)
 *        /dawa         — any authenticated profile
 *        /api/ai/*     — admin-only for placement, admin+supervisor for forecast
 *   3. For authenticated users without a `profiles` row, force /welcome.
 *
 * Design notes:
 *   - We skip Supabase entirely when env vars are missing so a freshly-cloned
 *     repo with no `.env.local` still renders the landing page. Attempting
 *     to hit /app or /login without config redirects to /login with a banner.
 *   - Role is read from `auth.users.app_metadata.role` (set by the
 *     `sync_user_metadata` trigger in migration 0001). We deliberately avoid
 *     hitting the `profiles` table from the proxy — one round-trip per
 *     request is plenty.
 */

const PROTECTED_APP_PREFIX = "/app";
const PROTECTED_DAWA_PREFIX = "/dawa";
const PROTECTED_AI_PREFIX = "/api/ai";
const ADMIN_ONLY = [/^\/api\/ai\/placement(\/|$)/, /^\/api\/parametres(\/|$)/];
const SUPERVISOR_OK = [/^\/api\/ai\/forecast(\/|$)/];

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith(PROTECTED_APP_PREFIX) ||
    pathname === PROTECTED_DAWA_PREFIX ||
    pathname.startsWith(`${PROTECTED_DAWA_PREFIX}/`) ||
    pathname.startsWith(PROTECTED_AI_PREFIX)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Non-protected routes: short-circuit (landing, /monitor3d, static assets).
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No Supabase configured → boot them to /login which will show a
  // configuration banner explaining how to add env vars.
  if (!supabaseUrl || !supabaseAnonKey) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}&reason=unconfigured`;
    return NextResponse.redirect(url);
  }

  // Prepare a response we can attach refreshed cookies to.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() triggers the refresh flow. Don't replace with
  // getSession() — that only reads the cookie and won't revalidate.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Role lives in the JWT's app_metadata (set by sync_user_metadata trigger).
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const role = (appMeta.role as string | undefined) ?? undefined;
  const orgId = (appMeta.org_id as string | undefined) ?? undefined;

  // Authenticated but no profile yet → /welcome to set it up.
  // We detect this by absence of org_id in the JWT (the trigger always sets
  // both role and org_id together when a profile row is created).
  if (!role || !orgId) {
    if (pathname !== "/welcome") {
      const url = request.nextUrl.clone();
      url.pathname = "/welcome";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Role gating.
  if (pathname.startsWith(PROTECTED_APP_PREFIX) && role === "user") {
    const url = request.nextUrl.clone();
    url.pathname = "/dawa";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith(PROTECTED_AI_PREFIX)) {
    const isAdminOnly = ADMIN_ONLY.some((re) => re.test(pathname));
    const isSupervisorOk = SUPERVISOR_OK.some((re) => re.test(pathname));

    if (isAdminOnly && role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (isSupervisorOk && role !== "admin" && role !== "supervisor") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  return response;
}

export const config = {
  // Run on everything except Next internals + public static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|cesium|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|css|js|map)$).*)",
  ],
};
