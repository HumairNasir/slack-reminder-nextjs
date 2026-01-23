import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(request) {
  // Add at the beginning of middleware function
  console.log("=== MIDDLEWARE TRIGGERED ===");
  console.log("Path:", request.nextUrl.pathname);
  console.log("Method:", request.method);
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 1️⃣ Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 2️⃣ Fetch role from public.users table (ONLY source of truth)
  let userRole = null;

  if (user) {
    const { data: profile, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!error) {
      userRole = profile?.role;
    }

    // Debug logs (safe to keep for now)
    console.log("---- MIDDLEWARE DEBUG ----");
    console.log("Email:", user.email);
    console.log("DB Role:", userRole);
    console.log("--------------------------");
  }

  // --- RULE 1: Protect /dashboard ---
  if (path.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // --- RULE 2: Protect /admin ---
  // In middleware.js, update the admin protection section:
  if (path.startsWith("/admin")) {
    console.log("🔒 Middleware: Checking admin access for path:", path);

    if (!user) {
      console.log("❌ No user, redirecting to login");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    console.log("👤 User found:", user.email);
    console.log("📊 DB Role fetched:", userRole);

    if (userRole !== "super_admin") {
      console.log("🚫 Not super_admin, redirecting to dashboard");
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    console.log("✅ Admin access granted");
  }

  // --- RULE 3: Redirect logged-in users away from login/register ---
  if (path.startsWith("/login") || path.startsWith("/register")) {
    if (user) {
      if (userRole === "super_admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
