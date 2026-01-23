import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function TestPage() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        async get(name) {
          const cookieStore = await cookies();
          return cookieStore.get(name)?.value;
        },
        async set(name, value, options) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle error if needed
          }
        },
        async remove(name, options) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // Handle error if needed
          }
        },
      },
    },
  );

  // 1️⃣ Auth user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2️⃣ Role from DB
  let dbRole = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    dbRole = data?.role;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🔍 AUTH DEBUG PAGE</h1>

      {!user && <p>❌ No user logged in</p>}

      {user && (
        <>
          <p>
            <b>User ID:</b> {user.id}
          </p>
          <p>
            <b>Email:</b> {user.email}
          </p>

          <hr />

          <p>
            <b>Metadata Role:</b> {user.user_metadata?.role || "❌ NONE"}
          </p>
          <p>
            <b>DB Role:</b> {dbRole || "❌ NONE"}
          </p>

          <pre style={{ background: "#111", color: "#0f0", padding: 12 }}>
            {JSON.stringify(user.user_metadata, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
