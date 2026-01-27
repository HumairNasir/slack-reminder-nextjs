import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // 1. Get Subscription & Dates
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status, plan_id, current_period_start, current_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .single();

    let plan = null;
    let limits = {
      maxChannels: 0,
      maxReminders: 0,
      currentChannels: 0,
      currentReminders: 0,
      canAddChannel: false,
      canAddReminder: false,
    };

    if (subscription) {
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", subscription.plan_id)
        .single();

      if (planData) {
        plan = planData;

        // 2. Count Channels
        const { data: connection } = await supabase
          .from("slack_connections")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .single();

        let currentChannels = 0;
        if (connection?.id) {
          const { count } = await supabase
            .from("slack_channels")
            .select("*", { count: "exact", head: true })
            .eq("connection_id", connection.id);
          currentChannels = count || 0;
        }

        // 3. Count Reminders (The Logic Update)
        // Rule: Count (Active + Sent) inside current period. Ignore Failed.
        const { count: currentReminders } = await supabase
          .from("reminders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", subscription.current_period_start)
          .lte("created_at", subscription.current_period_end)
          .neq("status", "failed"); // 👈 EXCLUDE FAILED

        limits = {
          maxChannels: planData.max_channels,
          maxReminders: planData.max_reminders,
          currentChannels: currentChannels,
          currentReminders: currentReminders || 0,
          canAddChannel: currentChannels < planData.max_channels,
          canAddReminder: (currentReminders || 0) < planData.max_reminders,
        };
      }
    }

    const result = {
      allowed:
        !!subscription &&
        ["active", "trialing", "past_due"].includes(subscription.status),
      plan: plan,
      limits: limits,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
