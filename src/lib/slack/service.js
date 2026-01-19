import { createClient } from "@/lib/supabase/server";
import { createSlackClient } from "./client";
import { encryptToken, decryptToken } from "./encrypt";

export async function saveSlackConnection(userId, oauthData) {
  const supabase = await createClient();

  const { error } = await supabase.from("slack_connections").insert({
    user_id: userId,
    team_id: oauthData.team.id,
    team_name: oauthData.team.name,
    bot_token: encryptToken(oauthData.access_token),
    bot_user_id: oauthData.bot_user_id,
    is_active: true,
  });

  return { error };
}

export async function getUserSlackConnections(userId) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("slack_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  return { data, error };
}

export async function disconnectSlack(userId, connectionId) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("slack_connections")
    .update({ is_active: false })
    .eq("id", connectionId)
    .eq("user_id", userId);

  return { error };
}

export async function fetchSlackChannels(botToken, connectionId) {
  const supabase = await createClient();
  const slackClient = createSlackClient(decryptToken(botToken));

  try {
    // Fetch conversations (channels)
    const result = await slackClient.conversations.list({
      types: "public_channel,private_channel,mpim,im",
    });

    if (result.channels) {
      // Store channels in database
      const channels = result.channels.map((channel) => ({
        connection_id: connectionId,
        channel_id: channel.id,
        channel_name: channel.name || "Direct Message",
        is_private: channel.is_private || false,
        is_archived: channel.is_archived || false,
      }));

      // Save to database
      const { error } = await supabase
        .from("slack_channels")
        .upsert(channels, { onConflict: "connection_id,channel_id" });

      return { channels, error };
    }

    return { channels: [], error: null };
  } catch (error) {
    return { channels: [], error };
  }
}
