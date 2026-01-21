import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  console.log("=== STRIPE WEBHOOK RECEIVED ===");

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;

  // TEST MODE: Skip verification for local development
  if (process.env.NODE_ENV === "development") {
    console.log("Development mode - skipping webhook verification");
    event = JSON.parse(body);
  } else {
    // Production: verify webhook
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("Webhook verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 },
      );
    }
  }

  console.log("Processing event type:", event.type);

  // Handle subscription events
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
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

async function handleCheckoutCompleted(session, supabase) {
  console.log("Checkout completed for session:", session.id);

  const userId = session.metadata?.userId;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  if (!userId) {
    console.error("No user ID in session metadata");
    return;
  }

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
}
