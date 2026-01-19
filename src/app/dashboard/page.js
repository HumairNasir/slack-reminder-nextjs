"use client";

import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import "./dashboard.css";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

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
          <p className="stat-number">Free Plan</p>
          <button className="action-btn primary-btn">Upgrade</button>
        </div>

        {/* Slack Connection Card */}
        <div className="stat-card">
          <h3 className="stat-title">Slack Connection</h3>
          <p className="stat-number error">Not Connected</p>
          <button className="action-btn success-btn">Connect Slack</button>
        </div>

        {/* Active Reminders Card */}
        <div className="stat-card">
          <h3 className="stat-title">Active Reminders</h3>
          <p className="stat-number">0</p>
          <button className="action-btn dark-btn">Create Reminder</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-item">
            <div className="action-icon">📅</div>
            <p className="action-text">Schedule Reminder</p>
          </button>
          <button className="action-item">
            <div className="action-icon">🔄</div>
            <p className="action-text">View Logs</p>
          </button>
          <button className="action-item">
            <div className="action-icon">⚙️</div>
            <p className="action-text">Settings</p>
          </button>
          <button className="action-item">
            <div className="action-icon">📊</div>
            <p className="action-text">Analytics</p>
          </button>
        </div>
      </div>
    </div>
  );
}
