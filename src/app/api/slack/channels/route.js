import { NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const { botToken, connectionId } = await request.json();

    if (!botToken || !connectionId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Initialize Slack client
    const slackClient = new WebClient(botToken);

    // Fetch conversations (channels, DMs, groups)
    const result = await slackClient.conversations.list({
      types: "public_channel,private_channel,mpim,im",
      limit: 100,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to fetch channels from Slack",
        },
        { status: 500 },
      );
    }

    const channels = result.channels || [];

    // Store channels in database
    const supabase = await createClient();

    const channelData = channels.map((channel) => ({
      connection_id: connectionId,
      channel_id: channel.id,
      channel_name: channel.name || channel.user || "Direct Message",
      is_private: channel.is_private || false,
      is_archived: channel.is_archived || false,
    }));

    // Upsert channels to avoid duplicates
    if (channelData.length > 0) {
      const { error } = await supabase
        .from("slack_channels")
        .upsert(channelData, { onConflict: "connection_id,channel_id" });

      if (error) {
        console.error("Database error:", error);
      }
    }

    return NextResponse.json({
      success: true,
      channels: channelData,
      count: channelData.length,
    });
  } catch (error) {
    console.error("Error in channels API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
