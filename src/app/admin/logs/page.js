"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { FileText, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import "../admin.css";

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' or 'failed'
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
        users (email),
        reminders (title)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50); // Limit to last 50 for performance

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
      <div className="page-header">
        <h1 className="page-title">System Logs</h1>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
          >
            All Logs
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`filter-btn ${filter === "failed" ? "active" : ""}`}
          >
            Failed Only
          </button>
        </div>
      </div>

      <div className="section-container">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={32} />
            <p>Loading system logs...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
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
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>
                      {log.status === "success" ? (
                        <span className="status-flex success">
                          <CheckCircle size={16} /> Sent
                        </span>
                      ) : (
                        <span className="status-flex error">
                          <AlertCircle size={16} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="font-medium">
                      {log.users?.email || "Unknown"}
                    </td>
                    <td>{log.reminders?.title || "Deleted Reminder"}</td>
                    <td className="log-message">
                      {log.error_message || "Delivered successfully"}
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">
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
