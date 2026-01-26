"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { checkUserLimits } from "@/lib/subscription/checkLimits";
import "./create-reminder.css";

export default function CreateReminderForm() {
  const { user } = useAuth();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    connectionId: "",
    channelId: "",
    scheduledFor: "",
    recurrence: "once",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [connections, setConnections] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState(null);

  // Load user's Slack connections and check limits
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      // Check user limits
      const limitsData = await checkUserLimits(user.id);
      setLimits(limitsData);

      // Load Slack connections
      const { data: connectionsData } = await supabase
        .from("slack_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      setConnections(connectionsData || []);
    }

    loadData();
  }, [user]);

  // Load channels when connection changes
  useEffect(() => {
    async function loadChannels() {
      if (!formData.connectionId) {
        setChannels([]);
        return;
      }

      const { data: channelsData } = await supabase
        .from("slack_channels")
        .select("*")
        .eq("connection_id", formData.connectionId);

      setChannels(channelsData || []);
    }

    loadChannels();
  }, [formData.connectionId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (
        !formData.title ||
        !formData.message ||
        !formData.connectionId ||
        !formData.channelId ||
        !formData.scheduledFor
      ) {
        alert("Please fill in all required fields");
        return;
      }

      // Check if scheduled time is in the future
      // Note: This comparison works correctly because both are treated as local browser time
      const scheduledTime = new Date(formData.scheduledFor);
      if (scheduledTime <= new Date()) {
        alert("Please select a future date and time");
        return;
      }

      // --- TIMEZONE FIX START ---
      // 1. Create a Date object from the input (Browser treats this as Local Time)
      // Example: User inputs "18:00" -> Date obj represents "18:00 PKT"
      const dateObj = new Date(formData.scheduledFor);

      // 2. Convert to UTC ISO String
      // Example: "18:00 PKT" becomes "13:00 UTC"
      const utcDateForDB = dateObj.toISOString();

      // 3. Prepare payload with the UTC time
      const payload = {
        ...formData,
        scheduledFor: utcDateForDB, // <--- Sending UTC to DB
      };
      // --- TIMEZONE FIX END ---

      // Submit to API
      const response = await fetch("/api/reminders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload), // Send the modified payload
      });

      const result = await response.json();

      if (result.success) {
        alert("Reminder created successfully!");
        // Reset form
        setFormData({
          title: "",
          message: "",
          connectionId: "",
          channelId: "",
          scheduledFor: "",
          recurrence: "once",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        // Redirect to reminders list
        window.location.href = "/dashboard/reminders";
      } else {
        alert("Error creating reminder: " + result.error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while creating the reminder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-reminder-form">
      <h2>Create New Reminder</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Reminder Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Daily Standup Reminder"
            required
            maxLength={255}
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">Message *</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder="Enter your reminder message..."
            required
            rows={4}
            maxLength={2000}
          />
        </div>

        <div className="form-group">
          <label htmlFor="connectionId">Slack Workspace *</label>
          <select
            id="connectionId"
            name="connectionId"
            value={formData.connectionId}
            onChange={handleInputChange}
            required
          >
            <option value="">Select a workspace...</option>
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.team_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="channelId">Slack Channel *</label>
          <select
            id="channelId"
            name="channelId"
            value={formData.channelId}
            onChange={handleInputChange}
            required
            disabled={!formData.connectionId}
          >
            <option value="">
              {formData.connectionId
                ? "Select a channel..."
                : "Select workspace first"}
            </option>
            {channels.map((channel) => (
              <option key={channel.channel_id} value={channel.channel_id}>
                #{channel.channel_name} {channel.is_private ? "(Private)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="scheduledFor">Schedule Date & Time *</label>
          <input
            type="datetime-local"
            id="scheduledFor"
            name="scheduledFor"
            value={formData.scheduledFor}
            onChange={handleInputChange}
            required
            // Note: This min attribute uses local time for the input restriction, which is correct
            min={new Date().toISOString().slice(0, 16)}
          />
          <small>Timezone: {formData.timezone}</small>
        </div>

        <div className="form-group">
          <label htmlFor="recurrence">Recurrence</label>
          <select
            id="recurrence"
            name="recurrence"
            value={formData.recurrence}
            onChange={handleInputChange}
          >
            <option value="once">One time only</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating..." : "Create Reminder"}
          </button>
          <a href="/dashboard/reminders" className="btn-secondary">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
