"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  CreditCard,
  Bell,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
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

        if (!userData || userData.role !== "super_admin") {
          window.location.href = "/dashboard";
          return;
        }

        setIsAdmin(true);

        // Fetch Stats
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
            `*,
               reminders (
                    title,
                    users ( email ) 
                    )
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
        <p>Loading System Overview...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div>
      <h1 className="page-title">System Overview</h1>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon user-icon">
            <Users size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{stats.userCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sub-icon">
            <CreditCard size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Subscription</span>
            <span className="stat-value">{stats.activeSubs}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bell-icon">
            <Bell size={28} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Reminders Sent</span>
            <span className="stat-value">{stats.reminderCount}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity / Errors Section */}
      <div className="section-container">
        <h2 className="section-title">
          {stats.recentErrors.length > 0 ? (
            <>
              <AlertTriangle size={20} className="text-red-500" /> Recent
              Failures
            </>
          ) : (
            <>
              <CheckCircle size={20} className="text-green-500" /> System Status
            </>
          )}
        </h2>

        <div className="card">
          <div className="table-wrapper">
            <table className="styled-table">
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
                      <td style={{ whiteSpace: "nowrap", color: "#6b7280" }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {log.reminders?.title || "Unknown"}
                      </td>
                      <td>{log.reminders?.users?.email || "Unknown"}</td>
                      <td className="error-text">
                        {log.error_message || "Unknown error"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            background: "#dcfce7",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <CheckCircle size={24} color="#166534" />
                        </div>
                        <span>No recent errors found. System healthy!</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
