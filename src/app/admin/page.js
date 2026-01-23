// "use client";

// import { useEffect, useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { Users, CreditCard, Bell, AlertTriangle, Loader2 } from "lucide-react";
// import "./admin.css";

// export default function AdminDashboard() {
//   const [loading, setLoading] = useState(true);
//   const [stats, setStats] = useState({
//     userCount: 0,
//     activeSubs: 0,
//     reminderCount: 0,
//     recentErrors: [],
//   });

//   const supabase = createClient();

//   useEffect(() => {
//     async function fetchAdminStats() {
//       try {
//         setLoading(true);

//         // 1. Total Users
//         const { count: userCount } = await supabase
//           .from("users")
//           .select("*", { count: "exact", head: true });

//         // 2. Active Subscriptions
//         const { count: activeSubs } = await supabase
//           .from("subscriptions")
//           .select("*", { count: "exact", head: true })
//           .eq("status", "active");

//         // 3. Total Reminders Sent
//         const { count: reminderCount } = await supabase
//           .from("reminder_logs")
//           .select("*", { count: "exact", head: true })
//           .eq("status", "success");

//         // 4. Recent Failed Reminders
//         const { data: recentErrors } = await supabase
//           .from("reminder_logs")
//           .select(
//             `
//             *,
//             reminders (title),
//             users (email)
//           `,
//           )
//           .eq("status", "failed")
//           .order("created_at", { ascending: false })
//           .limit(5);

//         setStats({
//           userCount: userCount || 0,
//           activeSubs: activeSubs || 0,
//           reminderCount: reminderCount || 0,
//           recentErrors: recentErrors || [],
//         });
//       } catch (error) {
//         console.error("Error fetching admin stats:", error);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchAdminStats();
//   }, []);

//   if (loading) {
//     return (
//       <div className="loading-state">
//         <Loader2 className="animate-spin" size={40} />
//         <p>Loading Admin Overview...</p>
//       </div>
//     );
//   }

//   return (
//     <div>
//       <h1 className="page-title">System Overview</h1>

//       {/* Stats Grid */}
//       <div className="stats-grid">
//         <div className="stat-card">
//           <div className="stat-icon user-icon">
//             <Users size={24} />
//           </div>
//           <div className="stat-info">
//             <span className="stat-label">Total Users</span>
//             <span className="stat-value">{stats.userCount}</span>
//           </div>
//         </div>

//         <div className="stat-card">
//           <div className="stat-icon sub-icon">
//             <CreditCard size={24} />
//           </div>
//           <div className="stat-info">
//             <span className="stat-label">Active Subs</span>
//             <span className="stat-value">{stats.activeSubs}</span>
//           </div>
//         </div>

//         <div className="stat-card">
//           <div className="stat-icon bell-icon">
//             <Bell size={24} />
//           </div>
//           <div className="stat-info">
//             <span className="stat-label">Reminders Sent</span>
//             <span className="stat-value">{stats.reminderCount}</span>
//           </div>
//         </div>
//       </div>

//       {/* Recent Errors Section */}
//       <div className="section-container">
//         <h2 className="section-title">
//           <AlertTriangle size={20} />
//           Recent Delivery Failures
//         </h2>

//         <div className="table-wrapper">
//           <table className="admin-table">
//             <thead>
//               <tr>
//                 <th>Time</th>
//                 <th>Reminder</th>
//                 <th>User</th>
//                 <th>Error Message</th>
//               </tr>
//             </thead>
//             <tbody>
//               {stats.recentErrors.length > 0 ? (
//                 stats.recentErrors.map((log) => (
//                   <tr key={log.id}>
//                     <td>{new Date(log.created_at).toLocaleString()}</td>
//                     <td>{log.reminders?.title || "Unknown"}</td>
//                     <td>{log.users?.email || "Unknown"}</td>
//                     <td className="error-text">
//                       {log.error_message || "Unknown error"}
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="4" className="empty-state">
//                     No recent errors found. System healthy! 🟢
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, CreditCard, Bell, AlertTriangle, Loader2 } from "lucide-react";
import "./admin.css";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    userCount: 0,
    activeSubs: 0,
    reminderCount: 0,
    recentErrors: [],
  });

  const supabase = createClient();

  useEffect(() => {
    async function checkAccessAndFetchStats() {
      try {
        setLoading(true);

        // 1. Check if user is admin FIRST
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        console.log("Admin page - User role:", userData?.role);

        if (!userData || userData.role !== "super_admin") {
          window.location.href = "/dashboard";
          return;
        }

        setIsAdmin(true);

        // 2. Fetch stats only if admin
        const { count: userCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        const { count: activeSubs } = await supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");

        const { count: reminderCount } = await supabase
          .from("reminder_logs")
          .select("*", { count: "exact", head: true })
          .eq("status", "success");

        const { data: recentErrors } = await supabase
          .from("reminder_logs")
          .select(
            `
            *,
            reminders (title),
            users (email)
          `,
          )
          .eq("status", "failed")
          .order("created_at", { ascending: false })
          .limit(5);

        setStats({
          userCount: userCount || 0,
          activeSubs: activeSubs || 0,
          reminderCount: reminderCount || 0,
          recentErrors: recentErrors || [],
        });
      } catch (error) {
        console.error("Error:", error);
        window.location.href = "/dashboard";
      } finally {
        setLoading(false);
      }
    }

    checkAccessAndFetchStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <Loader2 className="animate-spin" size={40} />
        <p>Loading Admin Overview...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect via useEffect
  }

  return (
    <div>
      <h1 className="page-title">System Overview</h1>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon user-icon">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{stats.userCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sub-icon">
            <CreditCard size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Subs</span>
            <span className="stat-value">{stats.activeSubs}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bell-icon">
            <Bell size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Reminders Sent</span>
            <span className="stat-value">{stats.reminderCount}</span>
          </div>
        </div>
      </div>

      {/* Recent Errors Section */}
      <div className="section-container">
        <h2 className="section-title">
          <AlertTriangle size={20} />
          Recent Delivery Failures
        </h2>

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Reminder</th>
                <th>User</th>
                <th>Error Message</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentErrors.length > 0 ? (
                stats.recentErrors.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.reminders?.title || "Unknown"}</td>
                    <td>{log.users?.email || "Unknown"}</td>
                    <td className="error-text">
                      {log.error_message || "Unknown error"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-state">
                    No recent errors found. System healthy! 🟢
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
