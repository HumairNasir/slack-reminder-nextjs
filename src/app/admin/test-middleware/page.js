import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function AdminMiddlewareTestPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  // 1. Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // This will be caught by middleware and redirected to /login
    return (
      <div style={{ padding: 24 }}>
        <h1>❌ Not Authenticated</h1>
        <p>Middleware should redirect you to /login</p>
        <p>User: None</p>
      </div>
    );
  }

  // 2. Try to get role (same as middleware does)
  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("🔍 ADMIN MIDDLEWARE TEST at /admin/test-middleware");
  console.log("User:", user.email);
  console.log("DB Role:", profile?.role);
  console.log("Error:", error?.message);

  // 3. Check if user is admin
  if (profile?.role !== "super_admin") {
    // This will be caught by middleware and redirected to /dashboard
    return (
      <div style={{ padding: 24 }}>
        <h1>❌ Not an Admin</h1>
        <p>User: {user.email}</p>
        <p>Role: {profile?.role || "Not found"}</p>
        <p>Error: {error?.message || "None"}</p>
        <p>Middleware should redirect you to /dashboard</p>
      </div>
    );
  }

  // 4. If we reach here, user is admin and middleware allowed access
  return (
    <div style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>✅ ADMIN ACCESS GRANTED</h1>
      <div style={{ background: "#d4edda", padding: 15, borderRadius: 5 }}>
        <p>
          <strong>👤 User:</strong> {user.email}
        </p>
        <p>
          <strong>📊 Role:</strong> {profile.role}
        </p>
        <p>
          <strong>✅ Status:</strong> Allowed to access /admin routes
        </p>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>🎯 Test Results:</h3>
        <p>1. ✅ User authenticated: YES</p>
        <p>2. ✅ DB role fetched: YES ({profile.role})</p>
        <p>3. ✅ Is super_admin: YES</p>
        <p>4. ✅ Middleware allowed access: YES</p>
      </div>

      <div
        style={{
          marginTop: 20,
          background: "#f8f9fa",
          padding: 15,
          borderRadius: 5,
        }}
      >
        <h3>📝 Check Console:</h3>
        <p>Open browser console (F12) to see detailed logs</p>
        <p>You should see: "ADMIN MIDDLEWARE TEST at /admin/test-middleware"</p>
      </div>
    </div>
  );
}
