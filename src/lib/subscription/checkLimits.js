import { createClient } from "@supabase/supabase-js";

export async function checkUserLimits(userId) {
  console.log("=== checkUserLimits START ===");
  console.log("Input userId:", userId);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  // DEBUG: Test without the join first
  console.log("Running subscription query...");
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("status, plan_id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .single();

  console.log("Subscription query result:", {
    data: subscription,
    error: subError,
    hasData: !!subscription,
  });

  if (subError || !subscription) {
    console.error("No subscription found. Error:", subError?.message);

    // Check what's actually in the table
    const { data: allSubs } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId);

    console.log("All subscriptions in table for this user:", allSubs);

    return {
      allowed: false,
      reason: "No active subscription found",
      limits: {
        maxChannels: 0,
        maxReminders: 0,
        currentChannels: 0,
        currentReminders: 0,
      },
    };
  }

  console.log("Subscription found:", subscription);

  // Now get plan details separately
  console.log("Getting plan details for plan_id:", subscription.plan_id);
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("max_channels, max_reminders")
    .eq("id", subscription.plan_id)
    .single();

  console.log("Plan query result:", { data: plan, error: planError });

  if (planError || !plan) {
    console.error("Plan not found. Error:", planError?.message);
    return {
      allowed: false,
      reason: "Plan configuration error",
      limits: {
        maxChannels: 0,
        maxReminders: 0,
        currentChannels: 0,
        currentReminders: 0,
      },
    };
  }

  console.log("Plan found:", plan);

  // Get usage counts
  const { data: connection } = await supabase
    .from("slack_connections")
    .select("id")
    .eq("user_id", userId)
    .single();

  // Count reminders
  const { count: currentReminders } = await supabase
    .from("reminders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  // Count Slack channels
  let currentChannels = 0;
  if (connection?.id) {
    const { count } = await supabase
      .from("slack_channels")
      .select("*", { count: "exact", head: true })
      .eq("connection_id", connection.id);
    currentChannels = count || 0;
  }

  const result = {
    allowed: true,
    plan: plan,
    limits: {
      maxChannels: plan.max_channels,
      maxReminders: plan.max_reminders,
      currentChannels: currentChannels,
      currentReminders: currentReminders || 0,
      canAddChannel: currentChannels < plan.max_channels,
      canAddReminder: (currentReminders || 0) < plan.max_reminders,
    },
  };

  console.log("=== checkUserLimits END ===");
  console.log("Final result:", result);

  return result;
}
