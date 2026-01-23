import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  // console.log("=== API ROUTE CALLED: /api/subscription/check-limits ===");

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // console.log("Requested userId:", userId);

    if (!userId) {
      // console.log("No userId provided");
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 },
      );
    }

    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // console.log("Service role client created");

    // Get user's subscription
    // console.log("Querying subscriptions for user:", userId);
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("status, plan_id")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .single();

    // console.log("Subscription query result:", {
    //   data: subscription,
    //   error: subError,
    // });

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
      // Get plan details
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", subscription.plan_id)
        .single();

      if (planData) {
        plan = planData;

        // Count current channels
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

        // Count current reminders
        const { count: currentReminders } = await supabase
          .from("reminders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "active");

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
      allowed: !!subscription && subscription.status === "active",
      plan: plan,
      limits: limits,
    };

    // console.log("API returning result:", result);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
