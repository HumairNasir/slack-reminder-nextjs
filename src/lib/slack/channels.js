import { createClient } from "@/lib/supabase/client";

export async function fetchUserSlackChannels(userId) {
  const supabase = createClient();

  // 1. Get user's Slack connections
  const { data: connections } = await supabase
    .from("slack_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!connections?.length) return [];

  // 2. For each connection, fetch channels
  const allChannels = [];

  for (const conn of connections) {
    // TODO: Decrypt token and call Slack API
    // This requires the @slack/web-api package
  }

  return allChannels;
}
