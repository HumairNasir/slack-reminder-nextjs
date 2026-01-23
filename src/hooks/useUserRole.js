// "use client";

// import { useEffect, useState } from "react";
// import { createClient } from "@/lib/supabase/client";

// export function useUserRole() {
//   const [role, setRole] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const supabase = createClient();

//   useEffect(() => {
//     async function getUserRole() {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (user) {
//         const { data: profile } = await supabase
//           .from("users")
//           .select("role")
//           .eq("id", user.id)
//           .single();

//         setRole(profile?.role || "user");
//       }

//       setLoading(false);
//     }

//     getUserRole();
//   }, []);

//   return { role, loading };
// }
"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function useUserRole() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        console.log("useUserRole: Fetched profile:", profile);
        console.log("useUserRole: Error:", error);

        setRole(profile?.role || null);
      } catch (error) {
        console.error("useUserRole error:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, [supabase]);

  return { role, loading };
}
