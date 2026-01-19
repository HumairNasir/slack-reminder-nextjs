"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SlackConnectionStatus() {
  const { user } = useAuth();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchConnections() {
      if (!user) return;

      const { data } = await supabase
        .from("slack_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      setConnections(data || []);
      setLoading(false);
    }

    fetchConnections();
  }, [user]);

  if (loading)
    return <div className="text-sm text-gray-500">Loading Slack status...</div>;

  if (connections.length === 0) {
    return (
      <div className="slack-status disconnected">
        <div className="status-indicator red" />
        <span className="status-text">Not connected to Slack</span>
      </div>
    );
  }

  return (
    <div className="slack-status connected">
      <div className="status-indicator green" />
      <span className="status-text">
        Connected to {connections.length} workspace
        {connections.length > 1 ? "s" : ""}
      </span>
    </div>
  );
}
