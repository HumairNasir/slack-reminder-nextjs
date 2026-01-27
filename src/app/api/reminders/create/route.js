import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();

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

    const {
      title,
      message,
      connectionId,
      channelId,
      scheduledFor,
      recurrence,
      timezone,
    } = await request.json();

    if (!title || !message || !connectionId || !channelId || !scheduledFor) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // --- LIMIT CHECK START ---
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_id, status, current_period_start, current_period_end")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .single();

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "No active subscription found." },
        { status: 403 },
      );
    }

    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("max_reminders")
      .eq("id", subscription.plan_id)
      .single();

    // Count usage (excluding failed)
    const { count: monthlyUsage } = await supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", subscription.current_period_start)
      .lte("created_at", subscription.current_period_end)
      .neq("status", "failed"); // 👈 EXCLUDE FAILED

    if ((monthlyUsage || 0) >= plan.max_reminders) {
      return NextResponse.json(
        {
          success: false,
          error: `Monthly limit reached (${monthlyUsage}/${plan.max_reminders}). Delete active reminders or upgrade.`,
        },
        { status: 403 },
      );
    }
    // --- LIMIT CHECK END ---

    // Verification Logic (Connection/Channel/Time) ...
    const { data: connection } = await supabase
      .from("slack_connections")
      .select("id, team_name")
      .eq("id", connectionId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!connection) {
      return NextResponse.json(
        { success: false, error: "Invalid Slack connection" },
        { status: 403 },
      );
    }

    const { data: channel } = await supabase
      .from("slack_channels")
      .select("channel_name")
      .eq("connection_id", connectionId)
      .eq("channel_id", channelId)
      .single();

    const scheduledTime = new Date(scheduledFor);
    if (scheduledTime <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Scheduled time must be in the future" },
        { status: 400 },
      );
    }

    // Insert Reminder
    const { data: reminder, error: insertError } = await supabase
      .from("reminders")
      .insert({
        user_id: user.id,
        title: title.trim(),
        message: message.trim(),
        connection_id: connectionId,
        channel_id: channelId,
        channel_name: channel?.channel_name || "unknown",
        scheduled_for: scheduledTime.toISOString(),
        recurrence: recurrence || "once",
        timezone: timezone || "UTC",
        status: "active",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      reminder: reminder,
      message: "Reminder created successfully",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
