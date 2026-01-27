"use client";

import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkUserLimits } from "@/lib/subscription/checkLimits";
import { createClient } from "@/lib/supabase/client";
import "./dashboard.css";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  const [dashboardStats, setDashboardStats] = useState({
    subscriptionPlan: "Loading...",
    slackConnected: false,
    activeReminders: 0,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch dashboard stats
  useEffect(() => {
    async function fetchDashboardStats() {
      if (!user) return;

      try {
        // Get subscription data
        const subscriptionData = await checkUserLimits(user.id);
        // console.log("Subscription data:", subscriptionData);

        // Get Slack connection status
        const supabase = createClient();
        const { count: connectionsCount } = await supabase
          .from("slack_connections")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_active", true);

        // Get active reminders count
        const { count: remindersCount } = await supabase
          .from("reminders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active");

        setDashboardStats({
          subscriptionPlan: subscriptionData.plan?.name || "Free Plan",
          slackConnected: (connectionsCount || 0) > 0,
          activeReminders: remindersCount || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setDashboardStats({
          subscriptionPlan: "Error loading",
          slackConnected: false,
          activeReminders: 0,
        });
      }
    }

    fetchDashboardStats();
  }, [user]);

  if (authLoading || roleLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard Overview</h1>

      <div className="welcome-banner">
        <h2>Welcome back, {user.email?.split("@")[0] || "User"}!</h2>
        <p>
          Your role: <span className="role-badge">{role}</span>
        </p>
      </div>

      <div className="stats-grid">
        {/* Subscription Card */}
        <div className="stat-card">
          <h3 className="stat-title">Subscription</h3>
          <p className="stat-number">{dashboardStats.subscriptionPlan}</p>
          <button
            className="action-btn primary-btn"
            onClick={() => router.push("/dashboard/billing")}
          >
            Upgrade
          </button>
        </div>

        {/* Slack Connection Card */}
        <div className="stat-card">
          <h3 className="stat-title">Slack Connection</h3>
          <p
            className={`stat-number ${dashboardStats.slackConnected ? "success" : "error"}`}
          >
            {dashboardStats.slackConnected ? "Connected" : "Not Connected"}
          </p>
          <button
            className="action-btn success-btn"
            onClick={() => router.push("/dashboard/slack")}
          >
            {dashboardStats.slackConnected ? "Manage Slack" : "Connect Slack"}
          </button>
        </div>

        {/* Active Reminders Card */}
        <div className="stat-card">
          <h3 className="stat-title">Active Reminders</h3>
          <p className="stat-number">{dashboardStats.activeReminders}</p>
          <button
            className="action-btn dark-btn"
            onClick={() => router.push("/dashboard/reminders/create")}
          >
            Create Reminder
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          {/* <button className="action-item">
            <div className="action-icon">📅</div>
            <p className="action-text">Schedule Reminder</p>
          </button>
          <button className="action-item">
            <div className="action-icon">🔄</div>
            <p className="action-text">View Logs</p>
          </button> */}
          <button
            className="action-item"
            onClick={() => router.push("/dashboard/settings")}
          >
            <div className="action-icon">⚙️</div>
            <p className="action-text">Settings</p>
          </button>
          <button
            className="action-item"
            onClick={() => router.push("/dashboard/analytics")}
          >
            <div className="action-icon">📊</div>
            <p className="action-text">Analytics</p>
          </button>
        </div>
      </div>
    </div>
  );
}
