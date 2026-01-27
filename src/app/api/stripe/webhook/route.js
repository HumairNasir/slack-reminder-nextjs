import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

// ========== HELPER: ROBUST UPSERT & AUTO-CANCEL ==========
async function upsertSubscription(subscription, supabase) {
  const priceId = subscription.items.data[0].price.id;

  // 1. Try to find User ID from Metadata
  let userId =
    subscription.metadata?.userId || subscription.metadata?.supabaseUserId;

  // 2. Fallback: Look up User ID by Stripe Customer ID
  if (!userId) {
    const { data: customerMatch } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer)
      .limit(1)
      .single();

    if (customerMatch) {
      userId = customerMatch.user_id;
    } else {
      console.error(
        "❌ CRITICAL: Could not find User ID for subscription:",
        subscription.id,
      );
      return;
    }
  }

  // 3. Find Plan ID
  let planId = null;
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("stripe_price_id", priceId)
    .single();

  if (plan) planId = plan.id;

  // 4. Safe Date Handling
  const startDate = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : new Date();

  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // ====================================================
  // ⚡ NEW: AUTO-CANCEL OLD SUBSCRIPTIONS LOGIC
  // ====================================================
  // If the new subscription is ACTIVE, cancel any OTHER active plans for this user.
  if (subscription.status === "active") {
    const { error: cancelError } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        updated_at: new Date(),
      })
      .eq("user_id", userId)
      .neq("stripe_subscription_id", subscription.id) // ⚠️ Don't cancel the new one!
      .in("status", ["active", "trialing", "past_due"]);

    if (!cancelError) {
      console.log(`🧹 Cleaned up old subscriptions for user ${userId}`);
    }
  }

  // 5. UPSERT (Create or Update the new one)
  const { error } = await supabase.from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    plan_id: planId,
    status: subscription.status,
    current_period_start: startDate,
    current_period_end: endDate,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    updated_at: new Date(),
  });

  if (error) {
    console.error("Database Upsert Error:", error.message);
  } else {
    console.log(
      `✅ Successfully processed subscription: ${subscription.id} (${subscription.status})`,
    );
  }
}

// ========== EVENT HANDLERS ==========

async function handleCheckoutCompleted(session, supabase) {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription,
    );
    // Inject session metadata into subscription object
    subscription.metadata = { ...subscription.metadata, ...session.metadata };
    await upsertSubscription(subscription, supabase);
  } catch (error) {
    console.error("Checkout Error:", error.message);
  }
}

async function handleSubscriptionUpdate(subscription, supabase) {
  await upsertSubscription(subscription, supabase);
}

async function handleInvoicePaymentSucceeded(invoice, supabase) {
  // This event MUST also be able to create/update the row
  if (!invoice.subscription) return;
  try {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription,
    );
    await upsertSubscription(subscription, supabase);
  } catch (error) {
    console.error("Invoice Payment Error:", error.message);
  }
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

// ========== MAIN WEBHOOK ROUTE ==========

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  let body;
  try {
    body = await request.text();
  } catch (err) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
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
      } catch (e) {
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

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object, supabaseAdmin);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCancel(event.data.object, supabaseAdmin);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Handler Failed:", error.message);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
