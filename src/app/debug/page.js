import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function DebugPage() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        async get(name) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    userRole = profile?.role;
  }

  return (
    <div style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>🔍 DEBUG PAGE</h1>
      <p>
        <strong>User exists:</strong> {user ? "YES" : "NO"}
      </p>
      {user && (
        <>
          <p>
            <strong>User ID:</strong> {user.id}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>DB Role:</strong> {userRole || "NOT FOUND"}
          </p>
          <p>
            <strong>Should go to:</strong>{" "}
            {userRole === "super_admin" ? "/admin" : "/dashboard"}
          </p>
        </>
      )}
    </div>
  );
}
