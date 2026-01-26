"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import "../admin.css"; // Global styles (table-wrapper, styled-table)
import "./logs.css"; // Page specific styles

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  async function fetchLogs() {
    setLoading(true);
    let query = supabase
      .from("reminder_logs")
      .select(
        `
        *,
        reminders (
           title,
           users ( email ) 
    )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter === "failed") {
      query = query.eq("status", "failed");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching logs:", error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="logs-header">
        <h1 className="page-title logs-page-title">System Logs</h1>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            onClick={() => setFilter("all")}
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
          >
            All Logs
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`filter-tab ${filter === "failed" ? "active" : ""}`}
          >
            Failed Only
          </button>
        </div>
      </div>

      <div className="card logs-card">
        {loading ? (
          <div className="loading-container">
            <Loader2 className="animate-spin loader-icon" size={32} />
            <p>Loading system logs...</p>
          </div>
        ) : (
          /* table-wrapper handles the horizontal scroll on small screens */
          <div className="table-wrapper">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>User</th>
                  <th>Reminder Title</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="time-cell">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      {log.status === "success" ? (
                        <span className="badge active status-badge-flex">
                          <CheckCircle size={14} /> Sent
                        </span>
                      ) : (
                        <span className="badge error status-badge-flex">
                          <AlertCircle size={14} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="user-text">
                      {/* {log.users?.email || "Unknown"} */}
                      {log.reminders?.users?.email || "Unknown"}
                    </td>
                    <td>
                      {log.reminders?.title || (
                        <span className="deleted-text">Deleted</span>
                      )}
                    </td>
                    <td
                      className={`details-cell ${
                        log.status === "failed" ? "error-text" : ""
                      }`}
                    >
                      {log.error_message || "Delivered successfully"}
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state-cell">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
