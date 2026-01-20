import { NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();

    // 1. First get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Please login" },
        { status: 401 },
      );
    }

    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { success: false, error: "Missing connection ID" },
        { status: 400 },
      );
    }

    // 2. Get connection WITH user validation
    const { data: connection, error: dbError } = await supabase
      .from("slack_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", user.id) // CRITICAL: Verify user owns this connection
      .eq("is_active", true)
      .single();

    if (dbError || !connection) {
      return NextResponse.json(
        {
          success: false,
          error: "Connection not found or you dont have permission",
        },
        { status: 404 },
      );
    }

    // 2. Decrypt the bot token
    const botToken = Buffer.from(connection.bot_token, "base64").toString(
      "utf-8",
    );

    // 3. Initialize Slack client and fetch channels
    const slackClient = new WebClient(botToken);
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

    // 4. Store channels in database
    const channelData = channels.map((channel) => ({
      connection_id: connectionId,
      channel_id: channel.id,
      channel_name: channel.name || channel.user || "Direct Message",
      is_private: channel.is_private || false,
      is_archived: channel.is_archived || false,
    }));

    if (channelData.length > 0) {
      const { error: upsertError } = await supabase
        .from("slack_channels")
        .upsert(channelData, { onConflict: "connection_id,channel_id" });

      if (upsertError) {
        console.error("Database upsert error:", upsertError);
      }
    }

    // 5. Return success with channels
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
