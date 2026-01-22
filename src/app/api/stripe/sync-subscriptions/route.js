import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe/client";

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Get user's subscriptions
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userId)
      .neq("status", "canceled");

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 },
      );
    }

    // Sync each subscription with Stripe
    const results = [];
    for (const sub of subscriptions) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(
          sub.stripe_subscription_id,
        );

        await supabase
          .from("subscriptions")
          .update({
            status: stripeSub.status,
            current_period_start: new Date(
              stripeSub.current_period_start * 1000,
            ),
            current_period_end: new Date(stripeSub.current_period_end * 1000),
            updated_at: new Date(),
          })
          .eq("stripe_subscription_id", sub.stripe_subscription_id);

        results.push({
          subscriptionId: sub.stripe_subscription_id,
          oldStatus: sub.status,
          newStatus: stripeSub.status,
        });
      } catch (syncError) {
        console.error(
          "Error syncing subscription:",
          sub.stripe_subscription_id,
          syncError.message,
        );
        results.push({
          subscriptionId: sub.stripe_subscription_id,
          error: syncError.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: results,
    });
  } catch (error) {
    console.error("Sync error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
