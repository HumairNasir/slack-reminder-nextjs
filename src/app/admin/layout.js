// "use client";

// import Link from "next/link";
// import { Shield, Users, Activity, ArrowLeft, FileText } from "lucide-react";
// import { createClient } from "@/lib/supabase/client"; // Checked your path
// import { redirect } from "next/navigation";
// import "./admin.css";

// export default async function AdminLayout({ children }) {
//   const supabase = await createClient();

//   // 1. Get Current User
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) {
//     redirect("/login");
//   }

//   // 2. Check Role directly from 'users' table
//   const { data: userData } = await supabase
//     .from("users")
//     .select("role")
//     .eq("id", user.id) // using 'id' instead of 'user_id' based on your schema
//     .single();

//   // 3. Security Gate
//   if (!userData || userData.role !== "super_admin") {
//     redirect("/dashboard");
//   }

//   // 4. Admin UI
//   return (
//     <div className="admin-container">
//       <aside className="admin-sidebar">
//         <div className="sidebar-header">
//           <div className="logo-area">
//             <Shield size={24} />
//             <span>Admin Panel</span>
//           </div>
//         </div>

//         <nav className="sidebar-nav">
//           <Link href="/admin" className="nav-link">
//             <Activity size={20} />
//             Overview
//           </Link>
//           <Link href="/admin/users" className="nav-link">
//             <Users size={20} />
//             User Management
//           </Link>
//           <Link href="/admin/logs" className="nav-link">
//             <FileText size={20} />
//             System Logs
//           </Link>
//         </nav>

//         <div className="sidebar-footer">
//           <Link href="/dashboard" className="nav-link back-link">
//             <ArrowLeft size={20} />
//             Back to App
//           </Link>
//         </div>
//       </aside>

//       <main className="admin-main">
//         <div className="content-wrapper">{children}</div>
//       </main>
//     </div>
//   );
// }
"use client";

import Link from "next/link";
import { Shield, Users, Activity, ArrowLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "./admin.css";

export default function AdminLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        // 1. Get Current User
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.log("No user found, redirecting to login");
          router.push("/login");
          return;
        }

        console.log("User found:", user.email);

        // 2. Check Role from users table
        const { data: userData, error: roleError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        console.log("User data from DB:", userData);
        console.log("Role error:", roleError);

        if (roleError || !userData || userData.role !== "super_admin") {
          console.log("Not admin, redirecting to dashboard");
          router.push("/dashboard");
          return;
        }

        // 3. User is admin
        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        console.error("Admin check error:", error);
        router.push("/dashboard");
      }
    }

    checkAdminAccess();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loader"></div>
        <p>Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="logo-area">
            <Shield size={24} />
            <span>Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link href="/admin" className="nav-link">
            <Activity size={20} />
            Overview
          </Link>
          <Link href="/admin/users" className="nav-link">
            <Users size={20} />
            User Management
          </Link>
          <Link href="/admin/logs" className="nav-link">
            <FileText size={20} />
            System Logs
          </Link>
        </nav>

        <div className="sidebar-footer">
          <Link href="/dashboard" className="nav-link back-link">
            <ArrowLeft size={20} />
            Back to App
          </Link>
        </div>
      </aside>

      <main className="admin-main">
        <div className="content-wrapper">{children}</div>
      </main>
    </div>
  );
}
