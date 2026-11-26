import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "./types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Avoid using getSession() which is not secure in middleware.
  // getUser() validates the token against the Supabase Auth server.
  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch {
    user = null;
  }

  // Also check for demo session cookie fallback
  const demoSession = request.cookies.get("fb_demo_session")?.value === "true";
  const isAuthenticated = Boolean(user || demoSession);

  const pathname = request.nextUrl.pathname;

  // Protected route paths
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/posts") ||
    pathname.startsWith("/pages") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/comments") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/saved") ||
    pathname.startsWith("/settings");

  // Auth routes (login, register, forgot-password)
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  // 1. Unauthenticated users accessing protected routes -> redirect to /login
  if (isProtectedRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Authenticated users accessing login/register -> redirect to /dashboard
  if (isAuthRoute && isAuthenticated && pathname !== "/reset-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
