import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

// ========== HELPER FUNCTIONS (DEFINED FIRST) ==========

async function handleCheckoutCompleted(session, supabase) {
  console.log("Checkout completed for session:", session.id);

  const userId = session.metadata?.userId;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  if (!userId) {
    console.error("No user ID in session metadata");
    return;
  }

  try {
    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;

    console.log("Saving subscription to database...");

    // Save to subscriptions table
    const { data, error } = await supabase.from("subscriptions").upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date(),
    });

    if (error) {
      console.error("Failed to save subscription:", error);
    } else {
      console.log("Subscription saved successfully!");
    }
  } catch (error) {
    console.error("Failed to retrieve subscription:", error.message);
  }
}

async function handleSubscriptionUpdate(subscription, supabase) {
  console.log("Subscription update:", subscription.id);
  console.log("Full subscription data:", JSON.stringify(subscription, null, 2));

  const userId =
    subscription.metadata?.userId || subscription.metadata?.supabaseUserId;
  console.log("Extracted userId:", userId);

  if (!userId) {
    console.error(
      "No user ID in subscription metadata. Full metadata:",
      subscription.metadata,
    );
    return;
  }

  // Try to INSERT first (upsert might fail)
  const { data, error } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date(),
    })
    .select(); // Add this to see what returns

  console.log("Database operation result:", { data, error });

  if (error) {
    console.error("Database error details:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  } else {
    console.log("Subscription saved successfully! Data:", data);
  }
}

async function handleSubscriptionCancel(subscription, supabase) {
  console.log("Subscription cancelled:", subscription.id);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to cancel subscription:", error);
  } else {
    console.log("Subscription marked as canceled");
  }
}

// ========== MAIN WEBHOOK HANDLER ==========

export async function POST(request) {
  console.log("=== PRODUCTION WEBHOOK ===");
  console.log("Time:", new Date().toISOString());

  const signature = request.headers.get("stripe-signature");
  console.log("Signature present:", !!signature);

  let body;
  try {
    body = await request.text();
  } catch (error) {
    console.error("Failed to read request body:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  let event;

  // Get secret - use different one for dev vs prod
  const webhookSecret =
    process.env.NODE_ENV === "development"
      ? "whsec_test_for_local_development"
      : process.env.STRIPE_WEBHOOK_SECRET;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("Webhook verified:", event.type);
  } catch (err) {
    console.error("Webhook verification failed:", err.message);

    // For development, try to parse anyway
    if (process.env.NODE_ENV === "development") {
      try {
        event = JSON.parse(body);
        console.log("Development mode - parsed event:", event.type);
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

  console.log("Processing event type:", event.type);

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

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("=== WEBHOOK CATCH BLOCK ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    if (error.type === "StripeInvalidRequestError") {
      console.error("Stripe error code:", error.code);
      console.error("Stripe error param:", error.param);
    }

    return NextResponse.json(
      {
        error: "Webhook handler failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
