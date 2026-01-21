import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

// ========== HELPER FUNCTIONS ==========

async function handleCheckoutCompleted(session, supabase) {
  const userId = session.metadata?.userId;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  if (!userId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;

    // Look up plan ID
    let planId = null;
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("stripe_price_id", priceId)
      .single();

    if (plan) planId = plan.id;

    // Save to database
    await supabase.from("subscriptions").upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      plan_id: planId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date(),
    });
  } catch (error) {
    console.error("Checkout handling error:", error.message);
  }
}

async function handleSubscriptionUpdate(subscription, supabase) {
  console.log("=== SUBSCRIPTION UPDATE START ===");
  console.log("Subscription ID:", subscription.id);
  console.log("Status:", subscription.status);

  const userId =
    subscription.metadata?.userId || subscription.metadata?.supabaseUserId;
  console.log("User ID from metadata:", userId);

  if (!userId) {
    console.error("ERROR: No user ID in metadata");
    return;
  }

  const priceId = subscription.items?.data[0]?.price?.id;
  console.log("Price ID from subscription:", priceId);

  let planId = null;

  // Look up plan ID
  if (priceId) {
    console.log("Looking up plan for price:", priceId);
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("stripe_price_id", priceId)
      .single();

    if (planError) {
      console.error("Plan lookup error:", planError.message);
    } else if (plan) {
      planId = plan.id;
      console.log("Found plan ID:", planId);
    } else {
      console.log("No plan found for price ID");
    }
  }

  console.log("Attempting to update subscription with plan_id:", planId);

  // Update subscription
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      plan_id: planId,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .select(); // Add select to see what returns

  if (error) {
    console.error("Database update error:", error);
  } else {
    console.log("Database update successful. Rows updated:", data?.length);
    console.log("Updated data:", data);
  }

  console.log("=== SUBSCRIPTION UPDATE END ===");
}

async function handleSubscriptionCancel(subscription, supabase) {
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

// ========== MAIN WEBHOOK HANDLER ==========

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  let body;

  try {
    body = await request.text();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  let event;
  const webhookSecret =
    process.env.NODE_ENV === "development"
      ? "whsec_test_for_local_development"
      : process.env.STRIPE_WEBHOOK_SECRET;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      try {
        event = JSON.parse(body);
      } catch (parseError) {
        return NextResponse.json(
          { error: `Webhook Error: ${err.message}` },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 },
      );
    }
  }

  // Create Supabase admin client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, supabaseAdmin);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object, supabaseAdmin);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCancel(event.data.object, supabaseAdmin);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error.message);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
