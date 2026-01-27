"use client";

import { Calendar, Home, Settings, Slack, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import "./sidebar.css";

const menuItems = [
  { name: "Dashboard", icon: Home, href: "/dashboard" },
  { name: "Reminders", icon: Calendar, href: "/dashboard/reminders" },
  { name: "Slack", icon: Slack, href: "/dashboard/slack" },
  { name: "Billing", icon: Zap, href: "/dashboard/billing" },
  // { name: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { user } = useAuth(); // Use the context hook instead of manual fetch
  const [stats, setStats] = useState({
    activeReminders: 0,
    slackChannels: 0,
  });

  useEffect(() => {
    // 1. If no user yet, don't try to fetch
    if (!user) return;

    const supabase = createClient();

    async function fetchStats() {
      // Fetch active reminders count
      const { count: remindersCount, error: reminderError } = await supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");

      if (reminderError)
        console.error("❌ Reminder Stats Error:", reminderError);

      // Fetch Slack connections count
      const { count: connectionsCount, error: connError } = await supabase
        .from("slack_connections")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (connError) console.error("❌ Connection Stats Error:", connError);

      // console.log("✅ Stats Found:", {
      //   reminders: remindersCount,
      //   connections: connectionsCount,
      // });

      setStats({
        activeReminders: remindersCount || 0,
        slackChannels: connectionsCount || 0,
      });
    }

    fetchStats();

    // Subscribe to changes so the badge updates automatically
    const channel = supabase
      .channel("sidebar_stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminders" },
        () => {
          console.log("🔄 Realtime update: Reminders changed");
          fetchStats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]); // Re-run when 'user' becomes available

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <nav className="sidebar-nav">
          <div className="section">
            <h2 className="section-title">Main</h2>
            <ul className="menu-list">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`menu-item ${isActive ? "active" : ""}`}
                    >
                      <item.icon className="menu-icon" />
                      <span>{item.name}</span>

                      {/* Optional: Add badge for active reminders on the Reminders tab */}
                      {item.name === "Reminders" &&
                        stats.activeReminders > 0 && (
                          <span className="menu-badge">
                            {stats.activeReminders}
                          </span>
                        )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="section">
            <h2 className="section-title">Quick Stats</h2>
            <div className="stats-card">
              <div className="stat">
                <p className="stat-label">Active Reminders</p>
                <p className="stat-value">{stats.activeReminders}</p>
              </div>
              <div className="stat">
                <p className="stat-label">Slack Channels</p>
                <p className="stat-value">{stats.slackChannels}</p>
              </div>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
