"use client";
import { checkUserLimits } from "@/lib/subscription/checkLimits";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import "./reminder.css";

export default function RemindersPage() {
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Load subscription limits
      const limitsData = await checkUserLimits(user.id);
      setLimits(limitsData);
      setCanCreate(limitsData.allowed && limitsData.limits?.canAddReminder);

      // Load user's reminders
      await loadReminders(user.id);

      setLoading(false);
    }

    loadData();
  }, []);

  // Refresh reminders when page becomes visible (after creating a reminder)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await loadReminders(user.id);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const loadReminders = async (userId) => {
    setRemindersLoading(true);
    try {
      const { data: remindersData, error } = await supabase
        .from("reminders")
        .select(
          `
          *,
          slack_connections(team_name)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading reminders:", error);
        return;
      }

      setReminders(remindersData || []);
    } catch (error) {
      console.error("Error loading reminders:", error);
    } finally {
      setRemindersLoading(false);
    }
  };

  const handleCreateReminder = () => {
    if (!limits?.allowed) {
      alert("You need an active subscription to create reminders.");
      return;
    }

    if (!limits.limits?.canAddReminder) {
      alert(
        `Plan limit reached! You can only have ${limits.limits.maxReminders} reminders.`,
      );
      return;
    }

    // Redirect to reminder creation form
    window.location.href = "/dashboard/reminders/create";
  };

  if (loading) {
    return <div className="page-title">Loading...</div>;
  }

  return (
    <div>
      <h1 className="page-title">Reminders</h1>

      {limits && (
        <div className="plan-status">
          <h3>Subscription Status</h3>
          <p>Plan: {limits.allowed ? "Active" : "No active plan"}</p>

          {limits.allowed && (
            <>
              <div className="usage-stats">
                <p>
                  Reminders: {limits.limits.currentReminders} /{" "}
                  {limits.limits.maxReminders}
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(limits.limits.currentReminders / limits.limits.maxReminders) * 100}%`,
                      backgroundColor: limits.limits.canAddReminder
                        ? "green"
                        : "red",
                    }}
                  />
                </div>
                {!limits.limits.canAddReminder && (
                  <p className="warning">
                    ⚠️ Reminder limit reached! Upgrade your plan.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="reminder-actions">
        <button
          onClick={handleCreateReminder}
          disabled={!canCreate}
          className={`create-btn ${!canCreate ? "disabled" : ""}`}
        >
          {canCreate ? "➕ Create New Reminder" : "Plan Limit Reached"}
        </button>

        {!limits?.allowed && (
          <p className="error-message">
            You need an active subscription to create reminders.
            <a href="/dashboard/billing"> Upgrade your plan</a>
          </p>
        )}
      </div>

      <div className="reminders-list">
        <div className="reminders-header">
          <h3>Your Reminders</h3>
          <button
            onClick={async () => {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (user) await loadReminders(user.id);
            }}
            className="refresh-btn"
            disabled={remindersLoading}
          >
            {remindersLoading ? "🔄" : "↻"} Refresh
          </button>
        </div>

        {remindersLoading ? (
          <p>Loading reminders...</p>
        ) : reminders.length === 0 ? (
          <p>No reminders yet. Create your first one!</p>
        ) : (
          <div className="reminders-grid">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="reminder-card">
                <div className="reminder-header">
                  <h4>{reminder.title}</h4>
                  <span className={`status-badge status-${reminder.status}`}>
                    {reminder.status}
                  </span>
                </div>

                <div className="reminder-content">
                  <p className="reminder-message">{reminder.message}</p>

                  <div className="reminder-details">
                    <div className="detail-item">
                      <strong>Workspace:</strong>{" "}
                      {reminder.slack_connections?.team_name || "Unknown"}
                    </div>
                    <div className="detail-item">
                      <strong>Channel:</strong>{" "}
                      {reminder.channel_name || reminder.channel_id}
                    </div>
                    <div className="detail-item">
                      <strong>Scheduled:</strong>{" "}
                      {new Date(reminder.scheduled_for).toLocaleString()}
                    </div>
                    <div className="detail-item">
                      <strong>Recurrence:</strong> {reminder.recurrence}
                    </div>
                    <div className="detail-item">
                      <strong>Timezone:</strong> {reminder.timezone}
                    </div>
                  </div>
                </div>

                <div className="reminder-actions">
                  <button className="edit-btn">Edit</button>
                  <button className="delete-btn">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
