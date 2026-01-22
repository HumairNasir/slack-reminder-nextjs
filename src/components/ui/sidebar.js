"use client";

import { Calendar, Home, Settings, Slack, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import "./sidebar.css";

const menuItems = [
  { name: "Dashboard", icon: Home, href: "/dashboard" },
  { name: "Reminders", icon: Calendar, href: "/dashboard/reminders" },
  { name: "Slack", icon: Slack, href: "/dashboard/slack" },
  { name: "Billing", icon: Zap, href: "/dashboard/billing" },
  { name: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const [stats, setStats] = useState({
    activeReminders: 0,
    slackChannels: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch active reminders count
      const { count: remindersCount } = await supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Fetch Slack connections count (each connection = 1 workspace)
      const { count: connectionsCount } = await supabase
        .from("slack_connections")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      setStats({
        activeReminders: remindersCount || 0,
        slackChannels: connectionsCount || 0,
      });
    }

    fetchStats();
  }, []);

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
