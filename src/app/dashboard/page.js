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
    limits: null,
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
          limits: subscriptionData.limits,
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

      {/* ✅✅✅ FIXED: ADDED THE WARNING COMPONENT HERE ✅✅✅ */}
      {dashboardStats.limits && (
        <UsageWarnings limits={dashboardStats.limits} router={router} />
      )}

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
          {/* Optional: Add text showing exactly how many used */}
          <div
            className="limit-info"
            style={{ marginBottom: "10px", color: "#666" }}
          >
            {dashboardStats.limits && (
              <small>
                {dashboardStats.limits.currentReminders} /{" "}
                {dashboardStats.limits.maxReminders} used
              </small>
            )}
          </div>
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

// --- HELPER COMPONENT ---
function UsageWarnings({ limits, router }) {
  if (!limits) return null;

  // 1. Force convert to numbers to prevent string math errors
  const max = Number(limits.maxReminders);
  const current = Number(limits.currentReminders);

  // 2. Safety check
  if (!max || max === 0) return null;

  // 3. Calculate Percentage
  const usagePercent = (current / max) * 100;

  console.log("DEBUG WARNINGS:", { max, current, usagePercent });

  // Case 1: Over Limit or 100% Used (Red)
  if (usagePercent >= 100) {
    return (
      <div className="warning-banner critical">
        <div className="warning-content">
          <strong>⚠️ Limit Reached:</strong> You have used {current} of {max}{" "}
          reminders. Please upgrade to add more.
        </div>
        <button
          className="warning-btn"
          onClick={() => router.push("/dashboard/billing")}
        >
          Upgrade
        </button>
      </div>
    );
  }

  // Case 2: Approaching Limit - 80% or more (Yellow)
  if (usagePercent >= 80) {
    return (
      <div className="warning-banner warning">
        <div className="warning-content">
          <strong>Usage Alert:</strong> You have used {Math.floor(usagePercent)}
          % of your reminder limit ({current}/{max}).
        </div>
        <button
          className="warning-btn"
          onClick={() => router.push("/dashboard/billing")}
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  return null;
}
