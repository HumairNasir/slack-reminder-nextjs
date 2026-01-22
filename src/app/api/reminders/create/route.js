import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUserLimits } from "@/lib/subscription/checkLimits";

export async function POST(request) {
  try {
    const supabase = await createClient();

    // 1. Get current user
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

    // 2. Parse request body
    const {
      title,
      message,
      connectionId,
      channelId,
      scheduledFor,
      recurrence,
      timezone,
    } = await request.json();

    // 3. Validate required fields
    if (!title || !message || !connectionId || !channelId || !scheduledFor) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 4. Check user limits (temporarily disabled for testing)
    // const limits = await checkUserLimits(user.id);
    // if (!limits.allowed || !limits.limits.canAddReminder) {
    //   return NextResponse.json(
    //     { success: false, error: "Subscription limit reached or inactive" },
    //     { status: 403 },
    //   );
    // }

    // 5. Verify the Slack connection belongs to the user
    const { data: connection, error: connectionError } = await supabase
      .from("slack_connections")
      .select("id, team_name")
      .eq("id", connectionId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { success: false, error: "Invalid or unauthorized Slack connection" },
        { status: 403 },
      );
    }

    // 6. Verify the channel exists for this connection
    const { data: channel, error: channelError } = await supabase
      .from("slack_channels")
      .select("channel_name")
      .eq("connection_id", connectionId)
      .eq("channel_id", channelId)
      .single();

    if (channelError || !channel) {
      return NextResponse.json(
        { success: false, error: "Invalid channel for this connection" },
        { status: 400 },
      );
    }

    // 7. Validate scheduled time is in the future
    const scheduledTime = new Date(scheduledFor);
    if (scheduledTime <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Scheduled time must be in the future" },
        { status: 400 },
      );
    }

    // 8. Create the reminder
    const reminderData = {
      user_id: user.id,
      title: title.trim(),
      message: message.trim(),
      connection_id: connectionId,
      channel_id: channelId,
      channel_name: channel.channel_name,
      scheduled_for: scheduledTime.toISOString(),
      recurrence: recurrence || "once",
      timezone: timezone || "UTC",
      status: "active",
    };

    const { data: reminder, error: insertError } = await supabase
      .from("reminders")
      .insert(reminderData)
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to save reminder" },
        { status: 500 },
      );
    }

    // 9. Return success
    return NextResponse.json({
      success: true,
      reminder: reminder,
      message: "Reminder created successfully",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
