// import { NextResponse } from "next/server";
// import { WebClient } from "@slack/web-api";
// import { createClient } from "@/lib/supabase/server";

// export async function POST(request) {
//   try {
//     const supabase = await createClient();

//     // 1. First get the current user
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return NextResponse.json(
//         { success: false, error: "Unauthorized - Please login" },
//         { status: 401 },
//       );
//     }

//     const { connectionId } = await request.json();

//     if (!connectionId) {
//       return NextResponse.json(
//         { success: false, error: "Missing connection ID" },
//         { status: 400 },
//       );
//     }

//     // 2. Get connection WITH user validation
//     const { data: connection, error: dbError } = await supabase
//       .from("slack_connections")
//       .select("*")
//       .eq("id", connectionId)
//       .eq("user_id", user.id)
//       .eq("is_active", true)
//       .single();

//     if (dbError || !connection) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Connection not found or you dont have permission",
//         },
//         { status: 404 },
//       );
//     }

//     // 2. Decrypt the bot token
//     const botToken = Buffer.from(connection.bot_token, "base64").toString(
//       "utf-8",
//     );

//     // 3. Initialize Slack client and fetch channels
//     const slackClient = new WebClient(botToken);
//     const result = await slackClient.conversations.list({
//       types: "public_channel,private_channel,mpim,im",
//       limit: 100,
//     });

//     if (!result.ok) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: result.error || "Failed to fetch channels from Slack",
//         },
//         { status: 500 },
//       );
//     }

//     const channels = result.channels || [];

//     // 4. Store channels in database
//     const channelData = channels.map((channel) => ({
//       connection_id: connectionId,
//       channel_id: channel.id,
//       channel_name: channel.name || channel.user || "Direct Message",
//       is_private: channel.is_private || false,
//       is_archived: channel.is_archived || false,
//     }));

//     if (channelData.length > 0) {
//       const { error: upsertError } = await supabase
//         .from("slack_channels")
//         .upsert(channelData, { onConflict: "connection_id,channel_id" });

//       if (upsertError) {
//         console.error("Database upsert error:", upsertError);
//       }
//     }

//     // 5. Return success with channels
//     return NextResponse.json({
//       success: true,
//       channels: channelData,
//       count: channelData.length,
//     });
//   } catch (error) {
//     console.error("Error in channels API:", error);
//     return NextResponse.json(
//       { success: false, error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }
import { NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate User
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { connectionId } = await request.json();

    // 2. Fetch Connection Details from DB
    const { data: connection, error: dbError } = await supabase
      .from("slack_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (dbError || !connection) {
      console.error("Connection fetch error:", dbError);
      return NextResponse.json(
        { success: false, error: "Connection not found" },
        { status: 404 },
      );
    }

    // 3. GET THE TOKEN (Fixes the crash)
    // Priority: 1. Database (Bot Token) -> 2. Database (Access Token) -> 3. .env File
    let rawToken = connection.bot_token || connection.access_token;
    let usedSource = "Database";

    if (!rawToken) {
      // Fallback to .env if DB is empty (matches your setup)
      if (process.env.SLACK_BOT_TOKEN) {
        rawToken = process.env.SLACK_BOT_TOKEN;
        usedSource = ".env File";
      } else {
        console.error("No token found in DB or .env");
        return NextResponse.json(
          {
            success: false,
            error: "Slack token missing. Please reconnect Slack.",
          },
          { status: 500 },
        );
      }
    }

    console.log(`Using Slack Token from: ${usedSource}`);

    // 4. Handle Decryption (Only if it looks like Base64)
    let botToken = rawToken;
    if (!rawToken.startsWith("xox") && !rawToken.startsWith("Bot")) {
      try {
        // Attempt to decode if it doesn't look like a standard token
        const decoded = Buffer.from(rawToken, "base64").toString("utf-8");
        // Only use decoded if it looks valid (starts with xox)
        if (decoded.startsWith("xox")) {
          botToken = decoded;
        }
      } catch (e) {
        // If decode fails, assume it was plain text
      }
    }

    // 5. Fetch Channels from Slack
    const slackClient = new WebClient(botToken);

    // Using try/catch specifically for the Slack API call
    let result;
    try {
      result = await slackClient.conversations.list({
        types: "public_channel,private_channel",
        limit: 100,
        exclude_archived: true,
      });
    } catch (slackError) {
      console.error("Slack API Request Failed:", slackError.message);
      return NextResponse.json(
        { success: false, error: "Slack API Error: " + slackError.message },
        { status: 500 },
      );
    }

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || "Unknown Slack Error" },
        { status: 500 },
      );
    }

    const channels = result.channels || [];

    // 6. Save/Update Channels in Database
    const channelData = channels.map((channel) => ({
      connection_id: connectionId,
      channel_id: channel.id,
      channel_name: channel.name || "Unnamed",
      is_private: channel.is_private || false,
      is_archived: channel.is_archived || false,
    }));

    if (channelData.length > 0) {
      const { error: upsertError } = await supabase
        .from("slack_channels")
        .upsert(channelData, { onConflict: "connection_id,channel_id" });

      if (upsertError) {
        console.error("DB Upsert Error (Non-fatal):", upsertError);
      }
    }

    return NextResponse.json({
      success: true,
      channels: channelData,
      count: channelData.length,
    });
  } catch (error) {
    console.error("FATAL ROUTE ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
