"use client";
import { checkUserLimits } from "@/lib/subscription/checkLimits";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import "./reminder.css";

export default function RemindersPage() {
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  // --- MODAL & EDIT STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [updating, setUpdating] = useState(false);

  // --- DROPDOWN DATA ---
  const [connections, setConnections] = useState([]);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Load limits
    const limitsData = await checkUserLimits(user.id);
    setLimits(limitsData);
    setCanCreate(limitsData.allowed && limitsData.limits?.canAddReminder);

    // 2. Load reminders
    await loadReminders(user.id);

    // 3. Load Connections
    const { data: connData } = await supabase
      .from("slack_connections")
      .select("id, team_name")
      .eq("user_id", user.id)
      .eq("is_active", true);
    setConnections(connData || []);

    setLoading(false);
  }

  // Refresh reminders when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) loadData(); // Reload everything to update limits
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Fetch Channels for Modal
  useEffect(() => {
    async function fetchChannels() {
      if (!editForm.connection_id || !isEditModalOpen) return;
      setChannelsLoading(true);
      const { data } = await supabase
        .from("slack_channels")
        .select("*")
        .eq("connection_id", editForm.connection_id);
      setChannels(data || []);
      setChannelsLoading(false);
    }
    fetchChannels();
  }, [editForm.connection_id, isEditModalOpen]);

  const loadReminders = async (userId) => {
    setRemindersLoading(true);
    try {
      const { data: remindersData, error } = await supabase
        .from("reminders")
        .select(`*, slack_connections(team_name)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
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
      alert(`Plan limit reached! Max ${limits.limits.maxReminders} reminders.`);
      return;
    }
    window.location.href = "/dashboard/reminders/create";
  };

  const openEditModal = (reminder) => {
    const date = new Date(reminder.scheduled_for);
    // Format for datetime-local input
    const localIsoString = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);

    setEditForm({
      id: reminder.id,
      title: reminder.title,
      message: reminder.message,
      recurrence: reminder.recurrence || "once",
      scheduled_for: localIsoString,
      connection_id: reminder.connection_id,
      channel_id: reminder.channel_id,
      originalStatus: reminder.status,
    });

    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (!editForm.connection_id || !editForm.channel_id) {
        alert("Please select a Workspace and Channel");
        setUpdating(false);
        return;
      }

      const utcDate = new Date(editForm.scheduled_for).toISOString();
      const selectedChannel = channels.find(
        (c) => c.channel_id === editForm.channel_id,
      );
      const channelName = selectedChannel
        ? selectedChannel.channel_name
        : "unknown";

      const payload = {
        title: editForm.title,
        message: editForm.message,
        scheduled_for: utcDate,
        recurrence: editForm.recurrence,
        connection_id: editForm.connection_id,
        channel_id: editForm.channel_id,
        channel_name: channelName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // 🛑 LOGIC FIX:
      // 1. If 'sent' or 'failed', we create a NEW one (history preserved).
      // 2. If 'active', we UPDATE the existing one (same ID, no count increase).
      if (editForm.originalStatus === "active") {
        const { error } = await supabase
          .from("reminders")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editForm.id);
        if (error) throw error;
        alert("Reminder updated successfully!");
      } else {
        // Status is 'sent' or 'failed' -> Reschedule as NEW
        // This counts as a new usage for the current month
        const { error } = await supabase.from("reminders").insert({
          ...payload,
          user_id: user.id,
          status: "active",
        });
        if (error) throw error;
        alert("Reminder rescheduled (created new)!");
      }

      setIsEditModalOpen(false);
      await loadData(); // Reload limits and reminders
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update reminder.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    try {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;

      // Reload data to reflect new count (deleted items give credit back)
      loadData();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  if (loading) return <div className="page-title">Loading...</div>;

  return (
    <div>
      <h1 className="page-title">Reminders</h1>

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                {editForm.originalStatus === "active"
                  ? "Edit Reminder"
                  : "Reschedule Reminder"}
              </h2>
              <button
                className="close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Workspace</label>
                  <select
                    value={editForm.connection_id}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        connection_id: e.target.value,
                        channel_id: "",
                      })
                    }
                  >
                    <option value="">Select Workspace</option>
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.team_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Channel</label>
                  <select
                    value={editForm.channel_id}
                    onChange={(e) =>
                      setEditForm({ ...editForm, channel_id: e.target.value })
                    }
                    disabled={!editForm.connection_id || channelsLoading}
                  >
                    <option value="">
                      {channelsLoading ? "Loading..." : "Select Channel"}
                    </option>
                    {channels.map((c) => (
                      <option key={c.channel_id} value={c.channel_id}>
                        #{c.channel_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Message</label>
                <textarea
                  rows={3}
                  value={editForm.message}
                  onChange={(e) =>
                    setEditForm({ ...editForm, message: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.scheduled_for}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        scheduled_for: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Recurrence</label>
                  <select
                    value={editForm.recurrence}
                    onChange={(e) =>
                      setEditForm({ ...editForm, recurrence: e.target.value })
                    }
                  >
                    <option value="once">One-time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : editForm.originalStatus === "active" ? (
                  "Save Changes"
                ) : (
                  "Create New"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STATS SECTION --- */}
      {limits && (
        <div className="plan-status">
          <h3>Subscription Status</h3>
          <p>Plan: {limits.allowed ? "Active" : "No active plan"}</p>
          {limits.allowed && (
            <div className="usage-stats">
              <p>
                Reminders: {limits.limits.currentReminders} /{" "}
                {limits.limits.maxReminders}
              </p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(
                      (limits.limits.currentReminders /
                        limits.limits.maxReminders) *
                        100,
                      100,
                    )}%`,
                    backgroundColor: limits.limits.canAddReminder
                      ? "green"
                      : "red",
                  }}
                />
              </div>
            </div>
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
      </div>

      <div className="reminders-list">
        <div className="reminders-header">
          <h3>Your Reminders</h3>
          <button
            onClick={() => loadData()}
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
                  </div>
                </div>

                <div className="reminder-actions">
                  <button
                    className="edit-btn"
                    onClick={() => openEditModal(reminder)}
                  >
                    {reminder.status === "active" ? "Edit" : "Reschedule"}
                  </button>

                  {/* ALLOW DELETING FAILED REMINDERS TOO (To clean up list) */}
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(reminder.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
