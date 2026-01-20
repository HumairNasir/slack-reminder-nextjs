"use client";
// export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import "./slack.css";

export default function SlackContent() {
  const { user } = useAuth();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for success/error messages from OAuth callback
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setMessage({
        type: "success",
        text: "Slack workspace connected successfully!",
      });
      // Clear the message after 5 seconds
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }

    if (error) {
      let errorText = "Failed to connect Slack workspace";
      if (error === "access_denied") errorText = "You denied access to Slack";
      if (error === "missing_params") errorText = "Missing required parameters";
      if (error === "oauth_failed") errorText = "Slack authorization failed";
      if (error === "db_error") errorText = "Database error occurred";

      setMessage({ type: "error", text: errorText });
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }

    fetchConnections();
  }, [user, searchParams]);

  const fetchConnections = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("slack_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    setConnections(data || []);
    setLoading(false);
  };

  const handleConnectSlack = () => {
    if (!user) {
      alert("Please login first");
      router.push("/login");
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
    if (!clientId) {
      alert("Slack client ID not configured");
      return;
    }

    const scopes =
      "channels:read,channels:manage,chat:write,groups:read,im:read,mpim:read";
    // const redirectUri = `${window.location.origin}/api/slack/callback`;
    const redirectUri = `https://slack-reminder-nextjs.vercel.app/api/slack/callback`;
    const state = user.id;

    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    window.location.href = slackAuthUrl;
  };

  const handleDisconnect = async (connectionId) => {
    if (!confirm("Are you sure you want to disconnect this Slack workspace?"))
      return;

    const { error } = await supabase
      .from("slack_connections")
      .update({ is_active: false })
      .eq("id", connectionId);

    if (!error) {
      fetchConnections();
      setMessage({
        type: "success",
        text: "Slack workspace disconnected successfully!",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    } else {
      setMessage({ type: "error", text: "Failed to disconnect workspace" });
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="slack-page">
      <h1 className="page-title">Slack Integration</h1>

      {/* Success/Error Messages */}
      {message.text && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
          <button
            className="message-close"
            onClick={() => setMessage({ type: "", text: "" })}
          >
            ×
          </button>
        </div>
      )}

      <div className="info-card">
        <h2>Connect Your Slack Workspace</h2>
        <p>
          Connect your Slack workspace to schedule reminders and send messages
          automatically. You'll be able to select channels and schedule
          messages.
        </p>
        <button
          className="connect-btn"
          onClick={handleConnectSlack}
          disabled={!user || !process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}
        >
          {!process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
            ? "Slack not configured"
            : "Connect New Workspace"}
        </button>

        {!process.env.NEXT_PUBLIC_SLACK_CLIENT_ID && (
          <p className="config-warning">
            Note: Slack integration requires environment variables to be set in
            Vercel.
          </p>
        )}
      </div>

      <div className="connections-section">
        <h2>Connected Workspaces</h2>

        {connections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <p>No Slack workspaces connected yet.</p>
            <p className="empty-subtext">
              Connect your first workspace to get started!
            </p>
          </div>
        ) : (
          <div className="connections-grid">
            {connections.map((conn) => (
              <div key={conn.id} className="connection-card">
                <div className="connection-header">
                  <div className="workspace-icon">S</div>
                  <div>
                    <h3>{conn.team_name || "Slack Workspace"}</h3>
                    <p className="workspace-id">Team ID: {conn.team_id}</p>
                  </div>
                </div>

                <div className="connection-details">
                  <div className="detail">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value active">Active</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Connected:</span>
                    <span className="detail-value">
                      {new Date(conn.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  className="disconnect-btn"
                  onClick={() => handleDisconnect(conn.id)}
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="instructions">
        <h3>How it works:</h3>
        <ol>
          <li>Click "Connect New Workspace"</li>
          <li>Authorize the app in Slack</li>
          <li>Select the workspace you want to connect</li>
          <li>You'll be redirected back here with success message</li>
          <li>Start creating reminders for your Slack channels!</li>
        </ol>
      </div>
    </div>
  );
}
