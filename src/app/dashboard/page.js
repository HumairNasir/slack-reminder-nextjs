"use client";

import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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
    isExpired: false, // 👈 New State for expiration
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Wrapped in useCallback so we can call it from the event listener
  const fetchDashboardStats = useCallback(async () => {
    if (!user) return;

    try {
      console.log("🔄 Refreshing Dashboard Stats...");

      // Get subscription data (includes isExpired from our API update)
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
        isExpired: subscriptionData.isExpired || false, // 👈 Capture API flag
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setDashboardStats((prev) => ({
        ...prev,
        subscriptionPlan: "Error loading",
      }));
    }
  }, [user]);

  // Initial Fetch
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // ✅ AUTO-REFRESH: Reload when user returns to this tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDashboardStats();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchDashboardStats]);

  if (authLoading || roleLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard Overview</h1>

      <div className="welcome-banner">
        <h2>Welcome back, {user.email?.split("@")[0] || "User"}!</h2>
        <p>
          Your role: <span className="role-badge">{role}</span>
        </p>
      </div>

      {/* Warnings Component */}
      {(dashboardStats.limits || dashboardStats.isExpired) && (
        <UsageWarnings
          limits={dashboardStats.limits}
          isExpired={dashboardStats.isExpired} // 👈 Pass expired state
          router={router}
        />
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
          <button
            className="action-btn dark-btn"
            onClick={() => router.push("/dashboard/reminders/create")}
            disabled={dashboardStats.isExpired} // Disable if expired
            style={
              dashboardStats.isExpired
                ? { opacity: 0.5, cursor: "not-allowed" }
                : {}
            }
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
function UsageWarnings({ limits, isExpired, router }) {
  // 1. PRIORITY CHECK: Is the Trial Expired?
  if (isExpired) {
    return (
      <div
        className="warning-banner critical"
        style={{
          backgroundColor: "#fee2e2",
          border: "1px solid #ef4444",
          color: "#b91c1c",
        }}
      >
        <div className="warning-content">
          <strong>⛔ Trial Expired:</strong> Your 7-day free trial has ended.
          Please upgrade to continue creating reminders.
        </div>
        <button
          className="warning-btn"
          onClick={() => router.push("/dashboard/billing")}
          style={{ backgroundColor: "#dc2626", color: "white" }}
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  if (!limits) return null;

  const max = Number(limits.maxReminders);
  const current = Number(limits.currentReminders);

  if (!max || max === 0) return null;

  const usagePercent = (current / max) * 100;

  // Case 2: Over Limit (Red)
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

  // Case 3: Approaching Limit (Yellow)
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
