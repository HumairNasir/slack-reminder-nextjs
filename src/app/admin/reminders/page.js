"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
  Loader2,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  Clock,
} from "lucide-react";
import "@/app/admin/admin.css";
import "./reminders.css";

export default function AllReminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    fetchReminders();
  }, [filter]);

  async function fetchReminders() {
    setLoading(true);

    // 1. Base Query: Join with users to get email
    let query = supabase
      .from("reminders")
      .select(
        `
        *,
        users ( email )
      `,
      )
      .order("scheduled_for", { ascending: false }); // Newest/Future first

    // 2. Apply Filters
    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reminders:", error);
    } else {
      setReminders(data || []);
    }
    setLoading(false);
  }

  // Helper to pick icons based on status
  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <Clock size={14} />;
      case "sent":
        return <CheckCircle size={14} />;
      case "failed":
        return <AlertCircle size={14} />;
      case "paused":
        return <PauseCircle size={14} />;
      default:
        return <Calendar size={14} />;
    }
  };

  return (
    <div>
      <div className="reminders-header">
        <h1 className="page-title reminders-page-title">Reminders</h1>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {["all", "active", "sent", "failed"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`filter-tab ${filter === status ? "active" : ""}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card reminders-card">
        {loading ? (
          <div className="loading-container">
            <Loader2 className="animate-spin loader-icon" size={32} />
            <p>Loading reminders...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Reminder Title</th>
                  <th>Status</th>
                  <th>Scheduled For</th>
                  <th>Channel</th>
                  <th>User</th>
                  <th>Message Preview</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((reminder) => (
                  <tr key={reminder.id}>
                    <td className="title-text">{reminder.title}</td>

                    <td>
                      <span
                        className={`badge ${reminder.status}`}
                        style={{ gap: "4px" }}
                      >
                        {getStatusIcon(reminder.status)}
                        {reminder.status.toUpperCase()}
                      </span>
                    </td>

                    <td>{new Date(reminder.scheduled_for).toLocaleString()}</td>

                    <td>
                      <span className="channel-text">
                        #{reminder.channel_name}
                      </span>
                    </td>

                    <td className="user-email-text">
                      {reminder.users?.email || "Unknown User"}
                    </td>

                    <td className="message-cell" title={reminder.message}>
                      {reminder.message}
                    </td>
                  </tr>
                ))}

                {reminders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state-cell">
                      No {filter !== "all" ? filter : ""} reminders found.
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
