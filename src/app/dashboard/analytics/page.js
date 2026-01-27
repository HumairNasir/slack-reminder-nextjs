"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { BarChart3, CheckCircle, Clock, ArrowUpRight } from "lucide-react";
import "./analytics.css";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSent: 0,
    successRate: 0,
    activeReminders: 0,
    topChannels: [],
    dailyStats: [],
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadAnalytics() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      try {
        // 1. Get Active Reminders
        const { count: activeCount } = await supabase
          .from("reminders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active");

        // 2. Get Logs via Relation
        // NOTE: We select 'created_at' as a fallback if 'sent_at' is missing
        const { data: logs, error } = await supabase
          .from("reminder_logs")
          .select(
            `
            status,
            sent_at,
            created_at,
            reminders!inner (
              user_id,
              channel_name
            )
          `,
          )
          .eq("reminders.user_id", user.id)
          .order("sent_at", { ascending: true });

        if (error) throw error;
        if (!logs) {
          setLoading(false);
          return;
        }

        // --- KPI CALCULATIONS ---
        const totalSent = logs.length;
        const successCount = logs.filter(
          (l) => l.status === "success" || l.status === "sent",
        ).length;
        const successRate =
          totalSent > 0 ? ((successCount / totalSent) * 100).toFixed(1) : 0;

        // --- ROBUST DATE MATCHING (The Fix) ---
        // We normalize everything to Local Date Strings (e.g., "1/27/2026") to avoid UTC mismatch
        const days = 7;
        const dailyMap = {};
        const today = new Date();

        // 1. Initialize last 7 days buckets
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          // Use LocaleDateString for stable key matching
          const key = d.toLocaleDateString();
          dailyMap[key] = {
            date: key,
            total: 0,
            success: 0,
            failed: 0,
            // Display: "Mon" or "27"
            label: d.toLocaleDateString("en-US", { weekday: "short" }),
            fullLabel: d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
          };
        }

        // 2. Fill Data
        logs.forEach((log) => {
          const timestamp = log.sent_at || log.created_at;
          if (!timestamp) return;

          const logDate = new Date(timestamp).toLocaleDateString();

          // Only count if it falls within our 7-day window
          if (dailyMap[logDate]) {
            dailyMap[logDate].total += 1;
            if (log.status === "success" || log.status === "sent") {
              dailyMap[logDate].success += 1;
            } else {
              dailyMap[logDate].failed += 1;
            }
          }
        });

        const dailyStats = Object.values(dailyMap);

        // --- TOP CHANNELS ---
        const channelMap = {};
        logs.forEach((log) => {
          const name = log.reminders?.channel_name || "Unknown";
          channelMap[name] = (channelMap[name] || 0) + 1;
        });

        const topChannels = Object.entries(channelMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((c) => ({
            ...c,
            percent: (c.count / totalSent) * 100,
          }));

        setStats({
          totalSent,
          successRate,
          activeReminders: activeCount || 0,
          topChannels,
          dailyStats,
        });
      } catch (err) {
        console.error("Analytics Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading)
    return <div className="analytics-loading">Loading analytics...</div>;

  // Find max value to scale the bars relative to highest day
  const maxDaily = Math.max(...stats.dailyStats.map((d) => d.total), 5);

  return (
    <div className="analytics-page">
      <div className="header-row">
        <h1 className="page-title">Analytics Overview</h1>
        <p className="last-updated">Last 7 Days</p>
      </div>

      {/* KPI GRID */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="icon-wrapper blue">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="stat-label">Total Sent</p>
            <h3 className="stat-value">{stats.totalSent}</h3>
          </div>
        </div>
        <div className="stat-card">
          <div
            className={`icon-wrapper ${stats.successRate > 90 ? "green" : "orange"}`}
          >
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="stat-label">Success Rate</p>
            <h3 className="stat-value">{stats.successRate}%</h3>
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-wrapper purple">
            <Clock size={24} />
          </div>
          <div>
            <p className="stat-label">Active Pending</p>
            <h3 className="stat-value">{stats.activeReminders}</h3>
          </div>
        </div>
      </div>

      <div className="charts-section">
        {/* --- MODERN BAR CHART (Activity) --- */}
        <div className="chart-card full-width">
          <div className="card-header">
            <h3>Weekly Activity</h3>
            <div className="legend">
              <div className="legend-item">
                <span className="dot success"></span>Success
              </div>
              <div className="legend-item">
                <span className="dot failed"></span>Failed
              </div>
            </div>
          </div>

          <div className="bar-chart-container">
            {stats.dailyStats.length === 0 ? (
              <p className="no-data">No data yet</p>
            ) : (
              <div className="css-bar-chart">
                {stats.dailyStats.map((day, i) => {
                  // Calculate heights
                  const heightPercent = (day.total / maxDaily) * 100;
                  const successHeight =
                    day.total > 0 ? (day.success / day.total) * 100 : 0;
                  const failedHeight =
                    day.total > 0 ? (day.failed / day.total) * 100 : 0;

                  return (
                    <div key={i} className="chart-column">
                      {/* Tooltip on Hover */}
                      <div className="tooltip">
                        <strong>{day.fullLabel}</strong>
                        <div>Sent: {day.success}</div>
                        <div>Failed: {day.failed}</div>
                      </div>

                      <div className="bar-track">
                        <div
                          className="bar-fill-wrapper"
                          style={{ height: `${heightPercent}%` }}
                        >
                          {/* Stacked Segments */}
                          {day.failed > 0 && (
                            <div
                              className="bar-segment failed"
                              style={{ height: `${failedHeight}%` }}
                            />
                          )}
                          {day.success > 0 && (
                            <div
                              className="bar-segment success"
                              style={{ height: `${successHeight}%` }}
                            />
                          )}
                        </div>
                      </div>
                      <span className="x-label">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* --- TOP CHANNELS --- */}
        <div className="chart-card">
          <div className="card-header">
            <h3>Top Channels</h3>
          </div>
          <div className="channels-list">
            {stats.topChannels.length === 0 ? (
              <div className="empty-state">
                <p>No channel data yet.</p>
              </div>
            ) : (
              stats.topChannels.map((channel, index) => (
                <div key={index} className="channel-row">
                  <div className="channel-info">
                    <span className="channel-name">#{channel.name}</span>
                    <span className="channel-count">{channel.count}</span>
                  </div>
                  <div className="progress-bg">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.max(channel.percent, 5)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
